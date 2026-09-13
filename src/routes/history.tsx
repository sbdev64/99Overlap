import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { DatePicker } from '@/components/date-picker'
import { PodCombobox } from '@/components/pod-combobox'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toDisplayDate, toIsoDate } from '@/lib/date-format'
import { createGame } from '@/server/create-game'
import { type DeckSummary, listDecks } from '@/server/decks'
import { deleteGame } from '@/server/delete-game'
import { type GameEntry, listGames } from '@/server/games'
import { updateGame } from '@/server/update-game'

export const Route = createFileRoute('/history')({
  component: HistoryPage,
  loader: async () => {
    const [games, decks] = await Promise.all([listGames(), listDecks()])
    return { games, decks }
  },
})

function HistoryPage() {
  const { games, decks } = Route.useLoaderData()
  const router = useRouter()
  const knownPods = useMemo(
    () => Array.from(new Set(games.map((game) => game.pod))).sort(),
    [games],
  )

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Game history</h1>
        <Link to="/decks" className="text-sm underline">
          View decks
        </Link>
      </div>
      <p className="text-muted-foreground">
        Track when and where you played each deck.
      </p>

      <GameDialog
        trigger={
          <Button className="mt-4" disabled={decks.length === 0}>
            Add game
          </Button>
        }
        decks={decks}
        knownPods={knownPods}
        onSaved={() => router.invalidate()}
      />

      {decks.length === 0 && (
        <p className="mt-4 text-muted-foreground text-sm">
          Import a deck first before logging a game.
        </p>
      )}

      {games.length === 0 ? (
        <p className="mt-6 text-muted-foreground">No games logged yet.</p>
      ) : (
        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium">Date</th>
              <th className="py-2 pr-4 font-medium">Deck</th>
              <th className="py-2 pr-4 font-medium">Pod</th>
              <th className="py-2 pr-4 font-medium">Won</th>
              <th className="py-2 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <GameRow
                key={game.id}
                game={game}
                decks={decks}
                knownPods={knownPods}
                onChanged={() => router.invalidate()}
              />
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}

function GameRow({
  game,
  decks,
  knownPods,
  onChanged,
}: {
  game: GameEntry
  decks: DeckSummary[]
  knownPods: string[]
  onChanged: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteGame({ data: { gameId: game.id } })
      onChanged()
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Failed to delete game',
      )
      setDeleting(false)
    }
  }

  return (
    <tr className="border-b">
      <td className="py-2 pr-4">{toDisplayDate(game.date)}</td>
      <td className="py-2 pr-4">
        {game.deckId ? (
          <Link
            to="/decks/$deckId"
            params={{ deckId: String(game.deckId) }}
            className="underline"
          >
            {game.deckName}
          </Link>
        ) : (
          <span className="text-muted-foreground">
            {game.deckName} (deleted)
          </span>
        )}
      </td>
      <td className="py-2 pr-4">{game.pod}</td>
      <td className="py-2 pr-4">
        {game.won && (
          <span className="rounded bg-green-200 px-1.5 py-0.5 text-xs dark:bg-green-900">
            Won
          </span>
        )}
      </td>
      <td className="py-2">
        <div className="flex gap-2">
          <GameDialog
            trigger={
              <Button size="sm" variant="outline">
                Edit
              </Button>
            }
            decks={decks}
            knownPods={knownPods}
            initial={game}
            onSaved={onChanged}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive">
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this game entry?</AlertDialogTitle>
                <AlertDialogDescription>
                  This only removes the history row — it doesn't affect the deck
                  or any shared-card tracking.
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
      </td>
    </tr>
  )
}

function GameDialog({
  trigger,
  decks,
  knownPods,
  initial,
  onSaved,
}: {
  trigger: React.ReactNode
  decks: DeckSummary[]
  knownPods: string[]
  initial?: GameEntry
  onSaved: () => void
}) {
  const isEdit = initial !== undefined

  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(initial?.date ?? toIsoDate(new Date()))
  const [deckId, setDeckId] = useState(initial?.deckId ?? decks[0]?.id)
  const [pod, setPod] = useState(initial?.pod ?? '')
  const [won, setWon] = useState(initial?.won ?? false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetToInitial() {
    setDate(initial?.date ?? toIsoDate(new Date()))
    setDeckId(initial?.deckId ?? decks[0]?.id)
    setPod(initial?.pod ?? '')
    setWon(initial?.won ?? false)
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!deckId) return
    setPending(true)
    setError(null)
    try {
      if (isEdit) {
        await updateGame({
          data: { gameId: initial.id, date, deckId, pod, won },
        })
      } else {
        await createGame({ data: { date, deckId, pod, won } })
      }
      setOpen(false)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save game')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) resetToInitial()
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit game' : 'Log a game'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="game-date">Date</Label>
            <DatePicker id="game-date" value={date} onChange={setDate} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="game-deck">Deck</Label>
            <Select
              value={deckId ? String(deckId) : undefined}
              onValueChange={(v) => setDeckId(Number(v))}
            >
              <SelectTrigger id="game-deck">
                <SelectValue placeholder="Choose a deck" />
              </SelectTrigger>
              <SelectContent>
                {decks.map((deck) => (
                  <SelectItem key={deck.id} value={String(deck.id)}>
                    {deck.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="game-pod">Pod</Label>
            <PodCombobox
              id="game-pod"
              value={pod}
              onChange={setPod}
              options={knownPods}
              placeholder="Friday night group"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="game-won"
              checked={won}
              onCheckedChange={(checked) => setWon(checked === true)}
            />
            <Label htmlFor="game-won" className="font-normal">
              Won this game
            </Label>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !deckId}>
              {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Log game'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
