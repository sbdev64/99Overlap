import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { decks } from '@/db/schema'
import type { TrackedBoard } from '@/lib/decklist-parser'

export interface DeckSummary {
  id: number
  name: string
  commanderName: string | null
  createdAt: string
}

export const listDecks = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DeckSummary[]> => {
    // Dynamic import so `bun:sqlite` never ends up in the client bundle —
    // see the comment in src/server/import-deck.ts.
    const { db } = await import('@/db/client')

    const rows = await db
      .select({
        id: decks.id,
        name: decks.name,
        commanderName: decks.commanderName,
        createdAt: decks.createdAt,
      })
      .from(decks)
      // createdAt has only second-level precision, so two decks imported in
      // the same second would otherwise tie; id (autoincrement) is a
      // reliable tiebreaker that always matches insertion order.
      .orderBy(desc(decks.createdAt), desc(decks.id))

    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }))
  },
)

export interface DeckCardEntry {
  cardId: number
  name: string
  quantity: number
  board: TrackedBoard
}

export interface DeckDetail {
  id: number
  name: string
  commanderName: string | null
  cards: DeckCardEntry[]
}

const getDeckSchema = z.object({ deckId: z.coerce.number().int().positive() })

export const getDeck = createServerFn({ method: 'GET' })
  .validator((input: unknown) => getDeckSchema.parse(input))
  .handler(async ({ data }): Promise<DeckDetail> => {
    // Dynamic import so `bun:sqlite` never ends up in the client bundle —
    // see the comment in src/server/import-deck.ts.
    const { db } = await import('@/db/client')

    const deck = await db.query.decks.findFirst({
      where: eq(decks.id, data.deckId),
      with: { deckCards: { with: { card: true } } },
    })

    if (!deck) {
      throw notFound()
    }

    const cards: DeckCardEntry[] = deck.deckCards
      .map((deckCard) => ({
        cardId: deckCard.cardId,
        name: deckCard.card.name,
        quantity: deckCard.quantity,
        board: deckCard.board,
      }))
      .sort((a, b) => {
        if (a.board !== b.board) return a.board === 'commander' ? -1 : 1
        return a.name.localeCompare(b.name)
      })

    return {
      id: deck.id,
      name: deck.name,
      commanderName: deck.commanderName,
      cards,
    }
  })
