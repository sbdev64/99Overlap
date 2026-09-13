import { createServerFn } from '@tanstack/react-start'
import { games } from '@/db/schema'
import { aggregateGameStats, type GameStats } from '@/lib/game-stats'

export type {
  DeckGameStat,
  GameStats,
  MonthCount,
  PodCount,
} from '@/lib/game-stats'

/**
 * Aggregates the `Game` log (M4) for the /stats dashboard. All aggregation
 * happens here rather than client-side — the charting is the expensive
 * part, no need to also ship the raw row-by-row reduction logic to the
 * browser. See docs/PRODUCT.md#11-statistics-dashboard-m6.
 */
export const getGameStats = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GameStats> => {
    // Dynamic import so `bun:sqlite` never ends up in the client bundle —
    // see the comment in src/server/import-deck.ts.
    const { db } = await import('@/db/client')

    const rows = await db
      .select({
        date: games.date,
        deckName: games.deckName,
        pod: games.pod,
        won: games.won,
      })
      .from(games)

    return aggregateGameStats(rows)
  },
)
