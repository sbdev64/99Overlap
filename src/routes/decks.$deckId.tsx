import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { type DeckCardEntry, getDeck } from '@/server/decks'
import { deleteDeck } from '@/server/delete-deck'
import { updateDeck } from '@/server/update-deck'

export const Route = createFileRoute('/decks/$deckId')({
  component: DeckDetailPage,
  loader: ({ params }) => getDeck({ data: { deckId: params.deckId } }),
})

function DeckDetailPage() {
  const deck = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const commanders = deck.cards.filter((card) => card.board === 'commander')
  const mainboard = deck.cards.filter((card) => card.board === 'mainboard')
  const hasOverlap = deck.cards.some((card) => card.isOverlapping)

  const [editing, setEditing] = useState(false)
  const [sourceText, setSourceText] = useState(deck.sourceText)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await updateDeck({ data: { deckId: deck.id, sourceText } })
      setEditing(false)
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update deck')
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteDeck({ data: { deckId: deck.id } })
      await navigate({ to: '/decks' })
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Failed to delete deck',
      )
      setDeleting(false)
    }
  }

  return (
    <main>
      <Link to="/decks" className="text-sm underline">
        ← All decks
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{deck.name}</h1>
          {deck.commanderName && (
            <p className="text-muted-foreground">{deck.commanderName}</p>
          )}
        </div>
        {!editing && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSourceText(deck.sourceText)
                setError(null)
                setEditing(true)
              }}
            >
              Edit decklist
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete deck</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{deck.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the deck and its card list. Cards it shares
                    with other decks aren't affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {deleteError && (
                  <p className="text-destructive text-sm">{deleteError}</p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault()
                      handleDelete()
                    }}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {editing && (
        <form className="mt-4 flex flex-col gap-2" onSubmit={handleSave}>
          <Textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={12}
            required
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </form>
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
