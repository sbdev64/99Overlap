import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { cards, deckCards } from '@/db/schema'

const markSharedSchema = z.object({
  cardId: z.coerce.number().int().positive(),
  currentDeckId: z.coerce.number().int().positive(),
})

/**
 * Marks a card as shared: the user owns exactly one physical copy and
 * moves it between decks by hand. `currentDeckId` records which deck
 * physically has it right now. See docs/PRODUCT.md#5-marking-a-shared-card.
 */
export const markShared = createServerFn({ method: 'POST' })
  .validator((input: unknown) => markSharedSchema.parse(input))
  .handler(async ({ data }): Promise<{ cardId: number }> => {
    // Dynamic import so `bun:sqlite` never ends up in the client bundle —
    // see the comment in src/server/import-deck.ts.
    const { db } = await import('@/db/client')

    // The picker only offers decks that already contain this card, but
    // double-check server-side too — a shared card's location should
    // always be one of the decks that actually lists it.
    const membership = await db.query.deckCards.findFirst({
      where: and(
        eq(deckCards.cardId, data.cardId),
        eq(deckCards.deckId, data.currentDeckId),
      ),
    })
    if (!membership) {
      throw new Error('That deck does not contain this card')
    }

    await db
      .update(cards)
      .set({ isShared: true, currentDeckId: data.currentDeckId })
      .where(eq(cards.id, data.cardId))

    return { cardId: data.cardId }
  })
