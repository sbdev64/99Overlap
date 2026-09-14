import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { RotateCw } from 'lucide-react'
import { useState } from 'react'
import { Combobox } from '@/components/combobox'
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
import { Input } from '@/components/ui/input'
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
import { colorIdentityLabel } from '@/lib/colors'
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

/** Card counts must sum `quantity` (a "30 Plains" line is one row with
 * quantity 30), not just count distinct rows — see roadmap issue #88. */
function sumQuantity(cards: DeckCardEntry[]): number {
  return cards.reduce((total, card) => total + card.quantity, 0)
}

/** Text: compact list, image on hover. Visual: every card's image shown
 * directly, spoiler-gallery style. See roadmap issue #91. */
type ViewMode = 'text' | 'visual'

const VIEW_MODE_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'visual', label: 'Visual spoiler' },
]

// Every card <li> in text mode gets a little breathing room below it.
const TEXT_LI_CLASS = 'mb-1'

// Text mode's mainboard layout: a flowing CSS multi-column container, so
// groups pack top-to-bottom into whichever column has room next instead of
// being placed strictly row-by-row — a CSS Grid (#107) pushed later groups
// (Enchantments, Lands, ...) far down the page whenever an earlier row's
// tallest group left unused space in its shorter neighbors. Each group is
// still a clearly bounded, bordered box with `break-inside: avoid-column`
// so it never visually splits across a column break, and two groups sharing
// a column stay unambiguous — addressing the original complaint about #99
// that #107 had overcorrected for. See roadmap issue #112.
const TEXT_MAINBOARD_STYLE: React.CSSProperties = {
  columns: '4 16rem',
  columnGap: '1rem',
}

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
  const [viewMode, setViewMode] = useState<ViewMode>('text')
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
  const [boxColor, setBoxColor] = useState(deck.boxColor ?? '')
  const [sleeveColor, setSleeveColor] = useState(deck.sleeveColor ?? '')
  const [archetype, setArchetype] = useState(deck.archetype ?? '')
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
          boxColor,
          sleeveColor,
          archetype,
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
    <main style={{ '--main-width': '80rem' } as React.CSSProperties}>
      <Link to="/decks" className="text-sm underline">
        ← All decks
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-semibold text-2xl">{deck.name}</h1>
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
          {(deck.colorIdentity !== null ||
            deck.archetype ||
            deck.boxColor ||
            deck.sleeveColor) && (
            <p className="text-muted-foreground text-sm">
              {[
                deck.colorIdentity !== null &&
                  colorIdentityLabel(deck.colorIdentity),
                deck.archetype,
                deck.boxColor && `${deck.boxColor} box`,
                deck.sleeveColor && `${deck.sleeveColor} sleeves`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
        {!editing && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSourceText(deck.sourceText)
                setHasTwoCommanders(deck.commanderCount === 2)
                setType(deck.type)
                setBoxColor(deck.boxColor ?? '')
                setSleeveColor(deck.sleeveColor ?? '')
                setArchetype(deck.archetype ?? '')
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
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="edit-archetype">Archetype</Label>
              <Input
                id="edit-archetype"
                value={archetype}
                onChange={(e) => setArchetype(e.target.value)}
                placeholder="Aristocrats"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="edit-box-color">Box color</Label>
              <Input
                id="edit-box-color"
                value={boxColor}
                onChange={(e) => setBoxColor(e.target.value)}
                placeholder="Black"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="edit-sleeve-color">Sleeve color</Label>
              <Input
                id="edit-sleeve-color"
                value={sleeveColor}
                onChange={(e) => setSleeveColor(e.target.value)}
                placeholder="Purple"
              />
            </div>
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
          <ul
            className={
              viewMode === 'visual'
                ? 'mt-2 flex flex-wrap gap-3'
                : 'mt-2 flex flex-col gap-1'
            }
          >
            {commanders.map((card) =>
              isPlanning ? (
                <PlanningCardLine
                  key={card.cardId}
                  card={card}
                  viewMode={viewMode}
                />
              ) : (
                <CardLine key={card.cardId} card={card} viewMode={viewMode} />
              ),
            )}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium text-sm uppercase tracking-wide">
            Mainboard ({sumQuantity(mainboard)})
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-md border p-0.5">
              {VIEW_MODE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={viewMode === option.value ? 'default' : 'ghost'}
                  className="h-7 px-2 text-xs"
                  onClick={() => setViewMode(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Label
                htmlFor="group-by"
                className="text-muted-foreground text-xs"
              >
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
        </div>
        <div style={viewMode === 'text' ? TEXT_MAINBOARD_STYLE : undefined}>
          {mainboardGroups.map((group) => (
            <div
              key={group.label}
              className={
                viewMode === 'text'
                  ? 'mb-4 break-inside-avoid-column rounded-md border border-border p-3'
                  : 'mt-3'
              }
            >
              <h3 className="text-muted-foreground text-xs uppercase tracking-wide">
                {group.label} ({sumQuantity(group.cards)})
              </h3>
              <ul
                className={
                  viewMode === 'visual'
                    ? 'mt-1 flex flex-wrap gap-3'
                    : 'mt-2 flex flex-col'
                }
              >
                {group.cards.map((card) =>
                  isPlanning ? (
                    <PlanningCardLine
                      key={card.cardId}
                      card={card}
                      viewMode={viewMode}
                    />
                  ) : (
                    <CardLine
                      key={card.cardId}
                      card={card}
                      viewMode={viewMode}
                    />
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
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
function PlanningCardLine({
  card,
  viewMode,
}: {
  card: DeckCardEntry
  viewMode: ViewMode
}) {
  const owned = card.ownedInDecks.length > 0

  if (viewMode === 'visual') {
    return (
      <li
        className={cn('rounded p-1', owned && 'bg-green-100 dark:bg-green-950')}
      >
        <CardTile
          card={card}
          badge={
            owned ? (
              <span className="text-[10px] text-green-700 dark:text-green-400">
                ✓ owned
              </span>
            ) : (
              <span className="font-medium text-[10px] text-destructive">
                Need to buy
              </span>
            )
          }
        />
      </li>
    )
  }

  return (
    <li
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded px-1',
        TEXT_LI_CLASS,
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

function CardLine({
  card,
  viewMode,
}: {
  card: DeckCardEntry
  viewMode: ViewMode
}) {
  const sharedBadge = card.isShared && (
    <span
      className={cn(
        'text-xs',
        viewMode === 'visual' ? 'text-[10px]' : 'ml-2',
        card.currentDeckId === null && 'font-medium text-destructive',
      )}
    >
      ★{' '}
      {card.currentDeckName ? `in ${card.currentDeckName}` : 'location unknown'}
    </span>
  )

  const label =
    viewMode === 'visual' ? (
      <CardTile card={card} badge={sharedBadge} />
    ) : (
      <CardImagePreview card={card}>
        {card.quantity} {card.name}
        {sharedBadge}
      </CardImagePreview>
    )

  // Once a card is shared, keep it clickable (to unmark or update its
  // location) even if it no longer overlaps with another deck — it must
  // stay manageable from every view it's shown in, not just while
  // overlapping. See docs/PRODUCT.md#5-marking-a-shared-card.
  if (!card.isOverlapping && !card.isShared) {
    return (
      <li
        className={
          viewMode === 'visual' ? undefined : cn('rounded px-1', TEXT_LI_CLASS)
        }
      >
        {label}
      </li>
    )
  }

  return (
    <li className={viewMode === 'text' ? TEXT_LI_CLASS : undefined}>
      <SharedCardPicker
        card={card}
        label={label}
        tileMode={viewMode === 'visual'}
      />
    </li>
  )
}

/** Moxfield-style hover preview: shows the card's Scryfall image next to its
 * name. Falls back to plain text when enrichment hasn't found an image yet
 * (or the card was never found on Scryfall) — see docs/PRODUCT.md#7. Text
 * mode only — Visual spoiler mode uses `CardTile` instead (#91). A
 * double-faced card gets a "Show back"/"Show front" toggle — see #101. */
function CardImagePreview({
  card,
  children,
}: {
  card: DeckCardEntry
  children: React.ReactNode
}) {
  const [showBack, setShowBack] = useState(false)

  if (!card.imageUrl) {
    return <>{children}</>
  }

  const activeImage = showBack
    ? (card.backImageUrl ?? card.imageUrl)
    : card.imageUrl

  return (
    <HoverCard
      openDelay={150}
      closeDelay={0}
      onOpenChange={(open) => {
        if (!open) setShowBack(false)
      }}
    >
      <HoverCardTrigger asChild>
        <span className="cursor-pointer underline decoration-dotted underline-offset-2">
          {children}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-56 p-1" side="right" align="start">
        <img
          src={activeImage}
          alt={card.name}
          loading="lazy"
          className="rounded-md"
        />
        {card.backImageUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1 w-full text-xs"
            onClick={() => setShowBack((v) => !v)}
          >
            {showBack ? 'Show front' : 'Show back'}
          </Button>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}

/** A small flip toggle overlaid on a `CardTile`'s image. Rendered as a
 * `<span>` (not a `<button>`) with its click stopped from bubbling — a
 * `CardTile` can itself sit inside `SharedCardPicker`'s trigger `<button>`,
 * and a nested `<button>` there would be invalid HTML and eat the click. See
 * roadmap issue #101. */
function FlipButton({ onFlip }: { onFlip: () => void }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: can't be a real <button> — sometimes nests inside SharedCardPicker's trigger <button>
    <span
      role="button"
      tabIndex={0}
      aria-label="Flip card"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onFlip()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          onFlip()
        }
      }}
      className="absolute right-1 bottom-1 cursor-pointer rounded-full bg-background/80 p-1 shadow"
    >
      <RotateCw className="size-3" aria-hidden="true" />
    </span>
  )
}

/** Visual spoiler mode's card tile: always shows the card's image (or a
 * name-only placeholder when unenriched/not found), no hover needed. See
 * roadmap issue #91. A double-faced card gets a flip control — see #101. */
function CardTile({
  card,
  badge,
}: {
  card: DeckCardEntry
  badge?: React.ReactNode
}) {
  const [showBack, setShowBack] = useState(false)
  const activeImage = showBack
    ? (card.backImageUrl ?? card.imageUrl)
    : card.imageUrl

  return (
    <div className="flex w-24 flex-col items-center gap-1 text-center">
      <div className="relative w-full">
        {activeImage ? (
          <img
            src={activeImage}
            alt={card.name}
            loading="lazy"
            className="aspect-5/7 w-full rounded-md object-cover"
          />
        ) : (
          <div className="flex aspect-5/7 w-full items-center justify-center rounded-md border border-dashed p-1 text-[10px] text-muted-foreground">
            {card.name}
          </div>
        )}
        {card.backImageUrl && (
          <FlipButton onFlip={() => setShowBack((v) => !v)} />
        )}
      </div>
      <span className="line-clamp-2 text-[11px] leading-tight">
        {card.quantity > 1 && `${card.quantity}× `}
        {card.name}
      </span>
      {badge}
    </div>
  )
}

function SharedCardPicker({
  card,
  label,
  tileMode = false,
}: {
  card: DeckCardEntry
  label: React.ReactNode
  tileMode?: boolean
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
            tileMode ? 'rounded p-1' : 'w-full rounded px-1 text-left',
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
          <Combobox
            id={`shared-deck-${card.cardId}`}
            value={selectedDeckId ? String(selectedDeckId) : ''}
            onChange={(v) => setSelectedDeckId(Number(v))}
            options={card.decksWithThisCard.map((deckOption) => ({
              value: String(deckOption.id),
              label: deckOption.name,
            }))}
          />
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
