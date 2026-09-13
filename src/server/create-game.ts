import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { decks, games } from '@/db/schema'

const createGameSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  deckId: z.coerce.number().int().positive(),
  pod: z.string().trim().min(1, 'Pod is required'),
  won: z.boolean().default(false),
})

export interface CreateGameResult {
  gameId: number
}

/**
 * Logs a game. Never touches Card.isShared/currentDeckId — this is purely
 * informational. See docs/PRODUCT.md#9-game-history-log-m4.
 */
export const createGame = createServerFn({ method: 'POST' })
  .validator((input: unknown) => createGameSchema.parse(input))
  .handler(async ({ data }): Promise<CreateGameResult> => {
    // Dynamic import so `bun:sqlite` never ends up in the client bundle —
    // see the comment in src/server/import-deck.ts.
    const { db } = await import('@/db/client')

    const deck = await db.query.decks.findFirst({
      where: eq(decks.id, data.deckId),
    })
    if (!deck) {
      throw new Error('Deck not found')
    }

    const [game] = await db
      .insert(games)
      .values({
        date: data.date,
        deckId: deck.id,
        // Snapshotted at log time so a later deck rename/delete doesn't
        // blank out this row. See docs/PRODUCT.md#9-game-history-log-m4.
        deckName: deck.name,
        pod: data.pod,
        won: data.won,
      })
      .returning({ id: games.id })

    return { gameId: game.id }
  })
