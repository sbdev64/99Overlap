# Roadmap

Milestones and their issue breakdown. Each issue below is meant to become an
actual GitHub issue (title as written, description = acceptance criteria).
Update this file when scope changes — it should stay the plan of record even
before/alongside GitHub issues existing.

## M0 — Project scaffolding

Goal: an empty-but-real app skeleton with the tooling from
[STACK.md](STACK.md) wired up, deployable to "hello world," CI green.

- [ ] **Scaffold TanStack Start app with Bun** — init project, TypeScript
      strict mode, basic route renders. `bun run dev` works.
- [ ] **Wire up Drizzle + SQLite** — schema file for `Deck`/`Card`/`DeckCard`
      (per [PRODUCT.md](PRODUCT.md#core-domain-model)), `drizzle-kit`
      migration generated and applied to a local `.sqlite` file.
- [ ] **Add Tailwind v4 + shadcn/ui** — base layout renders with at least
      one shadcn component.
- [ ] **Add Biome + Lefthook + commitlint** — `bun run lint`/`format`
      scripts; pre-commit hook runs Biome + typecheck; commit-msg hook
      enforces Conventional Commits.
- [ ] **CI workflow** — GitHub Actions: install, typecheck, lint, build on
      every PR.

## M1 — Import, store, and see overlaps (MVP)

Goal: paste a decklist, see it saved, see shared cards highlighted across
decks. This is the first genuinely useful version.

- [ ] **Decklist text parser** — parse Moxfield's plain-text export into
      commander + mainboard (quantity, name) pairs. Unit-tested against a
      couple of real pasted exports.
- [ ] **Import deck form** — paste box → creates a `Deck` + `DeckCard` rows,
      reusing existing `Card` rows by name.
- [ ] **Deck list page** — shows all saved decks (name, commander).
- [ ] **Deck detail page** — shows a deck's full card list.
- [ ] **Overlap detection** — query/derive which cards appear in >1 deck;
      highlight them on the deck detail page.
- [ ] **Edit/re-import a deck** — re-paste updates an existing deck's cards
      without touching other decks' data.
- [ ] **Delete a deck** — with confirmation; cascades `DeckCard` rows only.

## M2 — Staple tracking (the core mission)

Goal: mark a card as a staple and always know what to physically move.

- [ ] **Mark card as staple** — clicking a highlighted card in a deck view
      opens a picker to set `isStaple = true` and choose `currentDeckId`.
- [ ] **Unmark a staple** — revert `isStaple`, clear `currentDeckId`.
- [ ] **"Missing staples" panel on deck detail page** — lists staples this
      deck needs whose `currentDeckId` points elsewhere, naming that deck.
- [ ] **"Move staple here" action** — one click sets `currentDeckId` to the
      currently viewed deck.
- [ ] **Handle deleting a deck that holds a staple** — staple becomes
      unassigned and is flagged for the user across the app (not silently
      dropped).

## M3 — Polish

- [ ] **Scryfall enrichment** — background/on-import lookup filling in
      `scryfallId`, mana cost, type line, image URL; rate-limited per
      Scryfall's guidance.
- [ ] **Card images in deck view** — use enrichment data once available.
- [ ] **Group cards by type in deck view** — classify each card (Creature,
      Planeswalker, Instant, Sorcery, Artifact, Enchantment, Land) from its
      `typeLine` and group the deck's card list by type. Depends on Scryfall
      enrichment above. See docs/PRODUCT.md#8-card-type-classification-in-deck-view-future-not-needed-yet.
- [ ] **Search/filter across decks** — find a card by name across all saved
      decks (useful before even opening a specific deck).
- [ ] **All-staples overview page** — one place listing every staple and its
      current deck, independent of any single deck view.

## M4 — Ship it

- [ ] **Dockerfile / deployment docs** — pick and document the actual
      self-hosting target (see [STACK.md](STACK.md#open-items-to-confirm-once-we-start-scaffolding)).
- [ ] **Backup story** — document (or script) copying the SQLite file.
- [ ] **README pass** — update root README with real setup/usage
      instructions once the app exists.

## Suggested GitHub labels

`type:feature`, `type:bug`, `type:chore`, `type:docs`, `area:import`,
`area:staples`, `area:ui`, `area:infra`.
