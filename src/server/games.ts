import { createServerFn } from '@tanstack/react-start'
import { desc } from 'drizzle-orm'
import { games } from '@/db/schema'

export interface GameEntry {
  id: number
  date: string
  deckId: number | null
  deckName: string
  pod: string
  won: boolean
}

export const listGames = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GameEntry[]> => {
    // Dynamic import so `bun:sqlite` never ends up in the client bundle —
    // see the comment in src/server/import-deck.ts.
    const { db } = await import('@/db/client')

    return (
      db
        .select({
          id: games.id,
          date: games.date,
          deckId: games.deckId,
          deckName: games.deckName,
          pod: games.pod,
          won: games.won,
        })
        .from(games)
        // date is 'YYYY-MM-DD', so lexicographic order matches chronological
        // order; id as a tiebreaker for games logged on the same date.
        .orderBy(desc(games.date), desc(games.id))
    )
  },
)
