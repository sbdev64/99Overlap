import { createFileRoute, Link } from '@tanstack/react-router'
import { listDecks } from '@/server/decks'

export const Route = createFileRoute('/decks/')({
  component: DecksPage,
  loader: () => listDecks(),
})

function DecksPage() {
  const decks = Route.useLoaderData()

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Decks</h1>
        <div className="flex gap-4">
          <Link to="/" className="text-sm underline">
            Import a new deck
          </Link>
          <Link to="/history" className="text-sm underline">
            Game history
          </Link>
        </div>
      </div>

      {decks.length === 0 ? (
        <p className="mt-4 text-muted-foreground">
          No decks yet.{' '}
          <Link to="/" className="underline">
            Import your first one
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {decks.map((deck) => (
            <li key={deck.id}>
              <Link
                to="/decks/$deckId"
                params={{ deckId: String(deck.id) }}
                className="block rounded-md border border-border p-4 hover:bg-accent"
              >
                <p className="font-medium">{deck.name}</p>
                <p className="text-muted-foreground text-sm">
                  {deck.commanderName ?? 'No commander recorded'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
