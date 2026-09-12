/**
 * Parses a Moxfield plain-text decklist export.
 *
 * Only "commander" and "mainboard" entries are returned — sideboard,
 * maybeboard, companion, and tokens are parsed away, since they don't count
 * toward overlap/staple tracking. See
 * docs/PRODUCT.md#boards-what-counts-toward-overlap.
 *
 * Expected shape (confirmed against several independent third-party
 * Moxfield parsers — see the decision log in docs/PRODUCT.md):
 *
 *   1 Sol Ring
 *   1 Arcane Signet (SLD) 123
 *
 *   Commander
 *   1 Atraxa, Grand Unifier
 *
 * Section header lines are standalone (case-insensitive, optional trailing
 * colon). Card lines are `<qty>[x] <name>[ (SETCODE) collector#]` — the set
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
// Strips a trailing `(SETCODE) collector#` suffix (and any foil marker after
// it), e.g. `Sol Ring (SLD) 123★` -> `Sol Ring`.
const SET_SUFFIX = /^(.+?)\s+\([A-Za-z0-9]{2,6}\)(?:\s+\S+)?\s*$/

export function parseDecklist(text: string): ParsedDecklist {
  const entries: ParsedCardEntry[] = []
  const commanderNames: string[] = []
  const warnings: string[] = []

  let currentSection: TrackedBoard | IgnoredBoard = 'mainboard'
  let sawExplicitHeader = false
  let sawBlankSinceLastCard = false

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()

    if (!line) {
      sawBlankSinceLastCard = true
      continue
    }
    if (line.startsWith('//') || line.startsWith('#')) {
      continue
    }

    const headerKey = line.toLowerCase().replace(/:$/, '')
    const header = SECTION_HEADERS[headerKey]
    if (header) {
      currentSection = header
      sawExplicitHeader = true
      sawBlankSinceLastCard = false
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

    // Without an explicit section header, a blank line separates the
    // mainboard from whatever follows (Moxfield's simplest export has no
    // headers at all for a single-board list).
    let section = currentSection
    if (!sawExplicitHeader && sawBlankSinceLastCard) {
      section = 'sideboard'
    }
    sawBlankSinceLastCard = false

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
