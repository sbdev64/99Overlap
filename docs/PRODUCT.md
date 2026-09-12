# Product Context

This is the durable source of truth for *what 99Overlap is and why it works
the way it does*. When in doubt about a product decision, check here first;
update this file whenever a decision changes instead of letting it drift out
of sync with the code.

## Mission

The user plays multiple Commander decks and owns single physical copies of
some expensive/powerful cards (e.g. Smothering Tithe). Those cards get moved
by hand between decks before each game. It's easy to forget where a card
currently lives, or to build/edit a deck on Moxfield assuming a card is
available when it's actually sitting in a different deck's box.

99Overlap's job: import decklists, detect cards shared across decks, and let
the user track — per shared card — whether they own multiple copies (no
action needed) or only one physical copy that moves around (a "staple",
which needs active location tracking). The end goal is always answering:
**"what do I physically need to move before I play this deck?"**

This is a single-user personal tool, not a multi-tenant product. No auth,
no sharing between users, no multi-tenancy concerns.

## Core domain model

```
Deck
  id
  name
  commanderName(s)        -- display only, from the parsed decklist
  colorIdentity            -- derived, display only
  sourceText               -- last raw pasted decklist (kept for re-import/diff)
  createdAt / updatedAt

Card                       -- one row per unique card NAME, shared across decks
  id
  name                     -- canonical name, used as the de-dupe key
  scryfallId               -- nullable, filled in by enrichment lookup
  manaCost / typeLine / colorIdentity / imageUrl   -- nullable, from Scryfall
  isStaple                 -- bool, user-set
  currentDeckId            -- nullable FK -> Deck; only meaningful when isStaple

DeckCard                   -- join table: which cards are in which deck
  deckId
  cardId
  quantity
  board                    -- 'commander' | 'mainboard' (see "Boards" below)
```

Cards are matched **by exact name** across decks (case-insensitive, trimmed).
Two decks each containing "Sol Ring" reference the *same* `Card` row.

### Boards: what counts toward overlap

Moxfield decklists can contain multiple sections (commander, mainboard,
maybeboard, sideboard, companion, tokens, etc). Only `commander` and
`mainboard` entries count toward overlap detection and staple tracking —
those are the 100 cards actually in the deck. Maybeboard/sideboard entries
are parsed but ignored for overlap purposes (or not stored at all for v1 —
decide when building the parser; note the final call here once made).

## Feature spec

### 1. Import a deck

User pastes a Moxfield text export into a form. The app parses it into a
commander + list of (quantity, card name) pairs, creates/reuses `Card` rows
by name, creates a `Deck` row, and populates `DeckCard`. The raw pasted text
is stored on the deck so future re-imports can diff against it.

Expected input format (Moxfield's plain-text export), roughly:

```
1 Sol Ring
1 Arcane Signet
...

Commander
1 Atraxa, Grand Unifier
```

The parser must be tolerant of Moxfield's exact section headers and minor
formatting variance — treat the real export format as the spec once we
paste a real sample during implementation, not this sketch.

### 2. Update a deck

Re-pasting a decklist for an existing deck replaces its `DeckCard` rows
(diffed against the stored `sourceText` where useful) without touching the
`Card` rows for cards it shares with other decks, and without disturbing
`isStaple`/`currentDeckId` on any `Card`.

### 3. Delete a deck

Deletes the `Deck` and its `DeckCard` rows. `Card` rows persist (other decks
may still reference them). If a deleted deck was a staple's `currentDeckId`,
that staple becomes "unassigned" and should be flagged for the user to set a
new location.

### 4. Overlap detection

A card "overlaps" when it appears (in `commander`/`mainboard` boards) in more
than one deck. When viewing a deck, overlapping cards are visually
highlighted in the card list.

### 5. Marking a staple

Clicking a highlighted (overlapping) card lets the user mark it `isStaple =
true` and pick which deck currently physically holds it (`currentDeckId`).
This is a statement of physical reality ("I own exactly one of these"), not
a deck-building rule — the app never removes the card from any deck's list.

### 6. Tracking staple location / the "what do I move" view

Each deck view shows a "missing staples" section: staples that appear in
this deck's list but whose `currentDeckId` points elsewhere, labeled with
which deck currently has them. A "move here" action updates `currentDeckId`
to the deck being viewed. This is the feature that fulfills the app's
mission — it should be the most prominent thing on a deck's page, not
buried.

Non-staple overlaps stay highlighted but don't get move-tracking UI — the
assumption is the user owns multiple physical copies, so no action is ever
needed.

### 7. Card metadata enrichment (nice-to-have, not blocking v1)

Look up parsed card names against the [Scryfall API](https://scryfall.com/docs/api)
to fill in `scryfallId`, mana cost, type line, color identity, and card
image. Useful for a nicer UI (images, color-coded mana costs) but not
required for the core overlap/staple logic, which only needs card names.
Scryfall asks for polite rate-limiting (~50-100ms between requests) and has
a bulk-data download for offline lookups if we end up doing this a lot.

### 8. Card type classification in deck view (future, not needed yet)

The user wants each deck view to group/classify its cards by primary type —
Creature, Planeswalker, Instant, Sorcery, Artifact, Enchantment, Land.
Derivable from `typeLine` (already on `Card`, filled in by Scryfall
enrichment in feature 7 above) by parsing the type(s) before the em dash,
e.g. "Legendary Creature — Phyrexian Angel" → Creature. Depends on feature 7
having run first. Noted here for later; not scheduled as blocking work.

## Explicitly out of scope (for now)

- Multi-user / auth / sharing decks with other people.
- Live Moxfield API fetching (paste-only for v1; see decision log).
- Deck legality checking, price tracking, or any deck-building assistance.
- Anything beyond Commander (format is assumed fixed).

## Decision log

| Date | Decision | Why |
|------|----------|-----|
| 2026-09-12 | Self-hosted web app, not a desktop app | User wants it reachable from a browser (e.g. phone at the table), not tied to one machine. |
| 2026-09-12 | Full staple location tracking, not just a flag | A flag alone doesn't answer "what do I move" — the stated mission requires knowing *where* the card currently is. |
| 2026-09-12 | Paste-only Moxfield import for v1 | Moxfield's fetch API is unofficial/undocumented; paste always works and unblocks everything else. Live fetch is a candidate v2 enhancement. |
| 2026-09-12 | Card identity = exact name match | Simplest correct rule for Commander singleton decks; no card appears twice in one deck under normal rules, so name is a safe de-dupe key. |
| 2026-09-12 | Unit tests use `bun test` instead of Vitest (revises docs/STACK.md's original pick) | We're already Bun-native everywhere (runtime, `bun:sqlite`); `bun test` is Jest-compatible and needs no extra dependency, so it's a strictly smaller/faster choice than adding Vitest. |
| 2026-09-12 | Moxfield decklist format confirmed by cross-checking multiple independent open-source parsers (Moxfield itself blocks non-browser requests, so no first-party sample was fetchable) | Card lines are `<qty>[x] <name>[ (SETCODE) collector#]`; sections are standalone header lines (`Commander`, `Deck`/`Mainboard`, `Sideboard`, `Maybeboard`, `Companion`, case-insensitive, optional trailing colon) each followed by their cards until the next header or blank-line break. |

Add a row here whenever a product decision is made or changed — this table
is more valuable than the code history for answering "why does it work this
way."
