import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  getUnenrichedCards,
  retryEnrichment,
  type UnenrichedCard,
} from '@/server/enrichment-health'

export const Route = createFileRoute('/health')({
  component: HealthPage,
  loader: () => getUnenrichedCards(),
})

function HealthPage() {
  const cards = Route.useLoaderData()
  const router = useRouter()
  const [retryingAll, setRetryingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRetryAll() {
    setRetryingAll(true)
    setError(null)
    try {
      await retryEnrichment({ data: {} })
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry')
    } finally {
      setRetryingAll(false)
    }
  }

  return (
    <main>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-2xl">
            Enrichment health
          </h1>
          <p className="text-muted-foreground text-sm">
            Cards that have never matched on Scryfall — no type, mana cost, or
            image. Visiting any deck that has one already retries it
            automatically; this page is for spotting them without opening every
            deck.
          </p>
        </div>
        {cards.length > 0 && (
          <Button onClick={handleRetryAll} disabled={retryingAll}>
            {retryingAll ? 'Retrying…' : `Retry all (${cards.length})`}
          </Button>
        )}
      </div>

      {error && <p className="mt-2 text-destructive text-sm">{error}</p>}

      {cards.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Everything's enriched. ✓</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {cards.map((card) => (
            <UnenrichedCardRow key={card.id} card={card} />
          ))}
        </ul>
      )}
    </main>
  )
}

function UnenrichedCardRow({ card }: { card: UnenrichedCard }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRetry() {
    setPending(true)
    setError(null)
    try {
      await retryEnrichment({ data: { cardId: card.id } })
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry')
      setPending(false)
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
      <div>
        <p className="font-medium">{card.name}</p>
        <p className="text-muted-foreground text-xs">
          {card.deckNames.length > 0
            ? `In ${card.deckNames.join(', ')}`
            : 'Not in any deck'}
        </p>
        {error && <p className="text-destructive text-xs">{error}</p>}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleRetry}
        disabled={pending}
      >
        {pending ? 'Retrying…' : 'Retry'}
      </Button>
    </li>
  )
}
