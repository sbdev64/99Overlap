import { createServerFn } from '@tanstack/react-start'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db/client'
import { cards, deckCards, decks } from '@/db/schema'
import { parseDecklist } from '@/lib/decklist-parser'

const importDeckSchema = z.object({
  name: z.string().trim().min(1, 'Deck name is required'),
  sourceText: z.string().trim().min(1, 'Paste a decklist first'),
})

export interface ImportDeckResult {
  deckId: number
  deckName: string
  commanderName: string | null
  cardCount: number
  newCardCount: number
  warnings: string[]
}

/** Trims and collapses internal whitespace, so stray double spaces from a
 * paste don't create a duplicate Card row for the same name. */
function normalizeCardName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

/** Finds an existing Card by case-insensitive name match, or creates one.
 * See the "Card identity = exact name match" decision in docs/PRODUCT.md. */
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

export const importDeck = createServerFn({ method: 'POST' })
  .validator((input: unknown) => importDeckSchema.parse(input))
  .handler(async ({ data }): Promise<ImportDeckResult> => {
    const parsed = parseDecklist(data.sourceText)

    // A singleton decklist shouldn't repeat a name within one board, but
    // merge quantities defensively rather than letting a duplicate line
    // violate the (deckId, cardId) primary key.
    const merged = new Map<
      string,
      { name: string; board: 'commander' | 'mainboard'; quantity: number }
    >()
    for (const entry of parsed.entries) {
      const key = `${entry.board}:${normalizeCardName(entry.name).toLowerCase()}`
      const existing = merged.get(key)
      if (existing) {
        existing.quantity += entry.quantity
      } else {
        merged.set(key, { ...entry })
      }
    }

    return db.transaction(async (tx) => {
      const [deck] = await tx
        .insert(decks)
        .values({
          name: data.name,
          commanderName: parsed.commanderNames.join(', ') || null,
          sourceText: data.sourceText,
        })
        .returning()

      let newCardCount = 0
      for (const entry of merged.values()) {
        const { id: cardId, isNew } = await findOrCreateCardId(tx, entry.name)
        if (isNew) newCardCount += 1

        await tx.insert(deckCards).values({
          deckId: deck.id,
          cardId,
          quantity: entry.quantity,
          board: entry.board,
        })
      }

      return {
        deckId: deck.id,
        deckName: deck.name,
        commanderName: deck.commanderName,
        cardCount: merged.size,
        newCardCount,
        warnings: parsed.warnings,
      }
    })
  })
