import { describe, expect, test } from 'bun:test'
import {
  computeGatheringDust,
  computeManaCurve,
  groupColorIdentity,
} from './collection-stats'

describe('groupColorIdentity', () => {
  test('groups by friendly label, sorted by count desc', () => {
    const result = groupColorIdentity([
      { colorIdentity: 'W,U' },
      { colorIdentity: 'W,U' },
      { colorIdentity: '' },
      { colorIdentity: null },
    ])
    expect(result).toEqual([
      { label: 'White/Blue', count: 2 },
      { label: 'Colorless', count: 1 },
      { label: 'Unknown', count: 1 },
    ])
  })
})

describe('computeManaCurve', () => {
  test('sums quantities by mana value, ascending, Unknown last', () => {
    const result = computeManaCurve([
      { cmc: 1, quantity: 2 },
      { cmc: 0, quantity: 1 },
      { cmc: 1, quantity: 1 },
      { cmc: null, quantity: 1 },
      { cmc: 4, quantity: 1 },
    ])
    expect(result).toEqual([
      { label: '0', count: 1 },
      { label: '1', count: 3 },
      { label: '4', count: 1 },
      { label: 'Unknown', count: 1 },
    ])
  })
})

describe('computeGatheringDust', () => {
  const TODAY = '2026-09-13'

  test('excludes decks played recently', () => {
    const result = computeGatheringDust(
      [{ id: 1, name: 'Fresh Deck', lastPlayedDate: '2026-09-01' }],
      90,
      TODAY,
    )
    expect(result).toEqual([])
  })

  test('includes never-played decks and old decks, dustiest first', () => {
    const result = computeGatheringDust(
      [
        { id: 1, name: 'Old Deck', lastPlayedDate: '2026-01-01' },
        { id: 2, name: 'Never Played', lastPlayedDate: null },
        { id: 3, name: 'Recent Deck', lastPlayedDate: '2026-09-10' },
      ],
      90,
      TODAY,
    )
    expect(result).toEqual([
      {
        deckId: 2,
        deckName: 'Never Played',
        lastPlayedDate: null,
        daysSincePlayed: null,
      },
      {
        deckId: 1,
        deckName: 'Old Deck',
        lastPlayedDate: '2026-01-01',
        daysSincePlayed: 255,
      },
    ])
  })

  test('a deck exactly at the threshold counts as gathering dust', () => {
    const result = computeGatheringDust(
      [{ id: 1, name: 'Deck', lastPlayedDate: '2026-06-15' }],
      90,
      TODAY,
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.daysSincePlayed).toBe(90)
  })
})
