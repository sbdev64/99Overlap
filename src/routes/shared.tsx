import { createFileRoute, Link } from '@tanstack/react-router'
import { listSharedCards } from '@/server/shared-cards'

export const Route = createFileRoute('/shared')({
  component: SharedCardsPage,
  loader: () => listSharedCards(),
})

function SharedCardsPage() {
  const sharedCards = Route.useLoaderData()

  return (
    <main>
      <h1 className="font-display font-semibold text-2xl">Shared cards</h1>
      <p className="text-muted-foreground">
        Every card you own a single physical copy of and move between decks, and
        where it currently is.
      </p>

      {sharedCards.length === 0 ? (
        <p className="mt-6 text-muted-foreground">
          No cards are marked as shared yet. Mark one from a deck's card list.
        </p>
      ) : (
        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Card</th>
              <th className="py-2 pr-4 font-medium">Currently in</th>
              <th className="py-2 font-medium">Also needed by</th>
            </tr>
          </thead>
          <tbody>
            {sharedCards.map((card) => {
              const otherDecks = card.decksWithThisCard.filter(
                (deck) => deck.id !== card.currentDeckId,
              )
              return (
                <tr key={card.cardId} className="border-b">
                  <td className="py-2 pr-4 font-medium">{card.name}</td>
                  <td className="py-2 pr-4">
                    {card.currentDeckId !== null ? (
                      <Link
                        to="/decks/$deckId"
                        params={{ deckId: String(card.currentDeckId) }}
                        className="underline"
                      >
                        {card.currentDeckName}
                      </Link>
                    ) : (
                      <span className="font-medium text-destructive">
                        location unknown
                      </span>
                    )}
                  </td>
                  <td className="py-2">
                    {otherDecks.length === 0
                      ? '—'
                      : otherDecks.map((deck, i) => (
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
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </main>
  )
}
