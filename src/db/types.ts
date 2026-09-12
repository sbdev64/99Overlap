import type { ExtractTablesWithRelations } from 'drizzle-orm'
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core'
import type * as schema from './schema'

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
