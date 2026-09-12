import { relations } from 'drizzle-orm'
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * A saved Commander deck. See docs/PRODUCT.md#core-domain-model.
 */
export const decks = sqliteTable('decks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  // Display-only fields derived from the parsed decklist, not used for matching logic.
  commanderName: text('commander_name'),
  colorIdentity: text('color_identity'),
  // Last raw pasted decklist, kept so re-imports can diff/replace this deck's cards.
  sourceText: text('source_text').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

/**
 * One row per unique card NAME, shared across every deck that contains it.
 * Cards are matched by exact (trimmed, case-insensitive) name — see the
 * "Card identity = exact name match" decision in docs/PRODUCT.md.
 */
export const cards = sqliteTable('cards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  // Nullable fields filled in later by Scryfall enrichment (docs/PRODUCT.md#7).
  scryfallId: text('scryfall_id'),
  manaCost: text('mana_cost'),
  typeLine: text('type_line'),
  colorIdentity: text('color_identity'),
  imageUrl: text('image_url'),
  // Staple tracking (docs/PRODUCT.md#5 and #6): the user owns exactly one
  // physical copy and moves it between decks by hand.
  isStaple: integer('is_staple', { mode: 'boolean' }).notNull().default(false),
  // Which deck currently physically holds this staple. Only meaningful when
  // isStaple is true. Set to null automatically if that deck is deleted
  // (docs/PRODUCT.md#3 / roadmap issue #17) rather than left dangling.
  currentDeckId: integer('current_deck_id').references(() => decks.id, {
    onDelete: 'set null',
  }),
})

/**
 * Join table: which cards are in which deck, and how many copies.
 */
export const deckCards = sqliteTable(
  'deck_cards',
  {
    deckId: integer('deck_id')
      .notNull()
      .references(() => decks.id, { onDelete: 'cascade' }),
    cardId: integer('card_id')
      .notNull()
      .references(() => cards.id),
    quantity: integer('quantity').notNull().default(1),
    // Only 'commander' and 'mainboard' count toward overlap/staple tracking
    // (docs/PRODUCT.md#boards-what-counts-toward-overlap).
    board: text('board', { enum: ['commander', 'mainboard'] }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.deckId, table.cardId] })],
)

export const decksRelations = relations(decks, ({ many }) => ({
  deckCards: many(deckCards),
}))

export const cardsRelations = relations(cards, ({ many, one }) => ({
  deckCards: many(deckCards),
  currentDeck: one(decks, {
    fields: [cards.currentDeckId],
    references: [decks.id],
  }),
}))

export const deckCardsRelations = relations(deckCards, ({ one }) => ({
  deck: one(decks, { fields: [deckCards.deckId], references: [decks.id] }),
  card: one(cards, { fields: [deckCards.cardId], references: [cards.id] }),
}))
