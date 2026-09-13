import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { cards, deckCards, decks } from '@/db/schema'
import type { DeckOption } from './decks'

export interface SearchableCard {
  cardId: number
  name: string
  decks: DeckOption[]
}

/**
 * Every card that's in at least one deck, with which deck(s) contain it.
 * Filtering by name happens client-side (see docs/PRODUCT.md) — the
 * dataset is small enough (one user's decks) that fetching it once and
 * filtering as they type is simpler and more responsive than a
 * round-trip per keystroke.
 */
export const listSearchableCards = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SearchableCard[]> => {
    // Dynamic import so `bun:sqlite` never ends up in the client bundle —
    // see the comment in src/server/import-deck.ts.
    const { db } = await import('@/db/client')

    const rows = await db
      .select({
        cardId: cards.id,
        name: cards.name,
        deckId: decks.id,
        deckName: decks.name,
      })
      .from(cards)
      .innerJoin(deckCards, eq(deckCards.cardId, cards.id))
      .innerJoin(decks, eq(decks.id, deckCards.deckId))
      .orderBy(cards.name)

    const byCardId = new Map<number, SearchableCard>()
    for (const row of rows) {
      const existing = byCardId.get(row.cardId)
      const deckOption: DeckOption = { id: row.deckId, name: row.deckName }
      if (existing) {
        existing.decks.push(deckOption)
      } else {
        byCardId.set(row.cardId, {
          cardId: row.cardId,
          name: row.name,
          decks: [deckOption],
        })
      }
    }

    return Array.from(byCardId.values())
  },
)
