import { createServerFn } from '@tanstack/react-start'
import { eq, inArray, ne, sql } from 'drizzle-orm'
import { cards, deckCards, decks, games } from '@/db/schema'
import {
  type ColorIdentityCount,
  computeGatheringDust,
  computeManaCurve,
  type GatheringDustDeck,
  groupColorIdentity,
  type ManaCurveEntry,
} from '@/lib/collection-stats'

export type { ColorIdentityCount, GatheringDustDeck, ManaCurveEntry }

export interface CollectionStats {
  colorIdentityDistribution: ColorIdentityCount[]
  manaCurve: ManaCurveEntry[]
  gatheringDust: GatheringDustDeck[]
}

// A deck not played in 90+ days (or never) is "gathering dust". See
// docs/PRODUCT.md#12-collection-level-stats-m6.
const GATHERING_DUST_THRESHOLD_DAYS = 90

/**
 * Collection-level stats scoped to owned decks (precon/custom) — Planning
 * decks aren't real, physically-built decks, so they're excluded from all
 * three insights here.
 */
export const getCollectionStats = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CollectionStats> => {
    // Dynamic import so `bun:sqlite` never ends up in the client bundle —
    // see the comment in src/server/import-deck.ts.
    const { db } = await import('@/db/client')

    const ownedDecks = await db
      .select({
        id: decks.id,
        name: decks.name,
        colorIdentity: decks.colorIdentity,
      })
      .from(decks)
      .where(ne(decks.type, 'planning'))

    const colorIdentityDistribution = groupColorIdentity(ownedDecks)

    const ownedDeckIds = ownedDecks.map((deck) => deck.id)
    const cardCounts =
      ownedDeckIds.length > 0
        ? await db
            .select({ cmc: cards.cmc, quantity: deckCards.quantity })
            .from(deckCards)
            .innerJoin(cards, eq(deckCards.cardId, cards.id))
            .where(inArray(deckCards.deckId, ownedDeckIds))
        : []
    const manaCurve = computeManaCurve(cardCounts)

    const lastPlayedRows =
      ownedDeckIds.length > 0
        ? await db
            .select({
              deckId: games.deckId,
              lastPlayedDate: sql<string>`max(${games.date})`,
            })
            .from(games)
            .where(inArray(games.deckId, ownedDeckIds))
            .groupBy(games.deckId)
        : []
    const lastPlayedByDeckId = new Map(
      lastPlayedRows
        .filter((row) => row.deckId !== null)
        .map((row) => [row.deckId as number, row.lastPlayedDate]),
    )
    const gatheringDust = computeGatheringDust(
      ownedDecks.map((deck) => ({
        id: deck.id,
        name: deck.name,
        lastPlayedDate: lastPlayedByDeckId.get(deck.id) ?? null,
      })),
      GATHERING_DUST_THRESHOLD_DAYS,
      new Date().toISOString().slice(0, 10),
    )

    return { colorIdentityDistribution, manaCurve, gatheringDust }
  },
)
