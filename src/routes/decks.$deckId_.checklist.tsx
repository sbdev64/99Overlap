import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { type DeckCardEntry, getDeck } from '@/server/decks'
import { markShared } from '@/server/mark-shared'

export const Route = createFileRoute('/decks/$deckId_/checklist')({
  component: ChecklistPage,
  loader: ({ params }) => getDeck({ data: { deckId: params.deckId } }),
})

function ChecklistPage() {
  const deck = Route.useLoaderData()
  const isPlanning = deck.type === 'planning'
  // Same rule as the deck detail page's "missing shared cards" warning — see
  // docs/PRODUCT.md#6-tracking-a-shared-cards-location--the-what-do-i-move-view.
  const missingShared = isPlanning
    ? []
    : deck.cards.filter(
        (card) => card.isShared && card.currentDeckId !== deck.id,
      )
  const [checked, setChecked] = useState<Set<number>>(new Set())

  function toggle(cardId: number) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }
      return next
    })
  }

  return (
    <main>
      <Link
        to="/decks/$deckId"
        params={{ deckId: String(deck.id) }}
        className="text-sm underline"
      >
        ← {deck.name}
      </Link>

      <h1 className="mt-2 font-display font-semibold text-2xl">
        Game-day checklist
      </h1>
      <p className="text-muted-foreground text-sm">
        Grab these before you play "{deck.name}". Checking a card off here is
        just for you — it doesn't change anything; use "Move here" once you've
        actually moved the physical card.
      </p>

      {missingShared.length === 0 ? (
        <p className="mt-6 text-muted-foreground">
          Nothing to grab — every shared card this deck needs is already here. ✓
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {missingShared.map((card) => (
            <ChecklistRow
              key={card.cardId}
              card={card}
              deckId={deck.id}
              checked={checked.has(card.cardId)}
              onToggle={() => toggle(card.cardId)}
            />
          ))}
        </ul>
      )}
    </main>
  )
}

function ChecklistRow({
  card,
  deckId,
  checked,
  onToggle,
}: {
  card: DeckCardEntry
  deckId: number
  checked: boolean
  onToggle: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleMoveHere() {
    setPending(true)
    setError(null)
    try {
      await markShared({ data: { cardId: card.cardId, currentDeckId: deckId } })
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move card')
      setPending(false)
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id={`checklist-${card.cardId}`}
          checked={checked}
          onCheckedChange={onToggle}
        />
        <Label
          htmlFor={`checklist-${card.cardId}`}
          className={cn(
            'font-normal',
            checked && 'text-muted-foreground line-through',
          )}
        >
          {card.name} —{' '}
          {card.currentDeckId !== null ? (
            <>
              currently in{' '}
              <Link
                to="/decks/$deckId"
                params={{ deckId: String(card.currentDeckId) }}
                className="font-medium underline"
              >
                {card.currentDeckName}
              </Link>
            </>
          ) : (
            <span className="font-medium text-destructive">
              location unknown (its deck was deleted)
            </span>
          )}
        </Label>
      </div>
      <span className="flex items-center gap-2">
        {error && <span className="text-destructive text-xs">{error}</span>}
        <Button
          size="sm"
          variant="outline"
          onClick={handleMoveHere}
          disabled={pending}
        >
          {pending ? 'Moving…' : 'Move here'}
        </Button>
      </span>
    </li>
  )
}
