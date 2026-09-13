// WUBRG order, matching how Scryfall orders color_identity arrays and how
// Card.colorIdentity/Deck.colorIdentity are stored (comma-separated
// letters, e.g. "W,U"; "" for colorless). See docs/PRODUCT.md#7.
export const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G'] as const

/** Unions one or more colorIdentity strings into a single WUBRG-ordered one. */
export function mergeColorIdentities(identities: string[]): string {
  const colors = new Set<string>()
  for (const identity of identities) {
    for (const letter of identity.split(',')) {
      if (letter) colors.add(letter)
    }
  }
  return COLOR_ORDER.filter((color) => colors.has(color)).join(',')
}

const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
}

/** e.g. "W,U" -> "White/Blue"; "" -> "Colorless"; null -> "Unknown". */
export function colorIdentityLabel(colorIdentity: string | null): string {
  if (colorIdentity === null) return 'Unknown'
  if (colorIdentity === '') return 'Colorless'
  return colorIdentity
    .split(',')
    .map((letter) => COLOR_NAMES[letter] ?? letter)
    .join('/')
}
