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

## M3 — Polish

- [ ] **Scryfall enrichment** — background/on-import lookup filling in
      `scryfallId`, mana cost, a numeric mana value (`cmc`), type line, color
      identity, image URL; rate-limited per Scryfall's guidance.
- [ ] **Card images in deck view** — use enrichment data once available.
- [ ] **Search/filter across decks** — find a card by name across all saved
      decks (useful before even opening a specific deck).
- [ ] **All-shared-cards overview page** — one place listing every shared
      card and its current deck, independent of any single deck view.
- [ ] **Group/sort cards by type, color identity, or mana value in deck
      view** (Moxfield-like) — a control to switch the deck card list
      between three groupings: by primary type (default; Creature,
      Planeswalker, Instant, Sorcery, Artifact, Enchantment, Land, parsed
      from `typeLine`), by color identity, or by mana value, ascending.
      Scheduled last since it depends on Scryfall enrichment above for
      `typeLine`/`colorIdentity`/`cmc`. See
      docs/PRODUCT.md#8-card-grouping-and-sort-in-deck-view-m3-moxfield-like.

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

## Future milestones (not yet scheduled)

Noted so they aren't lost, but deliberately not ordered yet — the user
wants to use the product through M4 before deciding what's next.

- **UI enhancement / rework** — general UI/UX polish once more of the app
  exists to react to. GitHub milestone created, not yet scoped.
- **Stats & charts** — games per year/month, most-played decks, win rate,
  etc., built on top of M4's game log.
- **Deck metadata / collection tracker** — a second thing the user
  currently tracks in the same Google Sheet: per-deck info beyond the
  decklist itself (commander(s), build status/"planned" decks that don't
  exist yet, colors, box color, sleeve color, archetype). Not scoped yet.

## Ship it (postponed, unmilestoned)

Deliberately not attached to a milestone right now — more milestones are
coming before shipping is revisited, and guessing a milestone number for
this today isn't worth it. The issues stay open and tracked, just without a
milestone:

- **Dockerfile / deployment docs** — pick and document the actual
  self-hosting target (see [STACK.md](STACK.md#open-items-to-confirm-once-we-start-scaffolding)).
- **Backup story** — document (or script) copying the SQLite file.
- **README pass** — update root README with real setup/usage instructions
  once the app exists.

## Suggested GitHub labels

`type:feature`, `type:bug`, `type:chore`, `type:docs`, `area:import`,
`area:shared`, `area:ui`, `area:infra`, `area:history` (new, for M4).
