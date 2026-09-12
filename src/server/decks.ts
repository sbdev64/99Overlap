import { createServerFn } from '@tanstack/react-start'
import { desc } from 'drizzle-orm'
import { decks } from '@/db/schema'

export interface DeckSummary {
  id: number
  name: string
  commanderName: string | null
  createdAt: string
}

export const listDecks = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DeckSummary[]> => {
    // Dynamic import so `bun:sqlite` never ends up in the client bundle —
    // see the comment in src/server/import-deck.ts.
    const { db } = await import('@/db/client')

    const rows = await db
      .select({
        id: decks.id,
        name: decks.name,
        commanderName: decks.commanderName,
        createdAt: decks.createdAt,
      })
      .from(decks)
      // createdAt has only second-level precision, so two decks imported in
      // the same second would otherwise tie; id (autoincrement) is a
      // reliable tiebreaker that always matches insertion order.
      .orderBy(desc(decks.createdAt), desc(decks.id))

    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }))
  },
)
