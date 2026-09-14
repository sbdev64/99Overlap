import { eq } from 'drizzle-orm'
import { cards } from '@/db/schema'
import type { Db } from '@/db/types'
import { COLOR_ORDER } from '@/lib/colors'

// Scryfall's collection endpoint accepts up to 75 identifiers per request
// and is the recommended way to look up many cards at once — far fewer
// requests than one-by-one name lookups. See docs/PRODUCT.md#7.
const COLLECTION_URL = 'https://api.scryfall.com/cards/collection'
const BATCH_SIZE = 75
// Only relevant when more than one batch is needed; still polite per
// Scryfall's rate-limiting guidance (~50-100ms between requests).
const BATCH_DELAY_MS = 100

interface ScryfallCardFace {
  mana_cost?: string
  image_uris?: { normal?: string }
}

interface ScryfallCard {
  name: string
  id: string
  mana_cost?: string
  cmc?: number
  type_line?: string
  color_identity?: string[]
  image_uris?: { normal?: string }
  card_faces?: ScryfallCardFace[]
}

interface ScryfallCollectionResponse {
  data: ScryfallCard[]
}

export interface CardEnrichment {
  scryfallId: string
  manaCost: string | null
  cmc: number | null
  typeLine: string | null
  colorIdentity: string
  imageUrl: string | null
}

function toEnrichment(card: ScryfallCard): CardEnrichment {
  const frontFace = card.card_faces?.[0]
  return {
    scryfallId: card.id,
    manaCost: card.mana_cost ?? frontFace?.mana_cost ?? null,
    cmc: card.cmc ?? null,
    typeLine: card.type_line ?? null,
    colorIdentity: COLOR_ORDER.filter((c) =>
      card.color_identity?.includes(c),
    ).join(','),
    imageUrl: card.image_uris?.normal ?? frontFace?.image_uris?.normal ?? null,
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Scryfall's collection endpoint can return a card under its own canonical
// spelling even when the identifier we sent differs in punctuation only
// (e.g. we send "Atraxa, Praetor's Voice", it returns "Atraxa, Praetors'
// Voice"). Stripping everything but letters/digits before matching makes
// the lookup robust to that instead of silently missing the card.
function normalizeForMatch(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Moxfield (and this app's Card.name) stores a double-faced card's full
// "Front // Back" display name, but Scryfall's collection endpoint only
// ever recognizes such a card by its front face alone — querying the
// combined string returns not_found even though the card exists. See
// roadmap issue #89 (confirmed against the real API: neither "Delver of
// Secrets // Insectile Aberration" nor "Lunarch Veteran // Luminous
// Phantom" match as combined strings, only "Delver of Secrets" /
// "Lunarch Veteran" do). Scryfall's response still carries the full
// combined name, so no change is needed on the matching side below.
//
// The separator isn't always Scryfall's canonical double slash, though —
// confirmed against the real production DB, at least one card was stored as
// "Lunarch Veteran / Luminous Phantom" (a single slash), so the split must
// tolerate both. See roadmap issue #100.
export function scryfallQueryName(name: string): string {
  return name.split(/\s+\/{1,2}\s+/)[0] ?? name
}

/**
 * Looks up `names` on Scryfall (batched, name-based) and returns whatever
 * was found, keyed by normalized name (see normalizeForMatch). Best-effort:
 * a network failure logs a warning and returns whatever batches succeeded
 * rather than throwing — enrichment is a nice-to-have and must never block
 * an import.
 */
async function fetchEnrichment(
  names: string[],
): Promise<Map<string, CardEnrichment>> {
  const found = new Map<string, CardEnrichment>()

  for (let i = 0; i < names.length; i += BATCH_SIZE) {
    const batch = names.slice(i, i + BATCH_SIZE)
    if (i > 0) await sleep(BATCH_DELAY_MS)

    try {
      const res = await fetch(COLLECTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifiers: batch.map((name) => ({ name: scryfallQueryName(name) })),
        }),
      })
      if (!res.ok) {
        console.warn(`Scryfall enrichment batch failed: HTTP ${res.status}`)
        continue
      }
      const body: ScryfallCollectionResponse = await res.json()
      for (const card of body.data) {
        found.set(normalizeForMatch(card.name), toEnrichment(card))
      }
    } catch (err) {
      console.warn('Scryfall enrichment batch failed:', err)
    }
  }

  return found
}

/**
 * Looks up and writes Scryfall metadata for `targets` that don't have it
 * yet. Used both right after import (new Card rows) and lazily when a deck
 * page is viewed (backfills cards imported before this feature existed).
 * Never throws — see fetchEnrichment.
 */
export async function enrichCards(
  db: Db,
  targets: { id: number; name: string }[],
): Promise<void> {
  if (targets.length === 0) return

  const enrichmentByName = await fetchEnrichment(
    targets.map((target) => target.name),
  )
  if (enrichmentByName.size === 0) return

  for (const target of targets) {
    const enrichment = enrichmentByName.get(normalizeForMatch(target.name))
    if (!enrichment) continue

    await db.update(cards).set(enrichment).where(eq(cards.id, target.id))
  }
}
