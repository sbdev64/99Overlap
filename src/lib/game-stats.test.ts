import { describe, expect, test } from 'bun:test'
import { aggregateGameStats, type GameStatsRow } from './game-stats'

function row(
  overrides: Partial<GameStatsRow> & { date: string },
): GameStatsRow {
  return { deckName: 'Deck A', pod: 'Friday Group', won: false, ...overrides }
}

describe('aggregateGameStats', () => {
  test('returns all-empty stats for no games', () => {
    const stats = aggregateGameStats([])
    expect(stats.totalGames).toBe(0)
    expect(stats.gamesByMonth).toEqual([])
    expect(stats.deckStats).toEqual([])
    expect(stats.mostPlayedPods).toEqual([])
  })

  test('groups games by month, chronologically ascending', () => {
    const stats = aggregateGameStats([
      row({ date: '2026-03-01' }),
      row({ date: '2026-01-15' }),
      row({ date: '2026-01-20' }),
      row({ date: '2026-02-10' }),
    ])
    expect(stats.gamesByMonth).toEqual([
      { month: '2026-01', count: 2 },
      { month: '2026-02', count: 1 },
      { month: '2026-03', count: 1 },
    ])
  })

  test('computes per-deck game count, wins, and win rate, sorted by games desc', () => {
    const stats = aggregateGameStats([
      row({ date: '2026-01-01', deckName: 'Zada', won: true }),
      row({ date: '2026-01-02', deckName: 'Zada', won: false }),
      row({ date: '2026-01-03', deckName: 'Zada', won: true }),
      row({ date: '2026-01-04', deckName: 'Atraxa', won: true }),
    ])
    expect(stats.deckStats).toEqual([
      { deckName: 'Zada', games: 3, wins: 2, winRatePercent: 67 },
      { deckName: 'Atraxa', games: 1, wins: 1, winRatePercent: 100 },
    ])
  })

  test('groups most-played pods, sorted by count desc', () => {
    const stats = aggregateGameStats([
      row({ date: '2026-01-01', pod: 'Friday Group' }),
      row({ date: '2026-01-02', pod: 'Weekend Crew' }),
      row({ date: '2026-01-03', pod: 'Friday Group' }),
    ])
    expect(stats.mostPlayedPods).toEqual([
      { pod: 'Friday Group', count: 2 },
      { pod: 'Weekend Crew', count: 1 },
    ])
  })

  test('reports totalGames as the raw row count', () => {
    const stats = aggregateGameStats([
      row({ date: '2026-01-01' }),
      row({ date: '2026-01-02' }),
    ])
    expect(stats.totalGames).toBe(2)
  })
})
