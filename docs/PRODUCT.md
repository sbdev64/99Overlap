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
action needed) or only one physical copy that moves around (marked
"shared", which needs active location tracking). The end goal is always
answering: **"what do I physically need to move before I play this deck?"**

This is a single-user personal tool, not a multi-tenant product. No auth,
no sharing between users, no multi-tenancy concerns.

## Core domain model

```
Deck
  id
  name
  type                     -- 'precon' | 'custom' | 'planning' (see feature 10)
  commanderName(s)        -- display only, from the parsed decklist
  colorIdentity            -- derived, display only
  sourceText               -- last raw pasted decklist (kept for re-import/diff)
  commanderCount           -- 1, or 2 for Partner/Background decks (see below)
  createdAt / updatedAt

Card                       -- one row per unique card NAME, shared across decks
  id
  name                     -- canonical name, used as the de-dupe key
  scryfallId               -- nullable, filled in by enrichment lookup
  manaCost / typeLine / colorIdentity / imageUrl   -- nullable, from Scryfall
  isShared                 -- bool, user-set
  currentDeckId            -- nullable FK -> Deck; only meaningful when isShared

DeckCard                   -- join table: which cards are in which deck
  deckId
  cardId
  quantity
  board                    -- 'commander' | 'mainboard' (see "Boards" below)

Game                       -- one row per game logged (see feature 9)
  id
  date                     -- user-picked date the game was played
  deckId                   -- nullable FK -> Deck; null if that deck was later deleted
  deckName                 -- denormalized snapshot of Deck.name at log time,
                              kept even if the deck is renamed/deleted later
  pod                      -- free text (which regular playgroup), autocompleted
                              from prior entries, not a managed lookup table
  won                      -- bool
  createdAt / updatedAt
```

Cards are matched **by exact name** across decks (case-insensitive, trimmed).
Two decks each containing "Sol Ring" reference the *same* `Card` row.

### Boards: what counts toward overlap

Moxfield decklists can contain multiple sections (commander, mainboard,
maybeboard, sideboard, companion, tokens, etc). Only `commander` and
`mainboard` entries count toward overlap detection and shared-card tracking
— those are the 100 cards actually in the deck. Maybeboard/sideboard entries
are parsed but ignored for overlap purposes (or not stored at all for v1 —
decide when building the parser; note the final call here once made).

## Feature spec

### 1. Import a deck

User pastes a Moxfield text export into a form. The app parses it into
commander(s) + a list of (quantity, card name) pairs, creates/reuses `Card`
rows by name, creates a `Deck` row, and populates `DeckCard`. The raw pasted
text is stored on the deck so future re-imports can diff against it.

