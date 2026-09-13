import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { deckCards, decks } from '@/db/schema'
import { parseDecklist } from '@/lib/decklist-parser'
import { insertDeckCards } from './deck-card-sync'

const updateDeckSchema = z.object({
  deckId: z.coerce.number().int().positive(),
  sourceText: z.string().trim().min(1, 'Paste a decklist first'),
})

export interface UpdateDeckResult {
  deckId: number
  deckName: string
  commanderName: string | null
  cardCount: number
  newCardCount: number
  warnings: string[]
}

export const updateDeck = createServerFn({ method: 'POST' })
  .validator((input: unknown) => updateDeckSchema.parse(input))
  .handler(async ({ data }): Promise<UpdateDeckResult> => {
    // Dynamic import so `bun:sqlite` never ends up in the client bundle —
    // see the comment in src/server/import-deck.ts.
    const { db } = await import('@/db/client')

    const parsed = parseDecklist(data.sourceText)

    return db.transaction(async (tx) => {
      const existing = await tx.query.decks.findFirst({
        where: eq(decks.id, data.deckId),
      })
      if (!existing) {
        throw notFound()
      }

      // Replace this deck's cards entirely. Only this deck's DeckCard rows
      // are removed — every Card row (and its isShared/currentDeckId) and
      // every other deck's DeckCard rows are untouched.
      // See docs/PRODUCT.md#2-update-a-deck.
      await tx.delete(deckCards).where(eq(deckCards.deckId, data.deckId))

      const [deck] = await tx
        .update(decks)
        .set({
          commanderName: parsed.commanderNames.join(', ') || null,
          sourceText: data.sourceText,
          updatedAt: new Date(),
        })
        .where(eq(decks.id, data.deckId))
        .returning()

      const { cardCount, newCardCount } = await insertDeckCards(
        tx,
        deck.id,
        parsed.entries,
      )

      return {
        deckId: deck.id,
        deckName: deck.name,
        commanderName: deck.commanderName,
        cardCount,
        newCardCount,
        warnings: parsed.warnings,
      }
    })
  })
