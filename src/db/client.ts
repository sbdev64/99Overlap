import { Database } from 'bun:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema'

// Single local SQLite file — see docs/STACK.md. Override with DATABASE_URL
// for tests or an alternate location.
export const DATABASE_URL = process.env.DATABASE_URL ?? './data/99overlap.sqlite'

const dir = dirname(DATABASE_URL)
if (dir !== '.' && !existsSync(dir)) {
  mkdirSync(dir, { recursive: true })
}

const sqlite = new Database(DATABASE_URL)
sqlite.exec('PRAGMA foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
