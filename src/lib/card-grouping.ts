import type { DeckCardEntry } from '@/server/decks'

export type GroupBy = 'type' | 'colorIdentity' | 'manaValue'

export const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: 'type', label: 'Type' },
  { value: 'colorIdentity', label: 'Color identity' },
  { value: 'manaValue', label: 'Mana value' },
]

export interface CardGroup {
  label: string
  cards: DeckCardEntry[]
}

// Precedence order for classifying a card with more than one of these
// words in its type line (e.g. "Artifact Creature" groups as Creature),
// matching Moxfield's convention. See docs/PRODUCT.md#8.
const TYPE_PRECEDENCE = [
  'Creature',
  'Planeswalker',
  'Instant',
  'Sorcery',
  'Artifact',
  'Enchantment',
  'Land',
]

const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
}

function primaryType(typeLine: string | null): string {
  if (!typeLine) return 'Other'
  // Double-faced cards list both faces separated by " // "; the front
  // face's types are what a deck-list grouping cares about.
  const frontFace = typeLine.split('//')[0] ?? typeLine
  const wordsBeforeDash = (frontFace.split('—')[0] ?? frontFace).trim()
  const words = wordsBeforeDash.split(/\s+/)
  return TYPE_PRECEDENCE.find((type) => words.includes(type)) ?? 'Other'
}

function colorIdentityLabel(colorIdentity: string | null): string {
  if (colorIdentity === null) return 'Unknown'
  if (colorIdentity === '') return 'Colorless'
  return colorIdentity
    .split(',')
    .map((letter) => COLOR_NAMES[letter] ?? letter)
    .join('/')
}

function manaValueLabel(cmc: number | null): string {
  return cmc === null ? 'Unknown' : String(cmc)
}

/**
 * Splits `cards` into labeled sections per `groupBy`. Assumes `cards` is
 * already name-sorted (see getDeck) — cards keep that relative order
 * within each section, so no extra sort is needed.
 */
export function groupCards(
  cards: DeckCardEntry[],
  groupBy: GroupBy,
): CardGroup[] {
  const groups = new Map<string, DeckCardEntry[]>()

  for (const card of cards) {
    const label =
      groupBy === 'type'
        ? primaryType(card.typeLine)
        : groupBy === 'colorIdentity'
          ? colorIdentityLabel(card.colorIdentity)
          : manaValueLabel(card.cmc)
    const list = groups.get(label) ?? []
    list.push(card)
    groups.set(label, list)
  }

  const entries = Array.from(groups.entries()).map(([label, cardsInGroup]) => ({
    label,
    cards: cardsInGroup,
  }))

  if (groupBy === 'type') {
    entries.sort((a, b) => {
      const orderOf = (label: string) => {
        const index = TYPE_PRECEDENCE.indexOf(label)
        return index === -1 ? TYPE_PRECEDENCE.length : index
      }
      return orderOf(a.label) - orderOf(b.label)
    })
  } else if (groupBy === 'manaValue') {
    entries.sort((a, b) => {
      if (a.label === 'Unknown') return 1
      if (b.label === 'Unknown') return -1
      return Number(a.label) - Number(b.label)
    })
  } else {
    entries.sort((a, b) => {
      if (a.label === 'Unknown') return 1
      if (b.label === 'Unknown') return -1
      if (a.label === 'Colorless') return -1
      if (b.label === 'Colorless') return 1
      const colorCount = (group: CardGroup) =>
        group.cards[0]?.colorIdentity?.split(',').length ?? 0
      if (colorCount(a) !== colorCount(b)) {
        return colorCount(a) - colorCount(b)
      }
      return a.label.localeCompare(b.label)
    })
  }

  return entries
}
