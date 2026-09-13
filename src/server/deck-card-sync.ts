import { sql } from 'drizzle-orm'
import { cards, deckCards } from '@/db/schema'
import type { Transaction } from '@/db/types'
import type { ParsedCardEntry } from '@/lib/decklist-parser'

/** Trims and collapses internal whitespace, so stray double spaces from a
 * paste don't create a duplicate Card row for the same name. */
function normalizeCardName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

/** Finds an existing Card by case-insensitive name match, or creates one.
 * See the "Card identity = exact name match" decision in docs/PRODUCT.md.
 * Never touches `isShared`/`currentDeckId` on an existing card. */
async function findOrCreateCardId(
  tx: Transaction,
  name: string,
): Promise<{ id: number; isNew: boolean }> {
  const normalized = normalizeCardName(name)

  const existing = await tx
    .select({ id: cards.id })
    .from(cards)
    .where(sql`lower(${cards.name}) = lower(${normalized})`)
    .get()
  if (existing) {
    return { id: existing.id, isNew: false }
  }

  const [created] = await tx
    .insert(cards)
    .values({ name: normalized })
    .returning({ id: cards.id })
  return { id: created.id, isNew: true }
}

export interface SyncResult {
  cardCount: number
  newCardCount: number
}

/**
 * Inserts DeckCard rows for `entries` into `deckId`, reusing existing Card
 * rows by name. Used by both a fresh import and a re-import/update — the
 * caller is responsible for clearing any previous DeckCard rows for this
 * deck first if this is an update (see docs/PRODUCT.md#2-update-a-deck).
 */
export async function insertDeckCards(
  tx: Transaction,
  deckId: number,
  entries: ParsedCardEntry[],
): Promise<SyncResult> {
  // A singleton decklist shouldn't repeat a name within one board, but
  // merge quantities defensively rather than letting a duplicate line
  // violate the (deckId, cardId) primary key.
  const merged = new Map<
    string,
    { name: string; board: 'commander' | 'mainboard'; quantity: number }
  >()
  for (const entry of entries) {
    const key = `${entry.board}:${normalizeCardName(entry.name).toLowerCase()}`
    const existing = merged.get(key)
    if (existing) {
      existing.quantity += entry.quantity
    } else {
      merged.set(key, { ...entry })
    }
  }

  let newCardCount = 0
  for (const entry of merged.values()) {
    const { id: cardId, isNew } = await findOrCreateCardId(tx, entry.name)
    if (isNew) newCardCount += 1

    await tx.insert(deckCards).values({
      deckId,
      cardId,
      quantity: entry.quantity,
      board: entry.board,
    })
  }

  return { cardCount: merged.size, newCardCount }
}
