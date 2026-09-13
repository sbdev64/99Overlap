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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { GROUP_BY_OPTIONS, type GroupBy, groupCards } from '@/lib/card-grouping'
import { toDisplayDate } from '@/lib/date-format'
import { DECK_TYPE_LABELS, DECK_TYPES, type DeckType } from '@/lib/deck-type'
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
  const isPlanning = deck.type === 'planning'
  const commanders = deck.cards.filter((card) => card.board === 'commander')
  const mainboard = deck.cards.filter((card) => card.board === 'mainboard')
  const hasOverlap =
    !isPlanning && deck.cards.some((card) => card.isOverlapping)
  const [groupBy, setGroupBy] = useState<GroupBy>('type')
  const mainboardGroups = groupCards(mainboard, groupBy)
  // Shared cards this deck needs that are currently sitting in another deck
  // — or, if that deck was deleted, whose location is now unknown (`null`).
  // Either way this deck can't assume it has the card, so it's flagged the
  // same way. This is the feature that fulfills the app's actual mission —
  // see docs/PRODUCT.md#6-tracking-a-shared-cards-location--the-what-do-i-move-view.
  // Doesn't apply to Planning decks — see docs/PRODUCT.md#10, they get the
  // owned/need-to-buy view instead of shared-card tracking.
  const missingShared = isPlanning
    ? []
    : deck.cards.filter(
        (card) => card.isShared && card.currentDeckId !== deck.id,
      )

  const [editing, setEditing] = useState(false)
  const [sourceText, setSourceText] = useState(deck.sourceText)
  const [hasTwoCommanders, setHasTwoCommanders] = useState(
    deck.commanderCount === 2,
  )
  const [type, setType] = useState<DeckType>(deck.type)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await updateDeck({
        data: {
          deckId: deck.id,
          sourceText,
          commanderCount: hasTwoCommanders ? 2 : 1,
          type,
        },
      })
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{deck.name}</h1>
            <span className="rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground text-xs">
              {DECK_TYPE_LABELS[deck.type]}
            </span>
          </div>
          {deck.commanderName && (
            <p className="text-muted-foreground">{deck.commanderName}</p>
          )}
          <p className="text-muted-foreground text-sm">
            {deck.lastPlayedDate
              ? `Last played ${toDisplayDate(deck.lastPlayedDate)}`
              : 'Never played'}
          </p>
        </div>
        {!editing && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSourceText(deck.sourceText)
                setHasTwoCommanders(deck.commanderCount === 2)
                setType(deck.type)
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

      {missingShared.length > 0 && (
        <section className="mt-4 rounded-md border-2 border-amber-500 bg-amber-50 p-4 dark:bg-amber-950">
          <h2 className="font-semibold">⚠ Missing shared cards</h2>
          <p className="text-muted-foreground text-sm">
            Grab these from where they currently are before you play this deck.
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {missingShared.map((card) => (
              <MissingSharedCardRow
                key={card.cardId}
                card={card}
                deckId={deck.id}
              />
            ))}
          </ul>
        </section>
      )}

      {editing && (
        <form className="mt-4 flex flex-col gap-2" onSubmit={handleSave}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-deck-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as DeckType)}>
              <SelectTrigger id="edit-deck-type" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DECK_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {DECK_TYPE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={12}
            required
          />
          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-two-commanders"
              checked={hasTwoCommanders}
              onCheckedChange={(checked) =>
                setHasTwoCommanders(checked === true)
              }
            />
            <Label htmlFor="edit-two-commanders" className="font-normal">
              This deck has two commanders (Partner/Background) — the first two
              lines of the paste are both commanders
            </Label>
          </div>
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

      {isPlanning && (
        <p className="mt-4 text-sm">
          <span className="rounded bg-green-100 px-1 py-0.5 dark:bg-green-950">
            Green
          </span>{' '}
          cards are already in one of your owned decks — you don't need to buy
          those. Everything else is marked "Need to buy."
        </p>
      )}

      {commanders.length > 0 && (
        <section className="mt-6">
          <h2 className="font-medium text-sm uppercase tracking-wide">
            Commander
          </h2>
          <ul className="mt-2 flex flex-col gap-1">
            {commanders.map((card) =>
              isPlanning ? (
                <PlanningCardLine key={card.cardId} card={card} />
              ) : (
                <CardLine key={card.cardId} card={card} />
              ),
            )}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm uppercase tracking-wide">
            Mainboard ({mainboard.length})
          </h2>
          <div className="flex items-center gap-2">
            <Label htmlFor="group-by" className="text-muted-foreground text-xs">
              Group by
            </Label>
            <Select
              value={groupBy}
              onValueChange={(value) => setGroupBy(value as GroupBy)}
            >
              <SelectTrigger id="group-by" className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUP_BY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {mainboardGroups.map((group) => (
          <div key={group.label} className="mt-3">
            <h3 className="text-muted-foreground text-xs uppercase tracking-wide">
              {group.label} ({group.cards.length})
            </h3>
            <ul className="mt-1 flex flex-col gap-1">
              {group.cards.map((card) =>
                isPlanning ? (
                  <PlanningCardLine key={card.cardId} card={card} />
                ) : (
                  <CardLine key={card.cardId} card={card} />
                ),
              )}
            </ul>
          </div>
        ))}
      </section>
    </main>
  )
}

function MissingSharedCardRow({
  card,
  deckId,
}: {
  card: DeckCardEntry
  deckId: number
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
    <li className="flex flex-wrap items-center justify-between gap-2">
      <span>
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
      </span>
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

/** A Planning deck's card line: flags each card as already owned (with a
 * link to the owning deck(s)) or needing to be bought, instead of the
 * shared-card overlap highlighting `CardLine` shows for owned decks. See
 * docs/PRODUCT.md#10. */
function PlanningCardLine({ card }: { card: DeckCardEntry }) {
  const owned = card.ownedInDecks.length > 0

  return (
    <li
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded px-1',
        owned && 'bg-green-100 dark:bg-green-950',
      )}
    >
      <CardImagePreview card={card}>
        {card.quantity} {card.name}
      </CardImagePreview>
      {owned ? (
        <span className="text-green-700 text-xs dark:text-green-400">
          ✓ owned —{' '}
          {card.ownedInDecks.map((ownedDeck, i) => (
            <span key={ownedDeck.id}>
              {i > 0 && ', '}
              <Link
                to="/decks/$deckId"
                params={{ deckId: String(ownedDeck.id) }}
                className="underline"
              >
                {ownedDeck.name}
              </Link>
            </span>
          ))}
        </span>
      ) : (
        <span className="font-medium text-destructive text-xs">
          Need to buy
        </span>
      )}
    </li>
  )
}

function CardLine({ card }: { card: DeckCardEntry }) {
  const label = (
    <CardImagePreview card={card}>
      {card.quantity} {card.name}
      {card.isShared && (
        <span
          className={cn(
            'ml-2 text-xs',
            card.currentDeckId === null && 'font-medium text-destructive',
          )}
        >
          ★ shared —{' '}
          {card.currentDeckName
            ? `in ${card.currentDeckName}`
            : 'location unknown'}
        </span>
      )}
    </CardImagePreview>
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

/** Moxfield-style hover preview: shows the card's Scryfall image next to its
 * name. Falls back to plain text when enrichment hasn't found an image yet
 * (or the card was never found on Scryfall) — see docs/PRODUCT.md#7. */
function CardImagePreview({
  card,
  children,
}: {
  card: DeckCardEntry
  children: React.ReactNode
}) {
  if (!card.imageUrl) {
    return <>{children}</>
  }

  return (
    <HoverCard openDelay={150} closeDelay={0}>
      <HoverCardTrigger asChild>
        <span className="cursor-default">{children}</span>
      </HoverCardTrigger>
      <HoverCardContent className="w-56 p-1" side="right" align="start">
        <img
          src={card.imageUrl}
          alt={card.name}
          loading="lazy"
          className="rounded-md"
        />
      </HoverCardContent>
    </HoverCard>
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
