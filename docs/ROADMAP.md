# Roadmap

Milestones and their issue breakdown. Each issue below is meant to become an
actual GitHub issue (title as written, description = acceptance criteria).
Update this file when scope changes — it should stay the plan of record even
before/alongside GitHub issues existing.

## M0 — Project scaffolding

Goal: an empty-but-real app skeleton with the tooling from
[STACK.md](STACK.md) wired up, deployable to "hello world," CI green.

- [x] **Scaffold TanStack Start app with Bun** — init project, TypeScript
      strict mode, basic route renders. `bun run dev` works.
- [x] **Wire up Drizzle + SQLite** — schema file for `Deck`/`Card`/`DeckCard`
      (per [PRODUCT.md](PRODUCT.md#core-domain-model)), `drizzle-kit`
      migration generated and applied to a local `.sqlite` file.
- [x] **Add Tailwind v4 + shadcn/ui** — base layout renders with at least
      one shadcn component.
- [x] **Add Biome + Lefthook + commitlint** — `bun run lint`/`format`
      scripts; pre-commit hook runs Biome + typecheck; commit-msg hook
      enforces Conventional Commits.
- [x] **CI workflow** — GitHub Actions: install, typecheck, lint, build on
      every PR.

## M1 — Import, store, and see overlaps (MVP)

Goal: paste a decklist, see it saved, see shared cards highlighted across
decks. This is the first genuinely useful version.

- [x] **Decklist text parser** — parse Moxfield's plain-text export into
      commander + mainboard (quantity, name) pairs. Unit-tested against a
      couple of real pasted exports.
- [x] **Import deck form** — paste box → creates a `Deck` + `DeckCard` rows,
      reusing existing `Card` rows by name.
- [x] **Deck list page** — shows all saved decks (name, commander).
- [x] **Deck detail page** — shows a deck's full card list.
- [x] **Overlap detection** — query/derive which cards appear in >1 deck;
      highlight them on the deck detail page.
- [x] **Edit/re-import a deck** — re-paste updates an existing deck's cards
      without touching other decks' data.
- [x] **Delete a deck** — with confirmation; cascades `DeckCard` rows only.

## M2 — Shared-card tracking (the core mission)

Goal: mark a card as shared and always know what to physically move.

- [x] **Mark card as shared** — clicking a highlighted card in a deck view
      opens a picker to set `isShared = true` and choose `currentDeckId`.
- [x] **Unmark a shared card** — revert `isShared`, clear `currentDeckId`.
- [x] **"Missing shared cards" panel on deck detail page** — lists shared
      cards this deck needs whose `currentDeckId` points elsewhere, naming
      that deck.
- [x] **"Move here" action** — one click sets `currentDeckId` to the
      currently viewed deck.
- [x] **Handle deleting a deck that holds a shared card** — the card becomes
      unassigned and is flagged for the user across the app (not silently
      dropped).
- [x] **Partner/Background (two-commander) decks** — `commanderCount`
      checkbox on import/edit tells the parser how many leading lines are
      commanders, since it can't tell from the text alone. Closed out M1.

## M3 — Polish (closed 2026-09-13)

- [x] **Scryfall enrichment** — background/on-import lookup filling in
      `scryfallId`, mana cost, a numeric mana value (`cmc`), type line, color
      identity, image URL; rate-limited per Scryfall's guidance. Also
      lazily backfills any deck's cards imported before this shipped, the
      first time that deck's page is viewed. (#18)
- [x] **Card images in deck view** — Moxfield-style hover preview using
      enrichment data; falls back to plain text when a card has no image.
      (#19)
- [x] **Search/filter across decks** — `/search` page finds a card by
      (partial) name across all saved decks and shows which deck(s) contain
      it. (#20)
- [x] **All-shared-cards overview page** — `/shared` page listing every
      shared card, its current deck, and which other decks also need it;
      flags "location unknown" the same way the per-deck view does. (#21)
- [x] **Group/sort cards by type, color identity, or mana value in deck
      view** (Moxfield-like) — a control to switch the deck card list
      between three groupings: by primary type (default; Creature,
      Planeswalker, Instant, Sorcery, Artifact, Enchantment, Land, parsed
      from `typeLine`), by color identity, or by mana value, ascending.
      Shipped last since it depended on Scryfall enrichment above for
      `typeLine`/`colorIdentity`/`cmc`. See
      docs/PRODUCT.md#8-card-grouping-and-sort-in-deck-view-m3-moxfield-like.
      (#27)

## M4 — History (closed 2026-09-13)

Goal: replace the user's manual Google Sheet game log with a table in the
app — add/edit/delete a row with date, deck, pod, and win/loss. Two
purposes: (1) see when each deck was last played, as a cross-check
alongside the shared-card location tracking from M2; (2) lay groundwork for
a later stats/charts milestone (see "Future milestones" below — not built
in M4 itself).

Design decided (2026-09-13, see docs/PRODUCT.md#9-game-history-log-m4 and
its decision log): `pod` is free text with autocomplete, no managed lookup
table; logging a game never writes to `isShared`/`currentDeckId` — purely
informational, cross-checked by eye.

- [x] **Game log schema + add/list** — `Game` table (date, deckId, deckName
      snapshot, pod, won); `/history` page listing games newest first, with
      an "add game" form (date, deck select, pod text input with
      autocomplete, won checkbox). (#49)
- [x] **Edit and delete a game entry** — same form pre-filled; delete with
      confirmation (matches the existing deck-delete `AlertDialog` pattern).
      Shipped together with a styled pod autocomplete and app-wide
      dd/mm/yyyy date display. (#50)
- [x] **Show "last played" on deck pages** — derived from `MAX(date)` over
      this deck's games; the actual cross-check feature that's the point of
      this milestone. Shipped together with a name/last-played sort control
      on the decks list. (#51)

## M5 — Improvements (closed 2026-09-13)

Scoped and shipped same-day, 2026-09-13. Shipping stays postponed (see
"Ship it" below) — the user plans to self-host on a home-server laptop in
the future, not now. Deck classification (precon/custom/planning) is the
reason M5 exists: it directly serves the "what do I not need to buy"
question for planned decks.

- [x] **Classify decks as Precon, Custom, or Planning** — `Deck.type`, set
      at import, editable later. (#60)
- [x] **Section/filter the decks list by type** — Precon and Custom always
      shown as separate sections; Planning behind a togglable third
      section (off by default). (#61)
- [x] **Planning decks flag which cards you already own** — cross-checks a
      Planning deck's cards against every owned (precon/custom) deck,
      variant of the existing overlap-detection logic — the actual point
      of the classification above. (#62)
- [x] **Deck metadata: box color, sleeve color, archetype, auto-derived
      color identity** — also fixed a real enrichment bug found while
      testing this (Scryfall can return a card under different punctuation
      than the name queried, e.g. an apostrophe placement mismatch, which
      silently broke the lookup). (#63)
- [x] **Keyboard shortcuts for common actions** — `/` to search, `n` to log
      a game, `?` for a shortcuts help dialog. Verified via SSR only; the
      user should confirm the actual keydown behavior by hand (no headless
      browser available in the dev environment). (#64)

## M6 — Statistics

Scoped 2026-09-13, supersedes the "Stats & charts" idea below. Built on
`@tanstack/charts` (its React adapter is the `/react` subpath — not the
separate, older `@tanstack/react-charts` package; pre-1.0, pinned to
0.18.0).

- [x] **Statistics dashboard: games, win rate, most-played decks/pods** —
      new `/stats` page; aggregation logic extracted to a pure, unit-tested
      function (`src/lib/game-stats.ts`). (#65)
- [ ] **Collection-level stats: color identity spread, mana curve, decks
      gathering dust** — second, more exploratory batch of charts on the
      same page. (#66)

## M7 — UI/UX

Scoped 2026-09-13 (GitHub milestone renamed from "UI enhancement /
rework"), user's direction: "retro flat magic / wizard-like" styling.

- [ ] **Redesign decks list as a card grid with commander art** — replaces
      the current row list. (#67)
- [ ] **Persistent header/footer + cohesive visual theme** — de-duplicates
      the nav row currently copy-pasted across every route file, plus a
      real color palette/typography pass. (#68)
- [ ] **Migrate history table to TanStack Table** — sortable columns,
      `@tanstack/react-table`. (#69)
- [ ] **Unify deck and pod pickers into one typeable combobox** — the game
      dialog's deck field (and `SharedCardPicker`'s) becomes typeable like
      the pod field already is. (#70)

## Ship it (postponed, unmilestoned)

Deliberately not attached to a milestone right now. As of 2026-09-13 the
plan is to self-host on a home-server laptop, but "in a close future" —
not yet, so this stays deprioritized while Improvements/Statistics/UI-UX
are worked through. The issues stay open and tracked, just without a
milestone:

- **Dockerfile / deployment docs** — pick and document the actual
  self-hosting target (see [STACK.md](STACK.md#open-items-to-confirm-once-we-start-scaffolding)).
- **Backup story** — document (or script) copying the SQLite file.
- **README pass** — update root README with real setup/usage instructions
  once the app exists.

## Suggested GitHub labels

`type:feature`, `type:bug`, `type:chore`, `type:docs`, `area:import`,
`area:shared`, `area:ui`, `area:infra`, `area:history`, `area:decks` (new,
for Improvements), `area:stats` (new, for Statistics).
