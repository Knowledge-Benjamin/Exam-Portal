import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { env } from '../config/env';
import * as schema from './schema';

const sql = neon(env.DATABASE_URL);

export const db = drizzle(sql, { schema });

export type DB = typeof db;

// Resolve migrations folder relative to this compiled file.
// Supports development (tsx), production build (node dist/index.js), and Docker container paths.
function getMigrationsFolder(): string {
  const candidates = [
    path.join(__dirname, '../../src/db/migrations'),
    path.join(__dirname, '../db/migrations'),
    path.join(__dirname, './migrations'),
    path.join(process.cwd(), 'src/db/migrations'),
    path.join(process.cwd(), 'dist/db/migrations'),
    '/app/src/db/migrations',
    '/app/dist/db/migrations',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'meta/_journal.json'))) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.join(__dirname, '../../src/db/migrations');
}

/**
 * Ensures the Drizzle migration tracking table exists and marks all journal
 * entries as applied. This is used as a baseline sync when the DB already
 * has schema objects (e.g. a pre-existing production database).
 *
 * Uses the SQL file hash so Drizzle's migrator can skip already-recorded files.
 */
async function syncMigrationJournalBaseline(migrationsFolder: string): Promise<void> {
  try {
    await sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`;
    await sql`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `;

    const journalPath = path.join(migrationsFolder, 'meta/_journal.json');
    if (!fs.existsSync(journalPath)) return;

    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
    for (const entry of journal.entries) {
      // Check both by timestamp AND by hash so re-numbered migrations are found
      const sqlFile = path.join(migrationsFolder, `${entry.tag}.sql`);
      let hash = entry.tag;
      if (fs.existsSync(sqlFile)) {
        hash = crypto.createHash('sha256').update(fs.readFileSync(sqlFile)).digest('hex');
      }

      // Skip if already recorded by hash or timestamp
      const existing = (await sql`
        SELECT id FROM "drizzle"."__drizzle_migrations"
        WHERE hash = ${hash} OR created_at = ${entry.when}
      `) as Array<{ id: number }>;

      if (existing.length === 0) {
        await sql`
          INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
          VALUES (${hash}, ${entry.when})
        `;
        console.log(`[db] Baseline: recorded migration ${entry.tag}`);
      }
    }
  } catch (syncErr) {
    console.warn('[db] Warning while syncing migration journal baseline:', syncErr);
  }
}

/**
 * Apply all pending Drizzle migrations from the migrations folder.
 * Safe to call on every startup — already-applied migrations are skipped
 * via the internal __drizzle_migrations tracking table in Postgres.
 *
 * All migration SQL files are written to be idempotent (IF NOT EXISTS / DO
 * $$ BEGIN ... EXCEPTION ... END $$) so even if the baseline sync marks them
 * as already-applied, manually re-running them is safe.
 */
export async function runMigrations(): Promise<void> {
  const migrationsFolder = getMigrationsFolder();
  console.log('[db] Applying pending migrations from:', migrationsFolder);

  if (!fs.existsSync(migrationsFolder)) {
    console.warn(`[db] Migrations folder not found at "${migrationsFolder}". Skipping auto-migration.`);
    return;
  }

  // Always ensure the drizzle tracking schema is in place first
  await sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`;
  await sql`
    CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;

  // Check if we have a pre-existing database (exams table present)
  const existingTables = (await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'exams'
  `) as Array<{ table_name: string }>;

  if (existingTables.length > 0) {
    // Sync journal baseline so Drizzle doesn't re-run already-applied migrations
    await syncMigrationJournalBaseline(migrationsFolder);
  }

  try {
    await migrate(db, { migrationsFolder });
    console.log('[db] Migrations up to date.');
  } catch (err: any) {
    // If a migration fails due to already-existing objects (shouldn't happen with
    // idempotent SQL, but kept as safety net), log and continue rather than crash.
    const isAlreadyExists =
      err?.code === '42710' || // duplicate_object (type, enum)
      err?.code === '42P07' || // duplicate_table
      err?.code === '42701' || // duplicate_column
      String(err?.message || '').toLowerCase().includes('already exists');

    if (isAlreadyExists) {
      console.warn('[db] Migration skipped (object already exists):', err.message);
      console.log('[db] Server will start — schema is assumed current.');
      return;
    }

    // Log warning and allow server to proceed so container does not crash-loop
    console.warn('[db] Migration warning, proceeding with current database schema:', err.message || err);
  }
}
