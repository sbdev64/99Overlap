import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toDisplayDate } from '@/lib/date-format'
import { type DeckSummary, listDecks } from '@/server/decks'

export const Route = createFileRoute('/decks/')({
  component: DecksPage,
  loader: () => listDecks(),
})

type SortOrder = 'name' | 'lastPlayed'

function sortDecks(decks: DeckSummary[], order: SortOrder): DeckSummary[] {
  const sorted = [...decks]
  if (order === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name))
  } else {
    // Most recently played first; decks never played sort last.
    sorted.sort((a, b) => {
      if (!a.lastPlayedDate && !b.lastPlayedDate) return 0
      if (!a.lastPlayedDate) return 1
      if (!b.lastPlayedDate) return -1
      return b.lastPlayedDate.localeCompare(a.lastPlayedDate)
    })
  }
  return sorted
}

function DecksPage() {
  const decks = Route.useLoaderData()
  const [sortOrder, setSortOrder] = useState<SortOrder>('name')
  const sortedDecks = useMemo(
    () => sortDecks(decks, sortOrder),
    [decks, sortOrder],
  )

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Decks</h1>
        <div className="flex gap-4">
          <Link to="/" className="text-sm underline">
            Import a new deck
          </Link>
          <Link to="/search" className="text-sm underline">
            Search cards
          </Link>
          <Link to="/shared" className="text-sm underline">
            Shared cards
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
        <>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Sort by</span>
            <Select
              value={sortOrder}
              onValueChange={(v) => setSortOrder(v as SortOrder)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A–Z)</SelectItem>
                <SelectItem value="lastPlayed">Last played</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ul className="mt-4 flex flex-col gap-2">
            {sortedDecks.map((deck) => (
              <li key={deck.id}>
                <Link
                  to="/decks/$deckId"
                  params={{ deckId: String(deck.id) }}
                  className="block rounded-md border border-border p-4 hover:bg-accent"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{deck.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {deck.lastPlayedDate
                        ? `Last played ${toDisplayDate(deck.lastPlayedDate)}`
                        : 'Never played'}
                    </p>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {deck.commanderName ?? 'No commander recorded'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
