import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { listSearchableCards } from '@/server/search-cards'

export const Route = createFileRoute('/search')({
  component: SearchPage,
  loader: () => listSearchableCards(),
})

function SearchPage() {
  const allCards = Route.useLoaderData()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return []
    return allCards.filter((card) => card.name.toLowerCase().includes(trimmed))
  }, [allCards, query])

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Search cards</h1>
        <div className="flex gap-4">
          <Link to="/decks" className="text-sm underline">
            View decks
          </Link>
          <Link to="/shared" className="text-sm underline">
            Shared cards
          </Link>
        </div>
      </div>
      <p className="text-muted-foreground">
        Find a card by name across all your saved decks.
      </p>

      <Input
        id="search-input"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Card name"
        className="mt-4"
      />

      {query.trim() && (
        <p className="mt-4 text-muted-foreground text-sm">
          {results.length === 0
            ? 'No cards match.'
            : `${results.length} card${results.length === 1 ? '' : 's'} found`}
        </p>
      )}

      <ul className="mt-2 flex flex-col gap-2">
        {results.map((card) => (
          <li key={card.cardId} className="rounded-md border border-border p-3">
            <p className="font-medium">{card.name}</p>
            <p className="text-muted-foreground text-sm">
              {card.decks.map((deck, i) => (
                <span key={deck.id}>
                  {i > 0 && ', '}
                  <Link
                    to="/decks/$deckId"
                    params={{ deckId: String(deck.id) }}
                    className="underline"
                  >
                    {deck.name}
                  </Link>
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>
    </main>
  )
}
