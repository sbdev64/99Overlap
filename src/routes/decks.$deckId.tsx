import { createFileRoute, Link } from '@tanstack/react-router'
import { getDeck } from '@/server/decks'

export const Route = createFileRoute('/decks/$deckId')({
  component: DeckDetailPage,
  loader: ({ params }) => getDeck({ data: { deckId: params.deckId } }),
})

function DeckDetailPage() {
  const deck = Route.useLoaderData()
  const commanders = deck.cards.filter((card) => card.board === 'commander')
  const mainboard = deck.cards.filter((card) => card.board === 'mainboard')

  return (
    <main>
      <Link to="/decks" className="text-sm underline">
        ← All decks
      </Link>

      <h1 className="mt-2 text-2xl font-semibold">{deck.name}</h1>
      {deck.commanderName && (
        <p className="text-muted-foreground">{deck.commanderName}</p>
      )}

      {commanders.length > 0 && (
        <section className="mt-6">
          <h2 className="font-medium text-sm uppercase tracking-wide">
            Commander
          </h2>
          <ul className="mt-2 flex flex-col gap-1">
            {commanders.map((card) => (
              <li key={card.cardId}>
                {card.quantity} {card.name}
              </li>
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
            <li key={card.cardId}>
              {card.quantity} {card.name}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
