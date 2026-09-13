import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { cards } from '@/db/schema'

const unmarkSharedSchema = z.object({
  cardId: z.coerce.number().int().positive(),
})

/**
 * Reverts a card from shared: clears `isShared` and `currentDeckId`. Used
 * when the user no longer moves this card between decks by hand (e.g. they
 * bought a second copy). See docs/PRODUCT.md#5-marking-a-shared-card.
 */
export const unmarkShared = createServerFn({ method: 'POST' })
  .validator((input: unknown) => unmarkSharedSchema.parse(input))
  .handler(async ({ data }): Promise<{ cardId: number }> => {
    // Dynamic import so `bun:sqlite` never ends up in the client bundle —
    // see the comment in src/server/import-deck.ts.
    const { db } = await import('@/db/client')

    await db
      .update(cards)
      .set({ isShared: false, currentDeckId: null })
      .where(eq(cards.id, data.cardId))

    return { cardId: data.cardId }
  })
