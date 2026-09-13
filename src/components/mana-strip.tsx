/** Small decorative accent strip in the five MTG mana colors — the one
 * "wizard-like" flourish per docs/PRODUCT.md #13 / roadmap issue #68, kept
 * flat and minimal rather than skeuomorphic. */
export function ManaStrip() {
  return (
    <div className="mana-strip" aria-hidden="true">
      <span style={{ backgroundColor: 'var(--mana-w)' }} />
      <span style={{ backgroundColor: 'var(--mana-u)' }} />
      <span style={{ backgroundColor: 'var(--mana-b)' }} />
      <span style={{ backgroundColor: 'var(--mana-r)' }} />
      <span style={{ backgroundColor: 'var(--mana-g)' }} />
    </div>
  )
}
