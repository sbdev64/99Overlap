import { createServerFn } from '@tanstack/react-start'
import { eq, inArray } from 'drizzle-orm'
import { cards, deckCards, decks } from '@/db/schema'
import type { DeckOption } from './decks'

export interface SharedCardEntry {
  cardId: number
  name: string
  currentDeckId: number | null
  currentDeckName: string | null
  /** Every deck that has this card — so the user can see which decks need
   * it besides wherever it currently is. See
   * docs/PRODUCT.md#6-tracking-a-shared-cards-location--the-what-do-i-move-view. */
  decksWithThisCard: DeckOption[]
}

/**
 * Every shared card and its current deck, independent of any single deck
 * view — the global counterpart to the per-deck "missing shared cards"
 * section. See docs/PRODUCT.md#6.
 */
export const listSharedCards = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SharedCardEntry[]> => {
    // Dynamic import so `bun:sqlite` never ends up in the client bundle —
    // see the comment in src/server/import-deck.ts.
    const { db } = await import('@/db/client')

    const sharedCards = await db
      .select({
        id: cards.id,
        name: cards.name,
        currentDeckId: cards.currentDeckId,
      })
      .from(cards)
      .where(eq(cards.isShared, true))
      .orderBy(cards.name)

    if (sharedCards.length === 0) {
      return []
    }

    const cardIds = sharedCards.map((card) => card.id)
    const deckRows = await db
      .select({
        cardId: deckCards.cardId,
        deckId: deckCards.deckId,
        deckName: decks.name,
      })
      .from(deckCards)
      .innerJoin(decks, eq(decks.id, deckCards.deckId))
      .where(inArray(deckCards.cardId, cardIds))
    const decksByCardId = new Map<number, DeckOption[]>()
    for (const row of deckRows) {
      const list = decksByCardId.get(row.cardId) ?? []
      list.push({ id: row.deckId, name: row.deckName })
      decksByCardId.set(row.cardId, list)
    }

    const currentDeckIds = sharedCards
      .map((card) => card.currentDeckId)
      .filter((id) => id !== null)
    const currentDecks =
      currentDeckIds.length > 0
        ? await db
            .select({ id: decks.id, name: decks.name })
            .from(decks)
            .where(inArray(decks.id, currentDeckIds))
        : []
    const deckNameById = new Map(
      currentDecks.map((deck) => [deck.id, deck.name]),
    )

    return sharedCards.map((card) => ({
      cardId: card.id,
      name: card.name,
      currentDeckId: card.currentDeckId,
      currentDeckName:
        card.currentDeckId !== null
          ? (deckNameById.get(card.currentDeckId) ?? null)
          : null,
      decksWithThisCard: decksByCardId.get(card.id) ?? [],
    }))
  },
)
