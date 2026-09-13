import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { decks } from '@/db/schema'
import { DECK_TYPES, type DeckType } from '@/lib/deck-type'
import { parseDecklist } from '@/lib/decklist-parser'
import { insertDeckCards } from './deck-card-sync'
import { enrichCards } from './scryfall-enrich'

const importDeckSchema = z.object({
  name: z.string().trim().min(1, 'Deck name is required'),
  sourceText: z.string().trim().min(1, 'Paste a decklist first'),
  // 2 for Partner/Background decks (two commander lines, no header). See
  // src/lib/decklist-parser.ts.
  commanderCount: z.union([z.literal(1), z.literal(2)]).default(1),
  type: z.enum(DECK_TYPES).default('custom'),
})

export interface ImportDeckResult {
  deckId: number
  deckName: string
  type: DeckType
  commanderName: string | null
  cardCount: number
  newCardCount: number
  warnings: string[]
}

export const importDeck = createServerFn({ method: 'POST' })
  .validator((input: unknown) => importDeckSchema.parse(input))
  .handler(async ({ data }): Promise<ImportDeckResult> => {
    // Imported dynamically (rather than as a top-level `import`) so that
    // `bun:sqlite` never ends up in the client bundle. A static top-level
    // import of `@/db/client` here would otherwise get pulled into the
    // client-side split of this file and crash in the browser, since
    // client.ts opens the database as a module-scope side effect. See the
    // decision log in docs/PRODUCT.md.
    const { db } = await import('@/db/client')

    const parsed = parseDecklist(data.sourceText, {
      commanderCount: data.commanderCount,
    })

    const result = await db.transaction(async (tx) => {
      const [deck] = await tx
        .insert(decks)
        .values({
          name: data.name,
          type: data.type,
          commanderName: parsed.commanderNames.join(', ') || null,
          sourceText: data.sourceText,
          commanderCount: data.commanderCount,
        })
        .returning()

      const { cardCount, newCardCount, newCards } = await insertDeckCards(
        tx,
        deck.id,
        parsed.entries,
      )

      return {
        deckId: deck.id,
        deckName: deck.name,
        type: deck.type,
        commanderName: deck.commanderName,
        cardCount,
        newCardCount,
        newCards,
        warnings: parsed.warnings,
      }
    })

    // Outside the transaction — this makes network calls, which shouldn't
    // hold the SQLite write lock open. Best-effort: see enrichCards.
    await enrichCards(db, result.newCards)

    const { newCards, ...response } = result
    return response
  })
