import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { desc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { cards as cardsTable, deckCards, decks, games } from '@/db/schema'
import { mergeColorIdentities } from '@/lib/colors'
import type { DeckType } from '@/lib/deck-type'
import type { TrackedBoard } from '@/lib/decklist-parser'
import { enrichCards } from './scryfall-enrich'

export interface DeckSummary {
  id: number
  name: string
  type: DeckType
  commanderName: string | null
  createdAt: string
  /** MAX(date) over this deck's logged games, or null if never played. See
   * docs/PRODUCT.md#9-game-history-log-m4 / roadmap issue #51. */
  lastPlayedDate: string | null
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
        type: decks.type,
        commanderName: decks.commanderName,
        createdAt: decks.createdAt,
      })
      .from(decks)
      // createdAt has only second-level precision, so two decks imported in
      // the same second would otherwise tie; id (autoincrement) is a
      // reliable tiebreaker that always matches insertion order.
      .orderBy(desc(decks.createdAt), desc(decks.id))

    const lastPlayedRows = await db
      .select({
        deckId: games.deckId,
        lastPlayedDate: sql<string>`max(${games.date})`,
      })
      .from(games)
      .groupBy(games.deckId)
    const lastPlayedByDeckId = new Map(
      lastPlayedRows
        .filter((row) => row.deckId !== null)
        .map((row) => [row.deckId as number, row.lastPlayedDate]),
    )

    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      lastPlayedDate: lastPlayedByDeckId.get(row.id) ?? null,
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
  /** From Scryfall enrichment (#18); null until enriched or if not found. */
  imageUrl: string | null
  typeLine: string | null
  /** Comma-separated WUBRG letters, e.g. "W,U"; "" for colorless. */
  colorIdentity: string | null
  /** Numeric mana value. */
  cmc: number | null
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
  /** Precon/Custom decks (never Planning) that have this card — used by a
   * Planning deck's view to flag "already own" vs "need to buy". See
   * docs/PRODUCT.md#10 / roadmap issue #62. */
  ownedInDecks: DeckOption[]
}

export interface DeckDetail {
  id: number
  name: string
  type: DeckType
  commanderName: string | null
  sourceText: string
  /** 1, or 2 for Partner/Background decks. See src/lib/decklist-parser.ts. */
  commanderCount: number
  /** Auto-derived from the commander(s)' enriched color identity; null
   * until they're enriched. See docs/PRODUCT.md#10. */
  colorIdentity: string | null
  boxColor: string | null
  sleeveColor: string | null
  archetype: string | null
  cards: DeckCardEntry[]
  /** MAX(date) over this deck's logged games, or null if never played. See
   * docs/PRODUCT.md#9-game-history-log-m4 / roadmap issue #51. */
  lastPlayedDate: string | null
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

    // Lazily backfills cards imported before Scryfall enrichment (#18)
    // existed — on-import enrichment alone would otherwise never reach
    // decks that were already saved. Best-effort; see enrichCards.
    const unenriched = deck.deckCards
      .filter((deckCard) => deckCard.card.scryfallId === null)
      .map((deckCard) => ({ id: deckCard.card.id, name: deckCard.card.name }))
    if (unenriched.length > 0) {
      await enrichCards(db, unenriched)
      const refreshed = await db
        .select()
        .from(cardsTable)
        .where(
          inArray(
            cardsTable.id,
            unenriched.map((card) => card.id),
          ),
        )
      const refreshedById = new Map(refreshed.map((card) => [card.id, card]))
      for (const deckCard of deck.deckCards) {
        const updated = refreshedById.get(deckCard.card.id)
        if (updated) deckCard.card = updated
      }
    }

    // Auto-derives Deck.colorIdentity from the commander(s)' enriched
    // colorIdentity — same lazy-persist pattern as the enrichment backfill
    // above. Skipped (left as-is) until every commander is enriched.
    // See docs/PRODUCT.md#10.
    const commanderCards = deck.deckCards.filter(
      (deckCard) => deckCard.board === 'commander',
    )
    if (
      commanderCards.length > 0 &&
      commanderCards.every((deckCard) => deckCard.card.colorIdentity !== null)
    ) {
      const computedColorIdentity = mergeColorIdentities(
        commanderCards.map((deckCard) => deckCard.card.colorIdentity as string),
      )
      if (computedColorIdentity !== deck.colorIdentity) {
        await db
          .update(decks)
          .set({ colorIdentity: computedColorIdentity })
          .where(eq(decks.id, deck.id))
        deck.colorIdentity = computedColorIdentity
      }
    }

    const cardIds = deck.deckCards.map((deckCard) => deckCard.cardId)
    const decksPerCard =
      cardIds.length > 0
        ? await db
            .select({
              cardId: deckCards.cardId,
              deckId: deckCards.deckId,
              deckName: decks.name,
              deckType: decks.type,
            })
            .from(deckCards)
            .innerJoin(decks, eq(deckCards.deckId, decks.id))
            .where(inArray(deckCards.cardId, cardIds))
        : []
    const decksByCardId = new Map<number, DeckOption[]>()
    // Planning decks don't count as "owned" — this is what lets a Planning
    // deck (see #62) flag which of its cards the user already has
    // elsewhere. See docs/PRODUCT.md#10.
    const ownedDecksByCardId = new Map<number, DeckOption[]>()
    for (const row of decksPerCard) {
      const list = decksByCardId.get(row.cardId) ?? []
      list.push({ id: row.deckId, name: row.deckName })
      decksByCardId.set(row.cardId, list)

      if (row.deckType !== 'planning') {
        const ownedList = ownedDecksByCardId.get(row.cardId) ?? []
        ownedList.push({ id: row.deckId, name: row.deckName })
        ownedDecksByCardId.set(row.cardId, ownedList)
      }
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

    const [lastPlayedRow] = await db
      .select({ lastPlayedDate: sql<string>`max(${games.date})` })
      .from(games)
      .where(eq(games.deckId, deck.id))

    const cards: DeckCardEntry[] = deck.deckCards
      .map((deckCard) => {
        const sharedDecks = decksByCardId.get(deckCard.cardId) ?? []
        return {
          cardId: deckCard.cardId,
          name: deckCard.card.name,
          quantity: deckCard.quantity,
          board: deckCard.board,
          imageUrl: deckCard.card.imageUrl,
          typeLine: deckCard.card.typeLine,
          colorIdentity: deckCard.card.colorIdentity,
          cmc: deckCard.card.cmc,
          isOverlapping: sharedDecks.length > 1,
          isShared: deckCard.card.isShared,
          currentDeckId: deckCard.card.currentDeckId,
          currentDeckName:
            deckCard.card.currentDeckId !== null
              ? (deckNameById.get(deckCard.card.currentDeckId) ?? null)
              : null,
          decksWithThisCard: sharedDecks,
          ownedInDecks: ownedDecksByCardId.get(deckCard.cardId) ?? [],
        }
      })
      .sort((a, b) => {
        if (a.board !== b.board) return a.board === 'commander' ? -1 : 1
        return a.name.localeCompare(b.name)
      })

    return {
      id: deck.id,
      name: deck.name,
      type: deck.type,
      commanderName: deck.commanderName,
      sourceText: deck.sourceText,
      commanderCount: deck.commanderCount,
      colorIdentity: deck.colorIdentity,
      boxColor: deck.boxColor,
      sleeveColor: deck.sleeveColor,
      archetype: deck.archetype,
      cards,
      lastPlayedDate: lastPlayedRow?.lastPlayedDate ?? null,
    }
  })
