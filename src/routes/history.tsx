import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createGame } from '@/server/create-game'
import { listDecks } from '@/server/decks'
import { listGames } from '@/server/games'

export const Route = createFileRoute('/history')({
  component: HistoryPage,
  loader: async () => {
    const [games, decks] = await Promise.all([listGames(), listDecks()])
    return { games, decks }
  },
})

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function HistoryPage() {
  const { games, decks } = Route.useLoaderData()
  const router = useRouter()
  const knownPods = useMemo(
    () => Array.from(new Set(games.map((game) => game.pod))).sort(),
    [games],
  )

  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(todayIsoDate())
  const [deckId, setDeckId] = useState(decks[0]?.id)
  const [pod, setPod] = useState('')
  const [won, setWon] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!deckId) return
    setPending(true)
    setError(null)
    try {
      await createGame({ data: { date, deckId, pod, won } })
      setOpen(false)
      setPod('')
      setWon(false)
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log game')
    } finally {
      setPending(false)
    }
  }

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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            className="mt-4"
            disabled={decks.length === 0}
            onClick={() => {
              setDate(todayIsoDate())
              setDeckId(decks[0]?.id)
              setPod('')
              setWon(false)
              setError(null)
            }}
          >
            Add game
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log a game</DialogTitle>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="game-date">Date</Label>
              <Input
                id="game-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="game-deck">Deck</Label>
              <select
                id="game-deck"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={deckId}
                onChange={(e) => setDeckId(Number(e.target.value))}
              >
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="game-pod">Pod</Label>
              <Input
                id="game-pod"
                list="pod-options"
                value={pod}
                onChange={(e) => setPod(e.target.value)}
                placeholder="Friday night group"
                required
              />
              <datalist id="pod-options">
                {knownPods.map((podName) => (
                  <option key={podName} value={podName} />
                ))}
              </datalist>
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
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Log game'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              <th className="py-2 font-medium">Won</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr key={game.id} className="border-b">
                <td className="py-2 pr-4">{game.date}</td>
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
                <td className="py-2">
                  {game.won && (
                    <span className="rounded bg-green-200 px-1.5 py-0.5 text-xs dark:bg-green-900">
                      Won
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
