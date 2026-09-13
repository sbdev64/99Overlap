# CLAUDE.md

Orientation for Claude Code sessions working on **99Overlap**. Read this first;
it points to the deeper docs instead of repeating them.

## What this project is

A personal tool that imports MTG Commander decklists (pasted from Moxfield),
stores them, and finds cards that appear in more than one deck. Its actual
purpose is solving a real-world logistics problem: the user owns single
copies of some expensive cards (e.g. Smothering Tithe) and moves them
physically between decks before playing. The app should always be able to
answer: *"which physical cards do I need to move before I play deck X?"*

Full product context, domain model, and feature spec: [docs/PRODUCT.md](docs/PRODUCT.md)
Stack choice and rationale: [docs/STACK.md](docs/STACK.md)
Milestones and issue breakdown: [docs/ROADMAP.md](docs/ROADMAP.md)
Commit/branch/PR conventions: [CONTRIBUTING.md](CONTRIBUTING.md)

## Key decisions already made (don't re-litigate without asking)

- **Self-hosted web app**, not a desktop app. Runs as a small server + browser UI.
- **Full shared-card location tracking**, not just a flag. A card marked
  "shared" has a "current deck" pointer the user updates manually when they
  move the physical card. Deck views must surface "missing shared cards"
  (shared cards the deck needs that currently live in another deck). Called
  "staple" in earlier work — renamed per user feedback since "staple"
  already means something else in MTG (a generically powerful/commonly-run
  card); "shared" describes the actual mechanic.
- **Import is paste-only for v1.** No live Moxfield API fetching yet (that's
  a possible later enhancement, not in scope now).
- Runtime/stack: Bun + TanStack Start + Drizzle ORM + SQLite (via
  `bun:sqlite`) + Tailwind v4 + shadcn/ui. See [docs/STACK.md](docs/STACK.md)
  for the full rationale and alternatives considered.

## Working conventions

- TypeScript everywhere, strict mode on.
- Conventional Commits for every commit (`feat:`, `fix:`, `chore:`, etc.),
  referencing the issue number when one exists (`feat(import): parse
  Moxfield text export (#3)`). Details in [CONTRIBUTING.md](CONTRIBUTING.md).
- Every non-trivial change should trace back to a GitHub issue; open one if
  it doesn't exist yet before starting work.
- Prefer editing/extending `docs/PRODUCT.md` over letting domain knowledge
  live only in code comments or chat — that file is the source of truth for
  "why" the app behaves a certain way.
- **In any `createServerFn` handler, import `@/db/client` dynamically inside
  the handler** (`const { db } = await import('@/db/client')`), never as a
  top-level `import`. `client.ts` opens the SQLite connection as a
  module-scope side effect via `bun:sqlite`, which doesn't exist in the
  browser. A top-level import gets pulled into the client-side split of a
  server function file and crashes on page load — this actually happened
  (see the `fix: dynamically import db in server functions` commit). Keep
  any other module-scope code in that file (helper functions, types) from
  referencing `db` too, or the same leak reappears through them.

## Status

M0 and M1 (paste-import, parser, list/detail pages, overlap detection,
edit/delete) are done end-to-end. M2 (shared-card tracking) is underway. See
[docs/ROADMAP.md](docs/ROADMAP.md) for what's left.
