import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { decks } from '@/db/schema'

const deleteDeckSchema = z.object({
  deckId: z.coerce.number().int().positive(),
})

/**
 * Deletes a Deck. Its DeckCard rows cascade-delete at the DB level (see the
 * `onDelete: 'cascade'` FK in src/db/schema.ts); every Card row persists,
 * since other decks may still reference it. If this deck was a shared card's
 * `currentDeckId`, that FK's `onDelete: 'set null'` clears it automatically,
 * and every deck that still lists the card flags it as "location unknown"
 * (src/routes/decks.$deckId.tsx) until someone marks where it actually is.
 * See docs/PRODUCT.md#3-delete-a-deck.
 */
export const deleteDeck = createServerFn({ method: 'POST' })
  .validator((input: unknown) => deleteDeckSchema.parse(input))
  .handler(async ({ data }): Promise<{ deckId: number }> => {
    // Dynamic import so `bun:sqlite` never ends up in the client bundle —
    // see the comment in src/server/import-deck.ts.
    const { db } = await import('@/db/client')

    await db.delete(decks).where(eq(decks.id, data.deckId))

    return { deckId: data.deckId }
  })
