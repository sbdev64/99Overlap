import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { decks, games } from '@/db/schema'

const updateGameSchema = z.object({
  gameId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  deckId: z.coerce.number().int().positive(),
  pod: z.string().trim().min(1, 'Pod is required'),
  won: z.boolean().default(false),
})

/**
 * Edits a logged game. Never touches Card.isShared/currentDeckId — this is
 * purely informational. See docs/PRODUCT.md#9-game-history-log-m4.
 */
export const updateGame = createServerFn({ method: 'POST' })
  .validator((input: unknown) => updateGameSchema.parse(input))
  .handler(async ({ data }): Promise<{ gameId: number }> => {
    // Dynamic import so `bun:sqlite` never ends up in the client bundle —
    // see the comment in src/server/import-deck.ts.
    const { db } = await import('@/db/client')

    const deck = await db.query.decks.findFirst({
      where: eq(decks.id, data.deckId),
    })
    if (!deck) {
      throw new Error('Deck not found')
    }

    await db
      .update(games)
      .set({
        date: data.date,
        deckId: deck.id,
        // Re-snapshotted in case the deck was renamed since this game was
        // first logged. See docs/PRODUCT.md#9-game-history-log-m4.
        deckName: deck.name,
        pod: data.pod,
        won: data.won,
        updatedAt: new Date(),
      })
      .where(eq(games.id, data.gameId))

    return { gameId: data.gameId }
  })
