import { colorIdentityLabel } from './colors'

export interface ColorIdentityCount {
  label: string
  count: number
}

export interface ManaCurveEntry {
  label: string
  count: number
}

export interface GatheringDustDeck {
  deckId: number
  deckName: string
  lastPlayedDate: string | null
  /** null means never played. */
  daysSincePlayed: number | null
}

/** Groups owned decks by color-identity label (see colorIdentityLabel),
 * descending by deck count. See docs/PRODUCT.md#12-collection-level-stats-m6. */
export function groupColorIdentity(
  decks: { colorIdentity: string | null }[],
): ColorIdentityCount[] {
  const counts = new Map<string, number>()
  for (const deck of decks) {
    const label = colorIdentityLabel(deck.colorIdentity)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

/** Sums card quantities by mana value across every owned deck combined —
 * a card in two decks counts twice, since each deck-slot needs its own
 * physical copy. "Unknown" (unenriched cards) sorts last. */
export function computeManaCurve(
  cardCounts: { cmc: number | null; quantity: number }[],
): ManaCurveEntry[] {
  const counts = new Map<string, number>()
  for (const card of cardCounts) {
    const label = card.cmc === null ? 'Unknown' : String(card.cmc)
    counts.set(label, (counts.get(label) ?? 0) + card.quantity)
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      if (a.label === 'Unknown') return 1
      if (b.label === 'Unknown') return -1
      return Number(a.label) - Number(b.label)
    })
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime()
  const to = new Date(`${toIso}T00:00:00Z`).getTime()
  return Math.round((to - from) / (1000 * 60 * 60 * 24))
}

/** Decks never played, or not played in `thresholdDays`+ — dustiest
 * (never-played) first, then oldest-played first. `todayIso` is a
 * parameter (not `new Date()`) so this stays a pure, testable function. */
export function computeGatheringDust(
  decks: { id: number; name: string; lastPlayedDate: string | null }[],
  thresholdDays: number,
  todayIso: string,
): GatheringDustDeck[] {
  return decks
    .map((deck) => ({
      deckId: deck.id,
      deckName: deck.name,
      lastPlayedDate: deck.lastPlayedDate,
      daysSincePlayed:
        deck.lastPlayedDate === null
          ? null
          : daysBetween(deck.lastPlayedDate, todayIso),
    }))
    .filter(
      (deck) =>
        deck.daysSincePlayed === null || deck.daysSincePlayed >= thresholdDays,
    )
    .sort((a, b) => {
      if (a.daysSincePlayed === null && b.daysSincePlayed === null) return 0
      if (a.daysSincePlayed === null) return -1
      if (b.daysSincePlayed === null) return 1
      return b.daysSincePlayed - a.daysSincePlayed
    })
}
