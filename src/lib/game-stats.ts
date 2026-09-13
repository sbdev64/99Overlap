export interface MonthCount {
  month: string
  count: number
}

export interface DeckGameStat {
  deckName: string
  games: number
  wins: number
  winRatePercent: number
}

export interface PodCount {
  pod: string
  count: number
}

export interface GameStats {
  totalGames: number
  /** Chronological (ascending). */
  gamesByMonth: MonthCount[]
  /** Descending by games played — shared order for the most-played-decks
   * and win-rate-per-deck charts, so they read consistently side by side. */
  deckStats: DeckGameStat[]
  /** Descending by games played. */
  mostPlayedPods: PodCount[]
}

export interface GameStatsRow {
  date: string
  deckName: string
  pod: string
  won: boolean
}

/** Pure aggregation over the `Game` log for the /stats dashboard (M6). See
 * docs/PRODUCT.md#11-statistics-dashboard-m6. */
export function aggregateGameStats(rows: GameStatsRow[]): GameStats {
  const monthCounts = new Map<string, number>()
  const deckCounts = new Map<string, { games: number; wins: number }>()
  const podCounts = new Map<string, number>()

  for (const row of rows) {
    const month = row.date.slice(0, 7)
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1)

    const deck = deckCounts.get(row.deckName) ?? { games: 0, wins: 0 }
    deck.games += 1
    if (row.won) deck.wins += 1
    deckCounts.set(row.deckName, deck)

    podCounts.set(row.pod, (podCounts.get(row.pod) ?? 0) + 1)
  }

  const gamesByMonth = Array.from(monthCounts.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month))

  const deckStats = Array.from(deckCounts.entries())
    .map(([deckName, { games: gameCount, wins }]) => ({
      deckName,
      games: gameCount,
      wins,
      winRatePercent: Math.round((wins / gameCount) * 100),
    }))
    .sort((a, b) => b.games - a.games)

  const mostPlayedPods = Array.from(podCounts.entries())
    .map(([pod, count]) => ({ pod, count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalGames: rows.length,
    gamesByMonth,
    deckStats,
    mostPlayedPods,
  }
}