Expected input format (the user's actual Moxfield copy-paste): a flat list
with no section headers, where **the first card line is always the
commander**:

```
1 Obeka, Splitter of Seconds (OTJ) 222
1 Aarakocra Sneak (CLB) 54
1 Aether Tunnel (M19) 43
```

The parser (`src/lib/decklist-parser.ts`) also tolerates an explicit
`Commander` header section, if one is ever present, in which case that takes
priority over the first-card rule.

#### 1b. Partner/Background (two-commander) decks

Partner and Background decks paste the same way, just with **two**
commander lines up front (confirmed against a real example: Kediss,
Emberclaw Familiar / Malcolm, Keen-Eyed Navigator). There's no way to tell
from the text alone whether line 2 is a second commander or the first
mainboard card, so this is resolved with explicit user input rather than
guessing: a "This deck has two commanders (Partner/Background)" checkbox on
both the import and edit forms sets `Deck.commanderCount` (1 or 2), which is
passed to the parser so it knows how many leading lines to treat as
commanders. Defaults to 1, so ordinary single-commander decks are
unaffected. See the decision log.

### 2. Update a deck

Re-pasting a decklist for an existing deck replaces its `DeckCard` rows
(diffed against the stored `sourceText` where useful) without touching the
`Card` rows for cards it shares with other decks, and without disturbing
`isShared`/`currentDeckId` on any `Card`.

### 3. Delete a deck

Deletes the `Deck` and its `DeckCard` rows. `Card` rows persist (other decks
may still reference them). If a deleted deck was a shared card's
`currentDeckId`, that card becomes "unassigned" and should be flagged for
the user to set a new location.

### 4. Overlap detection

A card "overlaps" when it appears (in `commander`/`mainboard` boards) in more
than one deck. When viewing a deck, overlapping cards are visually
highlighted in the card list.

### 5. Marking a shared card

Clicking a highlighted (overlapping) card lets the user mark it `isShared =
true` and pick which deck currently physically holds it (`currentDeckId`).
This is a statement of physical reality ("I own exactly one of these"), not
a deck-building rule — the app never removes the card from any deck's list.

### 6. Tracking a shared card's location / the "what do I move" view

Each deck view shows a "missing shared cards" section: shared cards that
appear in this deck's list but whose `currentDeckId` points elsewhere,
labeled with which deck currently has them. A "move here" action updates
`currentDeckId` to the deck being viewed. This is the feature that fulfills
the app's mission — it should be the most prominent thing on a deck's page,
not buried.

Overlapping cards that aren't marked shared stay highlighted but don't get
move-tracking UI — the assumption is the user owns multiple physical
copies, so no action is ever needed.

### 7. Card metadata enrichment (M3)

Look up parsed card names against the [Scryfall API](https://scryfall.com/docs/api)
to fill in `scryfallId`, mana cost, a numeric mana **value** (`cmc`, needed
for feature 8's sort — not derivable from the `manaCost` string alone since
that's a symbol string like `{2}{G}{G}`), type line, color identity, and
card image. Useful for a nicer UI (images, color-coded mana costs, type/
color/mana-value grouping) but not required for the core overlap/
shared-card logic, which only needs card names. Scryfall asks for polite
rate-limiting (~50-100ms between requests) and has a bulk-data download for
offline lookups if we end up doing this a lot.

### 8. Card grouping and sort in deck view (M3, Moxfield-like)

Deck detail page groups its cards into sections and offers a control to
switch the grouping:

- **By type** (default) — Creature, Planeswalker, Instant, Sorcery,
  Artifact, Enchantment, Land, parsed from `typeLine` (the text before the
  em dash, e.g. "Legendary Creature — Phyrexian Angel" → Creature).
- **By color identity** — one section per color-identity combination present
  in the deck (using `Card.colorIdentity`), e.g. "White", "Blue/Black",
  "Colorless".
- **By mana value** — one section per numeric `cmc`, ascending (0, 1, 2, …).

Within any grouping, cards are sorted alphabetically inside each section.
Depends on feature 7 having populated `typeLine`/`colorIdentity`/`cmc` first.

### 9. Game history log (M4)

Replaces the user's manual Google Sheet game log. A `/history` page lists
every logged game (date, deck, pod, won), newest first, with add/edit/delete.
Two purposes:

1. **Cross-check for shared-card tracking.** Deck pages show "last played:
   \<date\>" so the user can sanity-check the manually-tracked
   `currentDeckId` against reality (e.g. "deck 3 was played most recently
   among the decks sharing this card, so it tracks that it's there now").
   This is purely informational — logging a game **never** writes to
   `isShared`/`currentDeckId`. Decided against auto-linking them: a
   backfilled historical entry (not the most recent game overall) could
   otherwise silently make the shared-card tracking wrong, which matters
   because the user plans to backfill years of past games from their
   spreadsheet.
2. **Groundwork for a future stats/charts milestone** (games per
   year/month, most-played decks, win rate) — not built in M4 itself.

`pod` (the user's regular playgroups — they play with two different regular
groups) is a plain text field, not a managed entity: the form suggests
previously-used values as autocomplete, but there's no separate "manage
pods" screen. Simpler, and typos just become a distinct pod name rather
than corrupting a shared lookup table — acceptable for a single-user tool.

Deleting a `Deck` sets `Game.deckId` to null (`onDelete: 'set null'`,
consistent with how `Card.currentDeckId` already behaves) rather than
deleting the game history — a played game is a historical fact independent
of whether the deck still exists in the app. `Game.deckName` is a
denormalized snapshot of the deck's name at log time (same pattern as
`Deck.commanderName`), so a deleted or renamed deck doesn't blank out past
history rows.

### 10. Deck classification and Planning decks' already-owned check (M5)

Every `Deck` has a `type`: `precon`, `custom`, or `planning`. The first two
are decks the user physically owns; `planning` is a decklist for something
they want to build but haven't bought yet. The decks list groups Precon and
Custom into always-visible sections, with Planning behind a togglable
third section (off by default).

The actual reason for the classification: a Planning deck's card list
flags each card as either already owned (linking to the owned deck(s) that
have it) or needing to be bought. "Owned" means the card appears in at
least one `precon`/`custom` deck — other Planning decks never count as
owned, even toward each other. This is a scoped variant of the overlap
detection in feature 4 above: same underlying "which decks have this
card" query, just partitioned by deck type instead of surfacing every
deck indiscriminately.

### 11. Statistics dashboard (M6)

A `/stats` page built on `@tanstack/charts` (not `@tanstack/react-charts` —
that's a separate, older package; the current one's React adapter lives at
the `@tanstack/charts/react` subpath, per its own docs). Reads the `Game`
log from feature 9, aggregated server-side in `src/lib/game-stats.ts`
(pure function, unit-tested) so the browser never needs the raw
row-by-row reduction logic, only the four already-summarized shapes.

Four charts, all built from a single `GameStats` aggregate:
- **Games logged over time** — line chart, one point per month
- **Most-played decks** — bar chart, count of games, descending
- **Win rate per deck** — bar chart, same deck order as most-played so the
  two read consistently side by side
- **Most-played pods** — bar chart, count of games, descending

Deck names are grouped by their denormalized `Game.deckName` snapshot
(never re-keyed to the current `Deck.name`) since decks can't be renamed
in this app — see feature 9's decision to snapshot the name at log time.
Shows an explicit empty state ("no games logged yet") instead of rendering
charts with zero data.

### 12. Collection-level stats (M6)

A second section on `/stats`, scoped to owned decks (`precon`/`custom` —
Planning decks aren't physically built, so they're excluded from all
three insights here, same reasoning as feature 10's already-owned check).
Aggregation is pure and unit-tested (`src/lib/collection-stats.ts`),
fed by a dedicated `getCollectionStats` server function.

- **Color identity across owned decks** — bar chart, decks grouped by
  `Deck.colorIdentity` (feature 10's auto-derived field) via the shared
  `colorIdentityLabel` formatter.
- **Mana curve across owned decks** — bar chart, summing `DeckCard.quantity`
  by `Card.cmc` across every owned deck's cards (commanders included) —
  a card owned in two decks counts twice, since each deck-slot needs its
  own physical copy.
- **Gathering dust** — a plain list (not a chart), not a ranking: decks
  never played, or not played in 90+ days, dustiest (never-played) first.
  Reuses the `MAX(games.date)` per-deck pattern from feature 9's
  "last played" but excludes Planning decks and applies the threshold.

All three degrade gracefully when the underlying enrichment
(`colorIdentity`/`cmc`) hasn't run yet for a card — it just falls into an
"Unknown" bucket rather than being dropped or crashing the aggregation.

### 13. Persistent header/footer and visual theme (M7)

Every route used to repeat its own row of nav `<Link>`s — copy-pasted
across six files. Replaced with `SiteHeader`/`SiteFooter`, rendered once
from `__root.tsx` so they wrap every page, including any future one. The
header has a fixed set of links to every page in the app (Import, Decks,
Search, Shared, History, Statistics) — a `Sheet` drawer on narrow screens,
a horizontal row on wider ones — plus a wordmark link back to `/`. Uses
TanStack Router's `activeProps`/`activeOptions` for current-page
highlighting rather than anything hand-rolled.

Visual theme ("retro flat magic," user's direction): parchment/ink color
tokens replace the shadcn default grayscale palette (light and dark both
redefined, not just light), a `Cinzel` display font for headings via
`font-display`, and a small five-color mana-color strip (`ManaStrip`,
plain flat color swatches, no gradients/textures) under the header and
above the footer as the one deliberately "wizard-like" flourish. Kept
flat and minimal rather than skeuomorphic per the issue's explicit
constraint.

### 14. Deck list as a card grid (M7)

The decks list renders each deck as a card (image + name + commander +
last-played) in a responsive grid, not a text row — `DeckSummary` now
carries `commanderImageUrl` (the first commander's Scryfall art, from
`listDecks`; for Partner/Background decks, whichever commander card has
the lower `id`, a fine simplification for a list thumbnail). Falls back
to a plain `ImageOff` icon tile — never a broken `<img>` — when the
commander hasn't been enriched yet (#18) or wasn't found on Scryfall.

The page widens itself beyond the app's normal ~42rem content column via
an inline `--main-width` CSS custom property the shared `main` rule reads
(`min(var(--main-width, 42rem), 100% - 2rem)`) — a page-local override
point other wide pages can reuse later instead of duplicating the whole
layout rule.

### 15. History table on TanStack Table (M7)

The `/history` table is now driven by `@tanstack/react-table` v9 instead of
a hand-rolled `<table>`. v9 changed significantly from the more commonly
documented v8: `useReactTable` became `useTable`, and row-model features
(sorting, etc.) are opt-in via `tableFeatures()` rather than bundled —
confirmed against the real v9 docs before writing any code, not assumed
from prior v8 familiarity. Date, Deck, Pod, and Won columns are sortable;
the Actions column (Edit/Delete, unchanged from before) isn't. Default
(unsorted) order still matches the server's `ORDER BY date DESC, id DESC`.

## Explicitly out of scope (for now)

- Multi-user / auth / sharing decks with other people.
- Live Moxfield API fetching (paste-only for v1; see decision log).
- Deck legality checking, price tracking, or any deck-building assistance.
- Anything beyond Commander (format is assumed fixed).

## Decision log

| Date | Decision | Why |
|------|----------|-----|
| 2026-09-12 | Self-hosted web app, not a desktop app | User wants it reachable from a browser (e.g. phone at the table), not tied to one machine. |
| 2026-09-12 | Full shared-card location tracking, not just a flag | A flag alone doesn't answer "what do I move" — the stated mission requires knowing *where* the card currently is. |
| 2026-09-12 | Paste-only Moxfield import for v1 | Moxfield's fetch API is unofficial/undocumented; paste always works and unblocks everything else. Live fetch is a candidate v2 enhancement. |
| 2026-09-12 | Card identity = exact name match | Simplest correct rule for Commander singleton decks; no card appears twice in one deck under normal rules, so name is a safe de-dupe key. |
| 2026-09-12 | Unit tests use `bun test` instead of Vitest (revises docs/STACK.md's original pick) | We're already Bun-native everywhere (runtime, `bun:sqlite`); `bun test` is Jest-compatible and needs no extra dependency, so it's a strictly smaller/faster choice than adding Vitest. |
| 2026-09-12 | Moxfield decklist format: user confirmed their actual paste is a flat list with **no section headers**, first card = commander | Superseded an earlier guess (built by cross-checking third-party parsers, since Moxfield itself blocks non-browser requests) that assumed an explicit `Commander:` header section. The parser now uses the first-card rule by default, but still honors an explicit `Commander` header if one is ever present, so both shapes work. Card lines are `<qty>[x] <name>[ (SETCODE) collector#]`. |
| 2026-09-12 | Partner/Background (two-commander) decks not yet handled by the decklist parser | User wasn't sure whether any of their decks use two commanders; shipping the single-commander (first-card) rule now and deferring this rather than guessing at a convention with no real example to check against. Revisit if a real deck needs it. |
| 2026-09-12 | Server functions must dynamically `import('@/db/client')` inside the handler, not at module scope | Discovered as a real bug (user hit it running the app in a browser): a top-level `import { db } from '@/db/client'` in a `createServerFn` file gets pulled into that file's client-side split and crashes on load, since `client.ts` opens `bun:sqlite` as a module-scope side effect that doesn't exist in the browser. See the convention note in CLAUDE.md. |
| 2026-09-13 | Renamed the "staple" concept to "shared" throughout (schema column `isStaple` → `isShared`, `markStaple` → `markShared`, docs, GitHub issues #13-#17, `area:staples` label → `area:shared`) | User feedback: "staple" already means something else in MTG (a generically powerful/commonly-played card, e.g. "Sol Ring is a staple"), which collided with what this app actually tracks — a single physical card shared and moved between decks. "Shared" describes the mechanic directly. Generic English use of "staple" describing a card's power level (e.g. in the mission blurb) was left alone; only the tracked-feature name changed. |
| 2026-09-13 | Partner/Background decks resolved via an explicit `commanderCount` field + checkbox, not further parser heuristics | Confirmed the real paste shape (two commander lines, no header) via a real example (#32). Since the parser genuinely cannot tell from the text alone whether line 2 is a second commander, the user chose explicit input over guessing: a checkbox on import/edit sets `Deck.commanderCount` (1 or 2), passed to `parseDecklist`. Closes out M1. |
| 2026-09-13 | Milestones restructured: M3 (Polish) unchanged, M4 retargeted from "Ship it" to "History", "Ship it" issues (#22-24) kept open but unmilestoned, new "UI enhancement / rework" milestone created but unscheduled | User wants two more milestones (History, then UI rework at some undecided point) before shipping is revisited; didn't want to guess a milestone number for "Ship it" today given more milestones are coming. |
| 2026-09-13 | Game history (`Game` entity) never writes to `isShared`/`currentDeckId` — purely informational, cross-checked by eye | Considered auto-updating a shared card's location from the most-recently-logged game among decks that share it, but rejected: the user plans to backfill years of historical games from a spreadsheet, and a backfilled (non-most-recent) entry could silently overwrite correct manual tracking. |
| 2026-09-13 | `Game.pod` is free text with autocomplete, not a managed Pod entity | Simpler for a single-user tool; no "manage pods" screen needed. Accepted trade-off: a typo creates a new distinct pod name rather than being caught by a lookup table. |
| 2026-09-13 | M4 closed; M3 (Polish) started. Deck-view grouping (formerly #27, "by type" only) expanded to a switchable by-type/by-color-identity/by-mana-value grouping, type as the default — Moxfield-like | User explicitly asked for the broader grouping when scoping M3. Since it needs `cmc` (mana value) which isn't derivable from the existing `manaCost` string, feature 7 (Scryfall enrichment) now also fetches that field. Scheduled last within M3 since it depends on enrichment (#18) landing first. |
| 2026-09-13 | M3 (Polish) closed — Scryfall enrichment, card image hover preview, cross-deck search, all-shared-cards overview, and type/color/mana-value deck grouping all shipped (#18, #19, #21, #20, #27) | Scryfall enrichment (#18) also lazily backfills any pre-existing deck's cards the first time its page is viewed, not just on new imports — otherwise decks imported before #18 shipped would never get images/type/color/mana data. Remaining open issues (#22-24 "Ship it", M3-deferred-nothing-left) stay unmilestoned; next milestone to pick up is user's call. |
| 2026-09-13 | Three new milestones scoped: Improvements (#60-64), Statistics (#65-66), UI/UX (#67-70, renamed from "UI enhancement / rework") | User's plan is to self-host on a home-server laptop "in a close future," not now — shipping stays deliberately postponed while these are worked through. `Deck.type` (precon/custom/planning, #60) activates the "deck metadata / collection tracker" idea noted back at M4: a Planning deck (wanted but not owned) can now be cross-checked against owned decks to show what doesn't need buying (#62) — the concrete reason classification was requested, not just a filter/label. |
| 2026-09-13 | Statistics milestone (#65-66) builds on `@tanstack/react-charts`, not a more mature charting library | User explicitly asked for a TanStack library to stay consistent with the rest of the stack (Router, Start, React Table for #69). Confirmed it's a real, actively published package (not abandoned) before committing to it in the issues, but it's pre-1.0 — expect some API churn when #65/#66 are picked up. |
| 2026-09-13 | UI/UX visual direction: "retro flat magic / wizard-like" (#68), not a generic redesign | User's explicit direction — parchment/ink tones, a fantasy-adjacent display font, mana-color accents; flat, not skeuomorphic. Bundled with de-duplicating the nav (currently copy-pasted across five route files) since both are "how the app is laid out," not new features. |
| 2026-09-13 | M5 (Improvements) closed same-day — deck classification, sectioned/filterable decks list, Planning decks' owned/need-to-buy check, deck metadata, keyboard shortcuts (#60-64) | Found and fixed a real bug while testing #63: `scryfall-enrich.ts` keyed lookup results by Scryfall's *returned* canonical name rather than the name actually queried, so any card where Scryfall's spelling differs in punctuation from the query (e.g. an apostrophe placed differently) silently never got enriched. Fixed by normalizing both sides before matching. Keyboard shortcuts (#64) could only be verified via SSR/build, not actual keydown behavior — no headless browser or DOM-testing setup in this environment; flagged for the user to confirm by hand. |
| 2026-09-13 | Statistics dashboard (#65) uses `@tanstack/charts` + its `/react` subpath, not the separately-published `@tanstack/react-charts` package | Initially installed `@tanstack/react-charts` since it matched the name from earlier planning, but its bundled types have no usage examples and no README. Fetched the actual TanStack Charts docs (quick-start, bar/line examples) and confirmed the current, documented React entry point is `@tanstack/charts/react` — a subpath of the core grammar-of-graphics package, not the older same-org package. Swapped before writing any chart code. Verified real SSR output (correct SVG geometry matching aggregated data) before considering the integration trustworthy, given the library is pre-1.0 and internally quite complex (dozens of composable mark/scale/transform modules). |
| 2026-09-13 | M6 (Statistics) closed same-day — collection-level stats (#66) scoped to owned (precon/custom) decks only, "gathering dust" rendered as a plain list rather than a chart | Planning decks aren't physically built, so counting them toward color identity spread or mana curve would misrepresent the actual collection — same exclusion logic as feature 10's already-owned check. "Gathering dust" is a ranking of decks, not really chart-shaped data (dates and deck links matter more than a bar's height), so it's a plain list with exact last-played dates, matching the issue's explicit "surfaced as a simple list" suggestion. |
| 2026-09-13 | Header nav (#68) lists every page explicitly (Import/Decks/Search/Shared/History/Statistics), not just a subset | User explicitly asked to "be able to access every page easily" while scoping M7 — the old per-page duplicated nav rows were also inconsistent about which links each page included (e.g. `/` never linked to itself). One shared header removes that drift entirely. |
| 2026-09-13 | Deck card grid (#67) shows the first commander's art for Partner/Background decks, not both | A list thumbnail only needs one representative image; picking a second-image variant (split thumbnail, etc.) wasn't worth the layout complexity for a personal single-user tool. The deck detail page still lists every commander individually. |
| 2026-09-13 | History table (#69) built against `@tanstack/react-table` v9's real API (`useTable` + opt-in `tableFeatures()`), not v8's more commonly-documented `useReactTable` | Installing the package pulled in v9, whose API changed substantially from v8 (most tutorials/examples online are still v8). Fetched the actual v9 quick-start/migration docs before writing any code rather than assuming v8 patterns would work — same discipline as the Charts library scare in M6. |

Add a row here whenever a product decision is made or changed — this table
is more valuable than the code history for answering "why does it work this
way."
