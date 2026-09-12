import { createFileRoute, Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { type DeckCardEntry, getDeck } from '@/server/decks'

export const Route = createFileRoute('/decks/$deckId')({
  component: DeckDetailPage,
  loader: ({ params }) => getDeck({ data: { deckId: params.deckId } }),
})

function DeckDetailPage() {
  const deck = Route.useLoaderData()
  const commanders = deck.cards.filter((card) => card.board === 'commander')
  const mainboard = deck.cards.filter((card) => card.board === 'mainboard')
  const hasOverlap = deck.cards.some((card) => card.isOverlapping)

  return (
    <main>
      <Link to="/decks" className="text-sm underline">
        ← All decks
      </Link>

      <h1 className="mt-2 text-2xl font-semibold">{deck.name}</h1>
      {deck.commanderName && (
        <p className="text-muted-foreground">{deck.commanderName}</p>
      )}

      {hasOverlap && (
        <p className="mt-4 text-sm">
          <span className="rounded bg-amber-200 px-1 py-0.5 dark:bg-amber-900">
            Highlighted
          </span>{' '}
          cards also appear in another deck.
        </p>
      )}

      {commanders.length > 0 && (
        <section className="mt-6">
          <h2 className="font-medium text-sm uppercase tracking-wide">
            Commander
          </h2>
          <ul className="mt-2 flex flex-col gap-1">
            {commanders.map((card) => (
              <CardLine key={card.cardId} card={card} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-medium text-sm uppercase tracking-wide">
          Mainboard ({mainboard.length})
        </h2>
        <ul className="mt-2 flex flex-col gap-1">
          {mainboard.map((card) => (
            <CardLine key={card.cardId} card={card} />
          ))}
        </ul>
      </section>
    </main>
  )
}

function CardLine({ card }: { card: DeckCardEntry }) {
  return (
    <li
      className={cn(
        'rounded px-1',
        card.isOverlapping && 'bg-amber-200 dark:bg-amber-900',
      )}
    >
      {card.quantity} {card.name}
    </li>
  )
}
