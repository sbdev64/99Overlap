import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toDisplayDate } from '@/lib/date-format'
import { DECK_TYPE_LABELS } from '@/lib/deck-type'
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
  const [showPlanning, setShowPlanning] = useState(false)

  const preconDecks = useMemo(
    () =>
      sortDecks(
        decks.filter((deck) => deck.type === 'precon'),
        sortOrder,
      ),
    [decks, sortOrder],
  )
  const customDecks = useMemo(
    () =>
      sortDecks(
        decks.filter((deck) => deck.type === 'custom'),
        sortOrder,
      ),
    [decks, sortOrder],
  )
  const planningDecks = useMemo(
    () =>
      sortDecks(
        decks.filter((deck) => deck.type === 'planning'),
        sortOrder,
      ),
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
          <Link to="/stats" className="text-sm underline">
            Statistics
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
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2">
              <Switch
                id="show-planning"
                checked={showPlanning}
                onCheckedChange={setShowPlanning}
              />
              <Label htmlFor="show-planning" className="font-normal">
                Show planning decks ({planningDecks.length})
              </Label>
            </div>
          </div>

          <DeckSection title={DECK_TYPE_LABELS.precon} decks={preconDecks} />
          <DeckSection title={DECK_TYPE_LABELS.custom} decks={customDecks} />
          {showPlanning && (
            <DeckSection
              title={DECK_TYPE_LABELS.planning}
              decks={planningDecks}
            />
          )}
        </>
      )}
    </main>
  )
}

function DeckSection({
  title,
  decks,
}: {
  title: string
  decks: DeckSummary[]
}) {
  return (
    <section className="mt-6">
      <h2 className="font-medium text-sm uppercase tracking-wide">
        {title} ({decks.length})
      </h2>
      {decks.length === 0 ? (
        <p className="mt-2 text-muted-foreground text-sm">No decks here yet.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {decks.map((deck) => (
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
      )}
    </section>
  )
}
