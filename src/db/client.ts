import { Database } from 'bun:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import * as schema from './schema'

// Single local SQLite file — see docs/STACK.md. Override with DATABASE_URL
// for tests or an alternate location.
export const DATABASE_URL =
  process.env.DATABASE_URL ?? './data/99overlap.sqlite'

const dir = dirname(DATABASE_URL)
if (dir !== '.' && !existsSync(dir)) {
  mkdirSync(dir, { recursive: true })
}

const sqlite = new Database(DATABASE_URL)
sqlite.exec('PRAGMA foreign_keys = ON')

export const db = drizzle(sqlite, { schema })

// Applied automatically on module load so a fresh checkout (or a fresh
// data/ dir) works with just `bun run dev` — no separate manual migration
// step. Drizzle tracks applied migrations in `__drizzle_migrations` and
// skips ones already run, so this is a cheap no-op on every subsequent
// load. `bun run db:migrate` still works standalone (src/db/migrate.ts),
// e.g. for CI or a future deployment step. See docs/PRODUCT.md.
migrate(db, { migrationsFolder: './drizzle' })
