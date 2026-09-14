// WotC's official Commander Bracket system (1-5) — see roadmap issue #119.
export const POWER_BRACKETS = [1, 2, 3, 4, 5] as const

export type PowerBracket = (typeof POWER_BRACKETS)[number]

export const POWER_BRACKET_LABELS: Record<PowerBracket, string> = {
  1: 'Exhibition',
  2: 'Core',
  3: 'Upgraded',
  4: 'Optimized',
  5: 'cEDH',
}

/** e.g. 3 -> "Bracket 3 · Upgraded"; null -> null. */
export function powerBracketLabel(bracket: number | null): string | null {
  if (bracket === null) return null
  const label = POWER_BRACKET_LABELS[bracket as PowerBracket]
  return label ? `Bracket ${bracket} · ${label}` : `Bracket ${bracket}`
}
