import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { type ImportDeckResult, importDeck } from '@/server/import-deck'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [name, setName] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [hasTwoCommanders, setHasTwoCommanders] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportDeckResult | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    setResult(null)
    try {
      const imported = await importDeck({
        data: {
          name,
          sourceText,
          commanderCount: hasTwoCommanders ? 2 : 1,
        },
      })
      setResult(imported)
      setName('')
      setSourceText('')
      setHasTwoCommanders(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import deck')
    } finally {
      setPending(false)
    }
  }

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">99Overlap</h1>
        <div className="flex gap-4">
          <Link to="/decks" className="text-sm underline">
            View saved decks
          </Link>
          <Link to="/search" className="text-sm underline">
            Search cards
          </Link>
          <Link to="/history" className="text-sm underline">
            Game history
          </Link>
        </div>
      </div>
      <p className="text-muted-foreground">
        Paste a decklist copied from Moxfield to import it.
      </p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="deck-name">Deck name</Label>
          <Input
            id="deck-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Obeka, Splitter of Seconds"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="deck-text">Decklist</Label>
          <Textarea
            id="deck-text"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder={
              '1 Obeka, Splitter of Seconds (OTJ) 222\n1 Aarakocra Sneak (CLB) 54\n1 Aether Tunnel (M19) 43'
            }
            rows={12}
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="two-commanders"
            checked={hasTwoCommanders}
            onCheckedChange={(checked) => setHasTwoCommanders(checked === true)}
          />
          <Label htmlFor="two-commanders" className="font-normal">
            This deck has two commanders (Partner/Background) — the first two
            lines of the paste are both commanders
          </Label>
        </div>

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? 'Importing…' : 'Import deck'}
        </Button>
      </form>

      {error && <p className="mt-4 text-destructive">{error}</p>}

      {result && (
        <div className="mt-4 rounded-md border border-border p-4">
          <p className="font-medium">
            Imported "{result.deckName}"
            {result.commanderName ? ` (${result.commanderName})` : ''}
          </p>
          <p className="text-muted-foreground text-sm">
            {result.cardCount} cards, {result.newCardCount} new cards created
          </p>
          {result.warnings.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-destructive">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  )
}
