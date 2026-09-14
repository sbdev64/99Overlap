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

// This is what the user's own Moxfield paste actually looks like: no section
// headers at all, first card is the commander (see the module doc).
const OBEKA_EXPORT = `1 Obeka, Splitter of Seconds (OTJ) 222
1 Aarakocra Sneak (CLB) 54
1 Aether Tunnel (M19) 43`

// A real Partner deck paste: two commanders as the first two lines, no
// header distinguishing them from the mainboard.
const KEDISS_MALCOLM_EXPORT = `1 Kediss, Emberclaw Familiar (CMR) 188
1 Malcolm, Keen-Eyed Navigator (LCC) 161
1 Abrade (TDC) 203
1 Alchemist's Gambit (VOW) 140`

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

  test('strips a set code followed by both a collector number and a separate foil marker', () => {
    // A collector number and a standalone `*F*` foil marker are two
    // trailing tokens, not one — see roadmap issue #113.
    const result = parseDecklist(
      "1 Herald's Horn (FIC) 228 *F*\n1 Lyra Dawnbringer (FDN) 707 *F*",
      { commanderCount: 0 },
    )

    expect(result.entries).toContainEqual({
      name: "Herald's Horn",
      quantity: 1,
      board: 'mainboard',
    })
    expect(result.entries).toContainEqual({
      name: 'Lyra Dawnbringer',
      quantity: 1,
      board: 'mainboard',
    })
  })

  test("warns when a set code outside SET_SUFFIX's 2-6 char range leaves a residual parenthesis", () => {
    // Defense in depth for whatever edge case we haven't hit yet — see
    // roadmap issue #121.
    const result = parseDecklist('1 Some Card (VERYLONGCODE) 123', {
      commanderCount: 0,
    })

    expect(result.entries).toContainEqual({
      name: 'Some Card (VERYLONGCODE) 123',
      quantity: 1,
      board: 'mainboard',
    })
    expect(result.warnings).toContainEqual(
      expect.stringContaining('Some Card (VERYLONGCODE) 123'),
    )
  })

  test('does not warn on a normal Moxfield export with set codes stripped cleanly', () => {
    const result = parseDecklist(ATRAXA_EXPORT)
    expect(result.warnings).toEqual([])
  })

  test('parses a bare-format export (no set codes) with an explicit Commander header', () => {
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

  test('treats the first card as the commander when there is no header at all (real Moxfield paste shape)', () => {
    const result = parseDecklist(OBEKA_EXPORT)

    expect(result.commanderNames).toEqual(['Obeka, Splitter of Seconds'])
    expect(result.entries).toEqual([
      { name: 'Obeka, Splitter of Seconds', quantity: 1, board: 'commander' },
      { name: 'Aarakocra Sneak', quantity: 1, board: 'mainboard' },
      { name: 'Aether Tunnel', quantity: 1, board: 'mainboard' },
    ])
  })

  test('first-card-is-commander still respects a later explicit Sideboard header', () => {
    const result = parseDecklist(
      '1 Obeka, Splitter of Seconds (OTJ) 222\n1 Sol Ring (SLD) 123\n\nSideboard\n1 Containment Priest (M21) 13',
    )

    expect(result.commanderNames).toEqual(['Obeka, Splitter of Seconds'])
    expect(result.entries.some((e) => e.name === 'Containment Priest')).toBe(
      false,
    )
    expect(result.entries).toContainEqual({
      name: 'Sol Ring',
      quantity: 1,
      board: 'mainboard',
    })
  })

  test('records a warning for an unparseable line instead of throwing', () => {
    const result = parseDecklist('not a valid card line\n1 Sol Ring')

    expect(result.warnings).toHaveLength(1)
    // No "Commander" header anywhere, so the first real card line (Sol Ring)
    // is treated as the commander.
    expect(result.entries).toContainEqual({
      name: 'Sol Ring',
      quantity: 1,
      board: 'commander',
    })
  })

  test('skips zero-quantity lines without counting them as the commander', () => {
    const result = parseDecklist('0 Sol Ring\n1 Arcane Signet')

    expect(result.entries).toEqual([
      { name: 'Arcane Signet', quantity: 1, board: 'commander' },
    ])
  })

  test('with commanderCount: 2, treats the first two lines as commanders (real Partner deck paste)', () => {
    const result = parseDecklist(KEDISS_MALCOLM_EXPORT, { commanderCount: 2 })

    expect(result.commanderNames).toEqual([
      'Kediss, Emberclaw Familiar',
      'Malcolm, Keen-Eyed Navigator',
    ])
    expect(result.entries).toEqual([
      {
        name: 'Kediss, Emberclaw Familiar',
        quantity: 1,
        board: 'commander',
      },
      {
        name: 'Malcolm, Keen-Eyed Navigator',
        quantity: 1,
        board: 'commander',
      },
      { name: 'Abrade', quantity: 1, board: 'mainboard' },
      { name: "Alchemist's Gambit", quantity: 1, board: 'mainboard' },
    ])
  })

  test('without commanderCount, a two-commander paste only treats the first line as commander (default unaffected)', () => {
    const result = parseDecklist(KEDISS_MALCOLM_EXPORT)

    expect(result.commanderNames).toEqual(['Kediss, Emberclaw Familiar'])
    expect(result.entries).toContainEqual({
      name: 'Malcolm, Keen-Eyed Navigator',
      quantity: 1,
      board: 'mainboard',
    })
  })

  test('an explicit Commander header takes priority over commanderCount', () => {
    const result = parseDecklist(
      'Commander\n1 Kediss, Emberclaw Familiar\n1 Malcolm, Keen-Eyed Navigator\n\nDeck\n1 Abrade',
      { commanderCount: 1 },
    )

    expect(result.commanderNames).toEqual([
      'Kediss, Emberclaw Familiar',
      'Malcolm, Keen-Eyed Navigator',
    ])
  })

  test('returns empty results for empty input', () => {
    const result = parseDecklist('')

    expect(result.entries).toEqual([])
    expect(result.commanderNames).toEqual([])
    expect(result.warnings).toEqual([])
  })
})
