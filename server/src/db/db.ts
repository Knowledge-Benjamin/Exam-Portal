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
// When TypeScript compiles src/ → dist/, __dirname will be dist/db/
// so we step up two levels to reach the project root, then into src/db/migrations
// (the SQL files are shipped alongside source — not copied to dist by tsc).
// We therefore use the source path explicitly so it works in both ts-node and compiled modes.
const MIGRATIONS_FOLDER = path.join(__dirname, '../../src/db/migrations');

/**
 * Synchronizes the Drizzle migration journal in the database.
 * If the database was initialized previously or already contains schema objects,
 * this ensures the drizzle tracking table (__drizzle_migrations) reflects the current migrations,
 * preventing duplicate type / table creation errors on deployment.
 */
async function syncMigrationJournalBaseline(): Promise<void> {
  try {
    await sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`;
    await sql`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `;

    const journalPath = path.join(MIGRATIONS_FOLDER, 'meta/_journal.json');
    if (!fs.existsSync(journalPath)) return;

    const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
    for (const entry of journal.entries) {
      const existing = (await sql`
        SELECT id FROM "drizzle"."__drizzle_migrations" WHERE created_at = ${entry.when}
      `) as Array<{ id: number }>;

      if (existing.length === 0) {
        const sqlFile = path.join(MIGRATIONS_FOLDER, `${entry.tag}.sql`);
        let hash = entry.tag;
        if (fs.existsSync(sqlFile)) {
          hash = crypto.createHash('sha256').update(fs.readFileSync(sqlFile)).digest('hex');
        }
        await sql`
          INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
          VALUES (${hash}, ${entry.when})
        `;
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
 */
export async function runMigrations(): Promise<void> {
  console.log('[db] Applying pending migrations from:', MIGRATIONS_FOLDER);
  try {
    // If the database already contains existing tables (e.g. exams table),
    // ensure drizzle migration tracking table records baseline migrations
    // so it doesn't attempt to re-execute already existing enums/tables.
    const existingTables = (await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'exams'
    `) as Array<{ table_name: string }>;

    if (existingTables.length > 0) {
      await syncMigrationJournalBaseline();
    }

    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    console.log('[db] Migrations up to date.');
  } catch (err: any) {
    const isAlreadyExists =
      err?.code === '42710' || // duplicate object (type, enum)
      err?.code === '42P07' || // duplicate table
      err?.code === '42701' || // duplicate column
      String(err?.message || '').toLowerCase().includes('already exists');

    if (isAlreadyExists) {
      console.warn(
        '[db] Existing database schema objects detected. Synchronizing migration journal baseline...',
        err.message,
      );
      await syncMigrationJournalBaseline();
      console.log('[db] Migrations journal synchronized with database baseline. Startup continuing.');
      return;
    }

    throw err;
  }
}
