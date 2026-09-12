import { createFileRoute, Outlet } from '@tanstack/react-router'

// Layout route for everything under /decks. It has no UI of its own — the
// list lives in decks.index.tsx and the detail page in decks.$deckId.tsx —
// but TanStack Router nests child routes under this file (dot-notation
// filenames imply nesting), so it must render an <Outlet /> or the children
// never appear.
export const Route = createFileRoute('/decks')({
  component: () => <Outlet />,
})
