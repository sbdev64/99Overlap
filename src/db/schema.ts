import { relations } from 'drizzle-orm'
import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core'
import { DECK_TYPES } from '@/lib/deck-type'

/**
 * A saved Commander deck. See docs/PRODUCT.md#core-domain-model.
 */
export const decks = sqliteTable('decks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  // 'planning' = wanted but not physically owned; doesn't count toward
  // "owned" for the already-own-this-card check (docs/PRODUCT.md#10).
  type: text('type', { enum: DECK_TYPES }).notNull().default('custom'),
  // Display-only fields derived from the parsed decklist, not used for matching logic.
  commanderName: text('commander_name'),
  // Auto-derived from the commander(s)' enriched Card.colorIdentity once
  // Scryfall enrichment has run (getDeck computes and persists it lazily,
  // same pattern as card enrichment backfill). Not user-editable.
  // See docs/PRODUCT.md#10.
  colorIdentity: text('color_identity'),
  // Free-text physical bookkeeping + deck metadata (docs/PRODUCT.md#10),
  // all optional.
  boxColor: text('box_color'),
  sleeveColor: text('sleeve_color'),
  archetype: text('archetype'),
  // How many of the leading card lines are commanders when the pasted text
  // has no explicit "Commander" header — 1 normally, 2 for Partner/
  // Background decks. Set by the user (checkbox on import/edit) since the
  // parser can't tell from the text alone. See docs/PRODUCT.md#5b and
  // src/lib/decklist-parser.ts.
  commanderCount: integer('commander_count').notNull().default(1),
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
  // Numeric mana value (Scryfall's `cmc`) — needed for the by-mana-value
  // grouping in docs/PRODUCT.md#8, not derivable from the manaCost symbol
  // string alone.
  cmc: real('cmc'),
  typeLine: text('type_line'),
  // Comma-separated WUBRG letters in color order, e.g. "W,U"; empty string
  // for colorless. From Scryfall's `color_identity` array.
  colorIdentity: text('color_identity'),
  imageUrl: text('image_url'),
  // Shared-card tracking (docs/PRODUCT.md#5 and #6): the user owns exactly
  // one physical copy and moves it between decks by hand.
  isShared: integer('is_shared', { mode: 'boolean' }).notNull().default(false),
  // Which deck currently physically holds this shared card. Only meaningful
  // when isShared is true. Set to null automatically if that deck is
  // deleted (docs/PRODUCT.md#3 / roadmap issue #17) rather than left
  // dangling.
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
    // Only 'commander' and 'mainboard' count toward overlap/shared-card
    // tracking (docs/PRODUCT.md#boards-what-counts-toward-overlap).
    board: text('board', { enum: ['commander', 'mainboard'] }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.deckId, table.cardId] })],
)

/**
 * One row per game logged. Replaces the user's manual Google Sheet game
 * log. See docs/PRODUCT.md#9-game-history-log-m4.
 */
export const games = sqliteTable('games', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // User-picked date the game was played, stored as 'YYYY-MM-DD' (matches
  // <input type="date"> exactly) rather than a timestamp — there's no
  // time-of-day meaning here, and this sidesteps timezone conversion.
  date: text('date').notNull(),
  // Nullable: set to null if the deck is later deleted, same as
  // cards.currentDeckId. deckName below keeps the history readable anyway.
  deckId: integer('deck_id').references(() => decks.id, {
    onDelete: 'set null',
  }),
  // Denormalized snapshot of Deck.name at log time, so a deleted or
  // renamed deck doesn't blank out past history rows.
  deckName: text('deck_name').notNull(),
  // Which regular playgroup — free text with autocomplete in the UI, not a
  // managed entity. See the decision log in docs/PRODUCT.md.
  pod: text('pod').notNull(),
  won: integer('won', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const decksRelations = relations(decks, ({ many }) => ({
  deckCards: many(deckCards),
  games: many(games),
}))

export const gamesRelations = relations(games, ({ one }) => ({
  deck: one(decks, { fields: [games.deckId], references: [decks.id] }),
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
