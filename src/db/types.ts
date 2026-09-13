import type { ExtractTablesWithRelations } from 'drizzle-orm'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core'
import type * as schema from './schema'

/**
 * The `db` object from `@/db/client`. Type-only import, erased at compile
 * time like `Transaction` below — safe to import anywhere despite pointing
 * at the bun-sqlite driver package. See the convention note in CLAUDE.md.
 */
export type Db = BunSQLiteDatabase<typeof schema>

/**
 * The transaction object passed to `db.transaction(async (tx) => ...)`.
 * Safe to import anywhere — this is a type-only import (erased at compile
 * time), unlike `@/db/client`, which must only ever be imported dynamically
 * inside a server function handler. See the convention note in CLAUDE.md.
 */
export type Transaction = SQLiteTransaction<
  'sync',
  void,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>
