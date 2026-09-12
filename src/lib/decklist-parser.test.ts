import { describe, expect, test } from 'bun:test'
import { parseDecklist } from './decklist-parser'

// Real-shape Moxfield "Export > Plain Text" output, with set code + collector
// number suffixes (as Moxfield includes by default).
const ATRAXA_EXPORT = `1 Sol Ring (SLD) 123★
1 Arcane Signet (ELD) 331
1 Command Tower (M20) 268
1 Smothering Tithe (RNA) 229
1 Cyclonic Rift (RTR) 194
5 Island (MOM) 277

Sideboard
1 Containment Priest (M21) 13

Commander
1 Atraxa, Grand Unifier (ONE) 240`

// A simpler export with no set codes and the mainboard under an explicit
// "Deck" header, commander listed first, and a maybeboard to ignore.
const VOJA_EXPORT = `Commander
1 Voja, Jaws of the Conclave

Deck
1 Sol Ring
1 Beast Within
4x Forest
1 Llanowar Elves

Maybeboard
1 Ram Through`

describe('parseDecklist', () => {
  test('parses a Moxfield export with set codes and a Commander section', () => {
    const result = parseDecklist(ATRAXA_EXPORT)

    expect(result.commanderNames).toEqual(['Atraxa, Grand Unifier'])
    expect(result.entries).toContainEqual({
      name: 'Atraxa, Grand Unifier',
      quantity: 1,
      board: 'commander',
    })
    expect(result.entries).toContainEqual({
      name: 'Sol Ring',
      quantity: 1,
      board: 'mainboard',
    })
    expect(result.entries).toContainEqual({
      name: 'Smothering Tithe',
      quantity: 1,
      board: 'mainboard',
    })
    expect(result.entries).toContainEqual({
      name: 'Island',
      quantity: 5,
      board: 'mainboard',
    })
  })

  test('ignores sideboard entries', () => {
    const result = parseDecklist(ATRAXA_EXPORT)

    expect(result.entries.some((e) => e.name === 'Containment Priest')).toBe(
      false,
    )
  })

  test('strips set code and collector number suffixes from card names', () => {
    const result = parseDecklist(ATRAXA_EXPORT)

    for (const entry of result.entries) {
      expect(entry.name).not.toMatch(/\(/)
    }
  })

  test('parses a bare-format export (no set codes) with commander listed first', () => {
    const result = parseDecklist(VOJA_EXPORT)

    expect(result.commanderNames).toEqual(['Voja, Jaws of the Conclave'])
    expect(result.entries).toContainEqual({
      name: 'Sol Ring',
      quantity: 1,
      board: 'mainboard',
    })
    expect(result.entries).toContainEqual({
      name: 'Forest',
      quantity: 4,
      board: 'mainboard',
    })
  })

  test('ignores maybeboard entries', () => {
    const result = parseDecklist(VOJA_EXPORT)

    expect(result.entries.some((e) => e.name === 'Ram Through')).toBe(false)
  })

  test('total entry count excludes ignored boards', () => {
    const result = parseDecklist(VOJA_EXPORT)

    // Commander + 4 mainboard cards, not the maybeboard card.
    expect(result.entries).toHaveLength(5)
  })

  test('records a warning for an unparseable line instead of throwing', () => {
    const result = parseDecklist('not a valid card line\n1 Sol Ring')

    expect(result.warnings).toHaveLength(1)
    expect(result.entries).toContainEqual({
      name: 'Sol Ring',
      quantity: 1,
      board: 'mainboard',
    })
  })

  test('skips zero-quantity lines', () => {
    const result = parseDecklist('0 Sol Ring\n1 Arcane Signet')

    expect(result.entries).toEqual([
      { name: 'Arcane Signet', quantity: 1, board: 'mainboard' },
    ])
  })

  test('returns empty results for empty input', () => {
    const result = parseDecklist('')

    expect(result.entries).toEqual([])
    expect(result.commanderNames).toEqual([])
    expect(result.warnings).toEqual([])
  })
})
