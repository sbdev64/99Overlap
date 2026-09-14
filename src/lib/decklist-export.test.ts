import { describe, expect, test } from 'bun:test'
import { exportDecklist } from './decklist-export'
import { parseDecklist } from './decklist-parser'

describe('exportDecklist', () => {
  test('renders explicit Commander/Deck sections', () => {
    const text = exportDecklist([
      { name: 'Krenko, Mob Boss', quantity: 1, board: 'commander' },
      { name: 'Sol Ring', quantity: 1, board: 'mainboard' },
      { name: 'Forest', quantity: 5, board: 'mainboard' },
    ])

    expect(text).toBe(
      'Commander\n1 Krenko, Mob Boss\n\nDeck\n1 Sol Ring\n5 Forest',
    )
  })

  test('omits a section entirely when it has no cards', () => {
    expect(
      exportDecklist([{ name: 'Sol Ring', quantity: 1, board: 'mainboard' }]),
    ).toBe('Deck\n1 Sol Ring')
  })

  test('round-trips through parseDecklist regardless of commanderCount', () => {
    const original = [
      { name: 'Kediss, Emberclaw Familiar', quantity: 1, board: 'commander' },
      {
        name: 'Malcolm, Keen-Eyed Navigator',
        quantity: 1,
        board: 'commander',
      },
      { name: 'Sol Ring', quantity: 1, board: 'mainboard' },
    ] as const

    const text = exportDecklist([...original])
    // commanderCount is irrelevant here — the explicit "Commander" header
    // takes priority over it (see decklist-parser.ts's module doc).
    const reparsed = parseDecklist(text, { commanderCount: 1 })

    expect(reparsed.entries).toEqual(
      original.map(({ name, quantity, board }) => ({ name, quantity, board })),
    )
  })
})
