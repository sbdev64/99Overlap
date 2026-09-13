import { describe, expect, test } from 'bun:test'
import type { DeckCardEntry } from '@/server/decks'
import { groupCards } from './card-grouping'

let nextCardId = 1
function makeCard(overrides: Partial<DeckCardEntry> & { name: string }) {
  const card: DeckCardEntry = {
    cardId: nextCardId++,
    quantity: 1,
    board: 'mainboard',
    isOverlapping: false,
    isShared: false,
    currentDeckId: null,
    currentDeckName: null,
    decksWithThisCard: [],
    ownedInDecks: [],
    imageUrl: null,
    typeLine: null,
    colorIdentity: null,
    cmc: null,
    ...overrides,
  }
  return card
}

describe('groupCards - by type', () => {
  test('classifies by the highest-precedence type word', () => {
    const cards = [
      makeCard({ name: 'Sol Ring', typeLine: 'Artifact' }),
      makeCard({ name: 'Forest', typeLine: 'Basic Land — Forest' }),
      makeCard({
        name: 'Ugin, the Ineffable',
        typeLine: 'Legendary Planeswalker — Ugin',
      }),
      makeCard({
        name: 'Sheoldred, the Apocalypse',
        typeLine: 'Legendary Creature — Phyrexian Praetor',
      }),
      // "Artifact Creature" should classify as Creature, since Creature
      // outranks Artifact in Moxfield's grouping precedence.
      makeCard({
        name: 'Wurmcoil Engine',
        typeLine: 'Artifact Creature — Wurm',
      }),
    ]

    const groups = groupCards(cards, 'type')
    const labels = groups.map((g) => g.label)
    expect(labels).toEqual(['Creature', 'Planeswalker', 'Artifact', 'Land'])

    const creatureGroup = groups.find((g) => g.label === 'Creature')
    expect(creatureGroup?.cards.map((c) => c.name)).toEqual([
      'Sheoldred, the Apocalypse',
      'Wurmcoil Engine',
    ])
  })

  test('falls back to "Other" for an unenriched or unrecognized type line', () => {
    const cards = [
      makeCard({ name: 'Mystery Card', typeLine: null }),
      makeCard({ name: 'Some Battle', typeLine: 'Battle — Siege' }),
    ]

    const groups = groupCards(cards, 'type')
    expect(groups).toHaveLength(1)
    expect(groups[0]?.label).toBe('Other')
    expect(groups[0]?.cards.map((c) => c.name)).toEqual([
      'Mystery Card',
      'Some Battle',
    ])
  })

  test('preserves alphabetical order within a section', () => {
    const cards = [
      makeCard({ name: 'Zada, Hedron Grinder', typeLine: 'Creature' }),
      makeCard({ name: 'Atraxa, Grand Unifier', typeLine: 'Creature' }),
    ]

    // Input is already name-sorted by the caller (getDeck) — grouping must
    // not reshuffle it.
    const groups = groupCards(cards, 'type')
    expect(groups[0]?.cards.map((c) => c.name)).toEqual([
      'Zada, Hedron Grinder',
      'Atraxa, Grand Unifier',
    ])
  })
})

describe('groupCards - by color identity', () => {
  test('labels mono, multi, and colorless groups, ordered by color count', () => {
    const cards = [
      makeCard({ name: 'Cryptic Command', colorIdentity: 'U' }),
      makeCard({ name: 'Sol Ring', colorIdentity: '' }),
      makeCard({ name: 'Atraxa', colorIdentity: 'W,U,B,G' }),
    ]

    const groups = groupCards(cards, 'colorIdentity')
    expect(groups.map((g) => g.label)).toEqual([
      'Colorless',
      'Blue',
      'White/Blue/Black/Green',
    ])
  })

  test('groups unenriched cards as Unknown, sorted last', () => {
    const cards = [
      makeCard({ name: 'Sol Ring', colorIdentity: '' }),
      makeCard({ name: 'Mystery Card', colorIdentity: null }),
    ]

    const groups = groupCards(cards, 'colorIdentity')
    expect(groups.map((g) => g.label)).toEqual(['Colorless', 'Unknown'])
  })
})

describe('groupCards - by mana value', () => {
  test('orders sections numerically ascending, Unknown last', () => {
    const cards = [
      makeCard({ name: 'Sol Ring', cmc: 1 }),
      makeCard({ name: 'Forest', cmc: 0 }),
      makeCard({ name: 'Smothering Tithe', cmc: 4 }),
      makeCard({ name: 'Mystery Card', cmc: null }),
    ]

    const groups = groupCards(cards, 'manaValue')
    expect(groups.map((g) => g.label)).toEqual(['0', '1', '4', 'Unknown'])
  })
})
