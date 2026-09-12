# Contributing

This is a personal project, but it's run with real repo hygiene so history
stays readable and easy to pick back up later.

## Workflow

1. Every non-trivial change starts from a GitHub issue (create one if it
   doesn't exist — use the templates under `.github/ISSUE_TEMPLATE/`).
2. Branch off `main`: `type/short-description`, e.g. `feat/deck-import-parser`
   or `fix/staple-picker-crash`.
3. Commit using Conventional Commits (below), referencing the issue number.
4. Open a PR into `main` using the PR template; link the issue with a
   closing keyword (`Closes #12`) so it auto-closes on merge.
5. Squash-merge (keeps `main` history one commit per PR/feature).

## Conventional Commits

Format: `<type>(<scope>): <description>` — description in imperative mood,
no trailing period.

**Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`,
`build`.

**Scope** is optional but encouraged — use the area it touches, e.g.
`import`, `staples`, `deck`, `ui`, `db`.

Reference an issue in the body (not required in the subject line) when one
exists:

```
feat(import): parse Moxfield plain-text export

Handles commander/mainboard sections; ignores maybeboard.

Refs #3
```

Breaking changes: add `!` after the type/scope (`feat(db)!: ...`) and a
`BREAKING CHANGE:` footer explaining the impact.

Commit messages are linted by commitlint via a Lefthook `commit-msg` hook
once M0 scaffolding lands (see [docs/ROADMAP.md](docs/ROADMAP.md)) — until
then, follow the format manually.

## Pull requests

- Keep PRs scoped to one issue/one concern where reasonably possible.
- Fill in the PR template's test plan — even for a personal project, write
  down how you verified the change works.
- CI (typecheck/lint/build) must be green before merging.
