# 99Overlap

Find cards shared across your Magic: The Gathering Commander decks.

99Overlap lets you import your Commander decks from Moxfield and see which cards are used across multiple decks.

## Features

- Import Commander decks from Moxfield
- Save and manage multiple decks
- Find cards shared across decks
- See which decks contain each card

## Development

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev
```

Routes live under `src/routes` (file-based routing via TanStack Router);
`src/routeTree.gen.ts` is generated, don't edit it by hand.

## Status

🚧 Work in progress — currently at the planning/scaffolding stage.

## Docs

- [docs/PRODUCT.md](docs/PRODUCT.md) — mission, domain model, feature spec, decision log
- [docs/STACK.md](docs/STACK.md) — tech stack and rationale
- [docs/ROADMAP.md](docs/ROADMAP.md) — milestones and issue breakdown
- [CONTRIBUTING.md](CONTRIBUTING.md) — commit/branch/PR conventions
