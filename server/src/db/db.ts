import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import path from 'path';
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
 * Apply all pending Drizzle migrations from the migrations folder.
 * Safe to call on every startup — already-applied migrations are skipped
 * via the internal __drizzle_migrations tracking table in Postgres.
 */
export async function runMigrations(): Promise<void> {
  console.log('[db] Applying pending migrations from:', MIGRATIONS_FOLDER);
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log('[db] Migrations up to date.');
}
