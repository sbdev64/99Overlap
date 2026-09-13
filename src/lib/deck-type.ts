export const DECK_TYPES = ['precon', 'custom', 'planning'] as const

export type DeckType = (typeof DECK_TYPES)[number]

export const DECK_TYPE_LABELS: Record<DeckType, string> = {
  precon: 'Precon',
  custom: 'Custom',
  planning: 'Planning',
}
