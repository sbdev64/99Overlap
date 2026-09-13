import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { games } from '@/db/schema'

const deleteGameSchema = z.object({
  gameId: z.coerce.number().int().positive(),
})

export const deleteGame = createServerFn({ method: 'POST' })
  .validator((input: unknown) => deleteGameSchema.parse(input))
  .handler(async ({ data }): Promise<{ gameId: number }> => {
    // Dynamic import so `bun:sqlite` never ends up in the client bundle —
    // see the comment in src/server/import-deck.ts.
    const { db } = await import('@/db/client')

    await db.delete(games).where(eq(games.id, data.gameId))

    return { gameId: data.gameId }
  })
