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

// Every WUBRG-ordered color-identity string mapped to Magic's official/
// community name for that combination — the 10 two-color guilds, the 10
// three-color shards (allied) and wedges (enemy), the 5 four-color "Nephilim"
// names (from the Guildpact cycle, named for the excluded color), and
// five-color. Mono colors and colorless fall back to COLOR_NAMES/"Colorless"
// below rather than needing an entry here. Used for deck-level display only
// (roadmap issue #124) — `colorIdentityLabel` above (plain color-name join)
// is left as-is for per-card grouping headers, a different, unrelated use.
const COLOR_IDENTITY_NAMES: Record<string, string> = {
  // Two-color guilds
  'W,U': 'Azorius',
  'W,B': 'Orzhov',
  'W,R': 'Boros',
  'W,G': 'Selesnya',
  'U,B': 'Dimir',
  'U,R': 'Izzet',
  'U,G': 'Simic',
  'B,R': 'Rakdos',
  'B,G': 'Golgari',
  'R,G': 'Gruul',
  // Three-color shards (allied) and wedges (enemy)
  'W,U,B': 'Esper',
  'W,U,R': 'Jeskai',
  'W,U,G': 'Bant',
  'W,B,R': 'Mardu',
  'W,B,G': 'Abzan',
  'W,R,G': 'Naya',
  'U,B,R': 'Grixis',
  'U,B,G': 'Sultai',
  'U,R,G': 'Temur',
  'B,R,G': 'Jund',
  // Four-color "Nephilim", named for the excluded color
  'W,U,B,R': 'Yore-Tiller',
  'W,U,B,G': 'Witch-Maw',
  'W,U,R,G': 'Ink-Treader',
  'W,B,R,G': 'Dune-Brood',
  'U,B,R,G': 'Glint-Eye',
  // Five-color
  'W,U,B,R,G': 'Five-Color',
}

/** Deck-level color identity display: the official guild/shard/wedge/
 * four-color/five-color name where one exists (e.g. "W,U,G" -> "Bant"),
 * falling back to the plain color name for mono/colorless. See roadmap
 * issue #124. */
export function colorIdentityName(colorIdentity: string | null): string {
  if (colorIdentity === null) return 'Unknown'
  if (colorIdentity === '') return 'Colorless'
  return (
    COLOR_IDENTITY_NAMES[colorIdentity] ?? colorIdentityLabel(colorIdentity)
  )
}
