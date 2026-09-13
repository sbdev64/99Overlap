import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { deckCards, decks } from '@/db/schema'
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

export interface DeckOption {
  id: number
  name: string
}

export interface DeckCardEntry {
  cardId: number
  name: string
  quantity: number
  board: TrackedBoard
  /** True when this card also appears in at least one other deck. See
   * docs/PRODUCT.md#4-overlap-detection. */
  isOverlapping: boolean
  isShared: boolean
  currentDeckId: number | null
  currentDeckName: string | null
  /** Every deck (including this one) that has this card — the valid
   * choices for "which deck currently has this card physically" when
   * marking it shared. See docs/PRODUCT.md#5-marking-a-shared-card. */
  decksWithThisCard: DeckOption[]
}

export interface DeckDetail {
  id: number
  name: string
  commanderName: string | null
  sourceText: string
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

    const cardIds = deck.deckCards.map((deckCard) => deckCard.cardId)
    const decksPerCard =
      cardIds.length > 0
        ? await db
            .select({
              cardId: deckCards.cardId,
              deckId: deckCards.deckId,
              deckName: decks.name,
            })
            .from(deckCards)
            .innerJoin(decks, eq(deckCards.deckId, decks.id))
            .where(inArray(deckCards.cardId, cardIds))
        : []
    const decksByCardId = new Map<number, DeckOption[]>()
    for (const row of decksPerCard) {
      const list = decksByCardId.get(row.cardId) ?? []
      list.push({ id: row.deckId, name: row.deckName })
      decksByCardId.set(row.cardId, list)
    }

    const currentDeckIds = deck.deckCards
      .map((deckCard) => deckCard.card.currentDeckId)
      .filter((id) => id !== null)
    const currentDecks =
      currentDeckIds.length > 0
        ? await db
            .select({ id: decks.id, name: decks.name })
            .from(decks)
            .where(inArray(decks.id, currentDeckIds))
        : []
    const deckNameById = new Map(currentDecks.map((d) => [d.id, d.name]))

    const cards: DeckCardEntry[] = deck.deckCards
      .map((deckCard) => {
        const sharedDecks = decksByCardId.get(deckCard.cardId) ?? []
        return {
          cardId: deckCard.cardId,
          name: deckCard.card.name,
          quantity: deckCard.quantity,
          board: deckCard.board,
          isOverlapping: sharedDecks.length > 1,
          isShared: deckCard.card.isShared,
          currentDeckId: deckCard.card.currentDeckId,
          currentDeckName:
            deckCard.card.currentDeckId !== null
              ? (deckNameById.get(deckCard.card.currentDeckId) ?? null)
              : null,
          decksWithThisCard: sharedDecks,
        }
      })
      .sort((a, b) => {
        if (a.board !== b.board) return a.board === 'commander' ? -1 : 1
        return a.name.localeCompare(b.name)
      })

    return {
      id: deck.id,
      name: deck.name,
      commanderName: deck.commanderName,
      sourceText: deck.sourceText,
      cards,
    }
  })
