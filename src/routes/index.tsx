import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { DECK_TYPE_LABELS, DECK_TYPES, type DeckType } from '@/lib/deck-type'
import { type ImportDeckResult, importDeck } from '@/server/import-deck'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [name, setName] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [hasTwoCommanders, setHasTwoCommanders] = useState(false)
  const [type, setType] = useState<DeckType>('custom')
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
          type,
        },
      })
      setResult(imported)
      setName('')
      setSourceText('')
      setHasTwoCommanders(false)
      setType('custom')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import deck')
    } finally {
      setPending(false)
    }
  }

  return (
    <main>
      <h1 className="font-display font-semibold text-2xl">Import a deck</h1>
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
          <Label htmlFor="deck-type">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as DeckType)}>
            <SelectTrigger id="deck-type" className="w-48">
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
          <p className="text-muted-foreground text-xs">
            Planning = wanted but not owned yet — doesn't count as "owned" for
            the already-own-this-card check.
          </p>
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
            {DECK_TYPE_LABELS[result.type]}
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
