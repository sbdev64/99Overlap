import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import {
  type ColumnDef,
  createSortedRowModel,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { useMemo, useRef, useState } from 'react'
import { Combobox } from '@/components/combobox'
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
import { useHotkey } from '@/hooks/use-hotkey'
import { toDisplayDate, toIsoDate } from '@/lib/date-format'
import { createGame } from '@/server/create-game'
import { type DeckSummary, listDecks } from '@/server/decks'
import { deleteGame } from '@/server/delete-game'
import { type GameEntry, listGames } from '@/server/games'
import { listPods } from '@/server/pods'
import { updateGame } from '@/server/update-game'

export const Route = createFileRoute('/history')({
  component: HistoryPage,
  loader: async () => {
    const [games, decks, pods] = await Promise.all([
      listGames(),
      listDecks(),
      listPods(),
    ])
    return { games, decks, pods }
  },
})

// Doesn't depend on props/data, so it's built once — see the "Features are
// opt-in" note in TanStack Table v9's migration guide (this replaces v8's
// `getSortedRowModel()` passed directly to `useReactTable`).
const tableFeaturesConfig = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
})

function HistoryPage() {
  const { games, decks, pods: knownPods } = Route.useLoaderData()
  const router = useRouter()
  const addGameTriggerRef = useRef<HTMLButtonElement>(null)
  useHotkey('n', () => addGameTriggerRef.current?.click())

  const columns = useMemo<ColumnDef<typeof tableFeaturesConfig, GameEntry>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ row }) => toDisplayDate(row.original.date),
      },
      {
        accessorKey: 'deckName',
        header: 'Deck',
        cell: ({ row }) =>
          row.original.deckId ? (
            <Link
              to="/decks/$deckId"
              params={{ deckId: String(row.original.deckId) }}
              className="underline"
            >
              {row.original.deckName}
            </Link>
          ) : (
            <span className="text-muted-foreground">
              {row.original.deckName} (deleted)
            </span>
          ),
      },
      {
        accessorKey: 'pod',
        header: 'Pod',
      },
      {
        accessorKey: 'won',
        header: 'Won',
        cell: ({ row }) =>
          row.original.won && (
            <span className="rounded bg-green-200 px-1.5 py-0.5 text-xs dark:bg-green-900">
              Won
            </span>
          ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <GameRowActions
            game={row.original}
            decks={decks}
            knownPods={knownPods}
            onChanged={() => router.invalidate()}
          />
        ),
      },
    ],
    [decks, knownPods, router],
  )

  const table = useTable({
    key: 'history-table',
    features: tableFeaturesConfig,
    columns,
    data: games,
  })

  return (
    <main>
      <h1 className="font-display font-semibold text-2xl">Game history</h1>
      <p className="text-muted-foreground">
        Track when and where you played each deck.
      </p>

      <GameDialog
        trigger={
          <Button
            ref={addGameTriggerRef}
            className="mt-4"
            disabled={decks.length === 0}
          >
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
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="py-2 pr-4 font-medium"
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                      cursor: header.column.getCanSort()
                        ? 'pointer'
                        : undefined,
                    }}
                  >
                    <table.FlexRender header={header} />
                    {
                      {
                        asc: ' ▲',
                        desc: ' ▼',
                      }[header.column.getIsSorted() as string]
                    }
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b">
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className="py-2 pr-4">
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}

function GameRowActions({
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
              This only removes the history row — it doesn't affect the deck or
              any shared-card tracking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-destructive text-sm">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
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
            <Combobox
              id="game-deck"
              value={deckId ? String(deckId) : ''}
              onChange={(v) => setDeckId(Number(v))}
              options={decks.map((deck) => ({
                value: String(deck.id),
                label: deck.name,
              }))}
              placeholder="Choose a deck"
            />
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
