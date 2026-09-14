import { createFileRoute, Link } from '@tanstack/react-router'
import { ImageOff } from 'lucide-react'
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
import { colorIdentityName } from '@/lib/colors'
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
    <main style={{ '--main-width': '72rem' } as React.CSSProperties}>
      <div className="flex items-center justify-between">
        <h1 className="font-display font-semibold text-2xl">Decks</h1>
        <Link to="/" className="text-sm underline">
          Import a new deck
        </Link>
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
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </section>
  )
}

function DeckCard({ deck }: { deck: DeckSummary }) {
  const infoLine = deckInfoLine(deck)

  return (
    <Link
      to="/decks/$deckId"
      params={{ deckId: String(deck.id) }}
      className="group flex flex-col overflow-hidden rounded-lg border border-border transition-colors hover:border-primary"
    >
      <div className="relative aspect-5/7 w-full overflow-hidden bg-muted">
        {deck.commanderImageUrl ? (
          <img
            src={deck.commanderImageUrl}
            alt={deck.commanderName ?? deck.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff
              className="size-8 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 p-2">
        <p className="truncate font-medium text-sm">{deck.name}</p>
        <p className="truncate text-muted-foreground text-xs">
          {deck.commanderName ?? 'No commander recorded'}
        </p>
        {infoLine && (
          <p className="truncate text-muted-foreground text-xs">{infoLine}</p>
        )}
        <p className="text-muted-foreground text-xs">
          {deck.lastPlayedDate
            ? `Last played ${toDisplayDate(deck.lastPlayedDate)}`
            : 'Never played'}
        </p>
      </div>
    </Link>
  )
}

/** The decks list's compact, single-line info summary — the "keep it
 * simple" counterpart to the deck detail page's richer `DeckInfoPanel`. See
 * roadmap issue #124. */
function deckInfoLine(deck: DeckSummary): string {
  return [
    deck.colorIdentity !== null && colorIdentityName(deck.colorIdentity),
    deck.archetype,
    deck.secondaryArchetype,
    // Short form here (just the number) — the deck page's fancy panel shows
    // the full "Bracket N · Name" via powerBracketLabel().
    deck.powerBracket !== null && `Bracket ${deck.powerBracket}`,
  ]
    .filter(Boolean)
    .join(' · ')
}
