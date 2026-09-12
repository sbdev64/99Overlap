# Stack

Target shape: self-hosted TypeScript web app, single user, SQLite-backed,
reachable from a browser (including a phone at the table). Bias is toward
the current (2026) leading edge of the TS ecosystem, as requested — where
that trades off against stability, the trade-off is called out explicitly.

## Recommended stack

| Layer | Choice | Why this one |
|---|---|---|
| Runtime & package manager | **Bun** | Single tool replaces Node + npm/pnpm + ts-node. Runs TS directly (no build step for the server), has a built-in test runner, and a built-in SQLite driver (`bun:sqlite`) with zero native-module install pain. This is the boldest pick here — see trade-off note below. |
| Full-stack framework | **TanStack Start** (React 19, Vite-based, file-based routing via TanStack Router) | Fully type-safe routing and server functions with no codegen step, built on Vite so it's fast in dev. This is the current cutting edge for TS-first React devs — more type-safety-oriented than Next.js's App Router, without needing to add tRPC on top (server functions already give end-to-end type-safe client↔server calls). |
| Database | **SQLite** via `bun:sqlite` | Exactly the "lightweight" storage requested: one file on disk, zero external services, trivial backups (copy the file). |
| ORM / migrations | **Drizzle ORM** + `drizzle-kit` | SQL-shaped, fully typed, lightweight, no code-gen step (unlike Prisma), first-class SQLite support including `bun:sqlite`. The default modern choice when Prisma isn't wanted. |
| Validation | **Zod** | Validates pasted decklist text and form input; pairs naturally with Drizzle and TanStack Start server functions for end-to-end type safety. |
| Styling | **Tailwind CSS v4** | CSS-native config (no `tailwind.config.js` needed), fastest build engine yet, still the dominant utility-CSS approach. |
| UI components | **shadcn/ui** | Not a dependency — components are copied into the repo, so they're fully ours to edit. Built on Radix primitives (accessible by default). Current default for anyone building a custom UI quickly in React. |
| Client data/cache | **TanStack Query** | For mutations like "mark staple" / "move staple here" that want optimistic updates; pairs with TanStack Start/Router. |
| Linting/formatting | **Biome** | Single Rust-based tool replacing ESLint + Prettier; much faster, one config file. |
| Testing | **Vitest** (unit) + **Playwright** (e2e, once there's UI worth covering end-to-end) | Current standard pairing for Vite-based apps. |
| Git hooks | **Lefthook** | Rust-based, faster and simpler config than Husky; runs Biome + typecheck + (later) commitlint on commit/push. |
| Commit linting | **commitlint** (conventional-commit config) | Enforces the Conventional Commits format described in [CONTRIBUTING.md](../CONTRIBUTING.md). |
| External data | **Scryfall API** | Free MTG card database for enrichment (images, mana cost, color identity) once decks are stored — see [PRODUCT.md](PRODUCT.md#7-card-metadata-enrichment-nice-to-have-not-blocking-v1). |

## Trade-off called out: Bun as the runtime

Bun is the least battle-tested piece here. It's matured a lot, but versus
Node it still has a smaller ecosystem-compatibility surface and less
hosting-provider ubiquity. Given this app is self-hosted by the user (not
deployed to a platform with opinions about the runtime), that risk is low —
but if anything in the stack turns out to be Bun-incompatible, the fallback
is: Node.js + `libsql`/`better-sqlite3` as the SQLite driver, everything else
in the table unchanged. Flag this in `docs/PRODUCT.md`'s decision log if we
ever make that switch.

## Alternatives considered and why not (for now)

- **Next.js (App Router)** instead of TanStack Start — more mainstream,
  bigger ecosystem, huge amount of hosting/deployment tooling. Passed over
  only because TanStack Start's routing/server-function type safety is a
  better fit for "most cutting edge" and there's no multi-region/edge
  deployment need here that would favor Next.js specifically. If TanStack
  Start friction shows up early, Next.js is the safe swap-in.
- **Prisma** instead of Drizzle — still extremely popular, but Drizzle is
  lighter, has no separate codegen/engine binary, and is the more current
  choice for new TS projects that don't need Prisma's broader database
  support.
- **tRPC** — unnecessary here: TanStack Start's server functions already
  give typed client↔server calls without an extra RPC layer.
- **Turso/libSQL** (hosted SQLite with embedded replicas) — worth
  revisiting *only* if the user wants to access the deck data from more than
  one machine/location beyond a single self-hosted instance. Not needed for
  v1; local SQLite file is simpler and this is explicitly a single-user tool.
- **Electron** — much heavier than needed and moot anyway since the user
  chose a web app over a desktop app.

## Open items to confirm once we start scaffolding

- Deployment target for "self-hosted" (a Docker container? bare Bun process
  behind a reverse proxy? a small VPS?) — not needed to start building, but
  needed before v1 ships. Track as a roadmap item.
