import { createServerFn } from '@tanstack/react-start'
import { eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { cards as cardsTable, deckCards, decks } from '@/db/schema'
import { enrichCards } from './scryfall-enrich'

export interface UnenrichedCard {
  id: number
  name: string
  /** Which deck(s) reference this card — a card with no deck at all
   * shouldn't normally exist, but is still reported rather than hidden. */
  deckNames: string[]
}

/**
 * Lists every Card that's never matched on Scryfall (`scryfallId IS NULL`),
 * so bad imports can be spotted without opening every deck one at a time.
 * Complements (doesn't replace) the lazy per-deck-view backfill in
 * `src/server/decks.ts`. See roadmap issue #122.
 */
export const getUnenrichedCards = createServerFn({ method: 'GET' }).handler(
  async (): Promise<UnenrichedCard[]> => {
    // Dynamic import so `bun:sqlite` never ends up in the client bundle —
    // see the comment in src/server/import-deck.ts.
    const { db } = await import('@/db/client')

    const unenriched = await db
      .select({ id: cardsTable.id, name: cardsTable.name })
      .from(cardsTable)
      .where(isNull(cardsTable.scryfallId))

    if (unenriched.length === 0) return []

    const deckRows = await db
      .select({
        cardId: deckCards.cardId,
        deckName: decks.name,
      })
      .from(deckCards)
      .innerJoin(decks, eq(deckCards.deckId, decks.id))

    const deckNamesByCardId = new Map<number, string[]>()
    for (const row of deckRows) {
      const list = deckNamesByCardId.get(row.cardId) ?? []
      list.push(row.deckName)
      deckNamesByCardId.set(row.cardId, list)
    }

    return unenriched.map((card) => ({
      ...card,
      deckNames: deckNamesByCardId.get(card.id) ?? [],
    }))
  },
)

const retryEnrichmentSchema = z.object({
  // Retries just this one card when set; every still-unenriched card
  // otherwise.
  cardId: z.coerce.number().int().positive().optional(),
})

export const retryEnrichment = createServerFn({ method: 'POST' })
  .validator((input: unknown) => retryEnrichmentSchema.parse(input))
  .handler(async ({ data }): Promise<{ retried: number }> => {
    // Dynamic import so `bun:sqlite` never ends up in the client bundle —
    // see the comment in src/server/import-deck.ts.
    const { db } = await import('@/db/client')

    const targets = data.cardId
      ? await db
          .select({ id: cardsTable.id, name: cardsTable.name })
          .from(cardsTable)
          .where(eq(cardsTable.id, data.cardId))
      : await db
          .select({ id: cardsTable.id, name: cardsTable.name })
          .from(cardsTable)
          .where(isNull(cardsTable.scryfallId))

    await enrichCards(db, targets)
    return { retried: targets.length }
  })
