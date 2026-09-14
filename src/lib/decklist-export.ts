import type { TrackedBoard } from './decklist-parser'

export interface ExportableCard {
  name: string
  quantity: number
  board: TrackedBoard
}

/**
 * Renders a deck's current cards back to Moxfield-style plain text, with
 * explicit `Commander`/`Deck` section headers so it round-trips through
 * `parseDecklist` regardless of the deck's `commanderCount` — see roadmap
 * issue #123.
 */
export function exportDecklist(cards: ExportableCard[]): string {
  const commanders = cards.filter((card) => card.board === 'commander')
  const mainboard = cards.filter((card) => card.board === 'mainboard')

  const sections: string[] = []
  if (commanders.length > 0) {
    sections.push(['Commander', ...commanders.map(cardLine)].join('\n'))
  }
  if (mainboard.length > 0) {
    sections.push(['Deck', ...mainboard.map(cardLine)].join('\n'))
  }

  return sections.join('\n\n')
}

function cardLine(card: ExportableCard): string {
  return `${card.quantity} ${card.name}`
}
