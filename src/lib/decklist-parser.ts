/**
 * Parses a Moxfield plain-text decklist export.
 *
 * Only "commander" and "mainboard" entries are returned — sideboard,
 * maybeboard, companion, and tokens are parsed away, since they don't count
 * toward overlap/shared-card tracking. See
 * docs/PRODUCT.md#boards-what-counts-toward-overlap.
 *
 * Moxfield's plain "copy the decklist text" output (confirmed against the
 * user's own real pastes) has no section headers at all — it's a flat list
 * where the first card line is always the commander:
 *
 *   1 Obeka, Splitter of Seconds (OTJ) 222
 *   1 Aarakocra Sneak (CLB) 54
 *   1 Aether Tunnel (M19) 43
 *
 * Partner/Background decks paste the same way, just with **two** commander
 * lines up front (confirmed against a real example: Kediss, Emberclaw
 * Familiar / Malcolm, Keen-Eyed Navigator, both first, no header). There's
 * no way to tell from the text alone whether line 2 is a second commander
 * or the first mainboard card, so the caller must say how many commander
 * lines to expect via `commanderCount` (see docs/PRODUCT.md#5b and the
 * decision log) — the deck import/edit UI exposes this as a checkbox.
 *
 * Some export modes (and other sites) instead use standalone header lines
 * (`Commander`, `Deck`/`Mainboard`, `Sideboard`, `Maybeboard`, `Companion`,
 * case-insensitive, optional trailing colon) to mark sections explicitly —
 * this is also supported, and takes priority over `commanderCount` whenever
 * a `Commander` header is present anywhere in the input (every line under
 * it counts as a commander, however many there are).
 *
 * Card lines are `<qty>[x] <name>[ (SETCODE) collector#]` — the set
 * code/collector number suffix, when present, is stripped since we only
 * track cards by name.
 */

export type TrackedBoard = 'commander' | 'mainboard'

export interface ParsedCardEntry {
  name: string
  quantity: number
  board: TrackedBoard
}

export interface ParsedDecklist {
  /** Only commander + mainboard entries, in the order they appeared. */
  entries: ParsedCardEntry[]
  /** Commander card name(s), for display purposes (Deck.commanderName). */
  commanderNames: string[]
  /** Lines that couldn't be parsed as a card line. */
  warnings: string[]
}

export interface ParseDecklistOptions {
  /** How many leading card lines are commanders when there's no explicit
   * `Commander` header (1, or 2 for Partner/Background). Defaults to 1. */
  commanderCount?: number
}

type IgnoredBoard = 'sideboard' | 'maybeboard' | 'companion' | 'tokens'

const SECTION_HEADERS: Record<string, TrackedBoard | IgnoredBoard> = {
  commander: 'commander',
  commanders: 'commander',
  deck: 'mainboard',
  main: 'mainboard',
  maindeck: 'mainboard',
  'main deck': 'mainboard',
  mainboard: 'mainboard',
  sideboard: 'sideboard',
  side: 'sideboard',
  maybeboard: 'maybeboard',
  maybe: 'maybeboard',
  companion: 'companion',
  companions: 'companion',
  tokens: 'tokens',
}

// `4 Card Name` or `4x Card Name`
const CARD_LINE = /^(\d+)\s*x?\s+(.+)$/i
// Strips a trailing `(SETCODE)` and everything after it — a collector
// number, a foil marker, or both (e.g. `Sol Ring (SLD) 123★` -> `Sol Ring`,
// and `Herald's Horn (FIC) 228 *F*` -> `Herald's Horn`; a collector number
// *and* a separate foil marker are two trailing tokens, not one — see
// roadmap issue #113, confirmed this left the whole suffix stuck to the
// name, which then could never match on Scryfall).
const SET_SUFFIX = /^(.+?)\s+\([A-Za-z0-9]{2,6}\)(?:\s+\S+)*\s*$/

function normalizeHeader(line: string) {
  return line.toLowerCase().replace(/:$/, '')
}

export function parseDecklist(
  text: string,
  options: ParseDecklistOptions = {},
): ParsedDecklist {
  const commanderCount = options.commanderCount ?? 1

  const entries: ParsedCardEntry[] = []
  const commanderNames: string[] = []
  const warnings: string[] = []

  const lines = text.split('\n')
  const hasExplicitCommanderHeader = lines.some(
    (line) => SECTION_HEADERS[normalizeHeader(line.trim())] === 'commander',
  )

  let currentSection: TrackedBoard | IgnoredBoard = 'mainboard'
  let commanderLinesSeen = 0

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line || line.startsWith('//') || line.startsWith('#')) {
      continue
    }

    const header = SECTION_HEADERS[normalizeHeader(line)]
    if (header) {
      currentSection = header
      continue
    }

    const match = CARD_LINE.exec(line)
    if (!match) {
      warnings.push(`Could not parse line: ${JSON.stringify(rawLine)}`)
      continue
    }

    const quantity = Number.parseInt(match[1], 10)
    if (quantity <= 0) continue

    const rest = match[2].trim()
    const setMatch = SET_SUFFIX.exec(rest)
    const name = (setMatch ? setMatch[1] : rest).trim()
    if (!name) continue

    // With no explicit "Commander" header anywhere in the input, the first
    // `commanderCount` card lines in the whole paste are the commander(s)
    // (see module doc).
    const section =
      !hasExplicitCommanderHeader && commanderLinesSeen < commanderCount
        ? 'commander'
        : currentSection
    if (!hasExplicitCommanderHeader && section === 'commander') {
      commanderLinesSeen += 1
    }

    if (section === 'commander') {
      commanderNames.push(name)
      entries.push({ name, quantity, board: 'commander' })
    } else if (section === 'mainboard') {
      entries.push({ name, quantity, board: 'mainboard' })
    }
    // sideboard / maybeboard / companion / tokens are parsed but dropped.
  }

  return { entries, commanderNames, warnings }
}
