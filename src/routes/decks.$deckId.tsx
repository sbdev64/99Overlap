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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { type DeckCardEntry, getDeck } from '@/server/decks'
import { deleteDeck } from '@/server/delete-deck'
import { markShared } from '@/server/mark-shared'
import { unmarkShared } from '@/server/unmark-shared'
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
          cards also appear in another deck — click one to mark it as shared if
          you move a single physical copy between decks.
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
  const label = (
    <>
      {card.quantity} {card.name}
      {card.isShared && (
        <span className="ml-2 text-xs">
          ★ shared
          {card.currentDeckName ? ` — in ${card.currentDeckName}` : ''}
        </span>
      )}
    </>
  )

  // Once a card is shared, keep it clickable (to unmark or update its
  // location) even if it no longer overlaps with another deck — it must
  // stay manageable from every view it's shown in, not just while
  // overlapping. See docs/PRODUCT.md#5-marking-a-shared-card.
  if (!card.isOverlapping && !card.isShared) {
    return <li className="rounded px-1">{label}</li>
  }

  return (
    <li>
      <SharedCardPicker card={card} label={label} />
    </li>
  )
}

function SharedCardPicker({
  card,
  label,
}: {
  card: DeckCardEntry
  label: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedDeckId, setSelectedDeckId] = useState(
    card.currentDeckId ?? card.decksWithThisCard[0]?.id,
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    if (!selectedDeckId) return
    setPending(true)
    setError(null)
    try {
      await markShared({
        data: { cardId: card.cardId, currentDeckId: selectedDeckId },
      })
      setOpen(false)
      await router.invalidate()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to mark card as shared',
      )
    } finally {
      setPending(false)
    }
  }

  async function handleUnmark() {
    setPending(true)
    setError(null)
    try {
      await unmarkShared({ data: { cardId: card.cardId } })
      setOpen(false)
      await router.invalidate()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to unmark shared card',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setSelectedDeckId(card.currentDeckId ?? card.decksWithThisCard[0]?.id)
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'w-full rounded px-1 text-left',
            'bg-amber-200 dark:bg-amber-900',
          )}
        >
          {label}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {card.isShared
              ? `"${card.name}" is shared`
              : `Mark "${card.name}" as shared`}
          </DialogTitle>
          <DialogDescription>
            {card.isShared
              ? 'You own one physical copy of this card and move it between decks by hand. Update which deck currently has it, or stop tracking it as shared.'
              : 'This card appears in multiple decks. If you only own one physical copy and move it between decks, mark it here and say which deck currently has it.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`shared-deck-${card.cardId}`}>Currently in</Label>
          <select
            id={`shared-deck-${card.cardId}`}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(Number(e.target.value))}
          >
            {card.decksWithThisCard.map((deckOption) => (
              <option key={deckOption.id} value={deckOption.id}>
                {deckOption.name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <DialogFooter>
          {card.isShared && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive sm:mr-auto"
              onClick={handleUnmark}
              disabled={pending}
            >
              Unmark as shared
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={pending}>
            {pending
              ? 'Saving…'
              : card.isShared
                ? 'Update location'
                : 'Mark as shared'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
