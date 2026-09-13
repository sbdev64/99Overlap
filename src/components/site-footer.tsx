import { ManaStrip } from '@/components/mana-strip'

/** Persistent footer rendered once from the root route. See
 * docs/PRODUCT.md #13 / roadmap issue #68. */
export function SiteFooter() {
  return (
    <footer className="mt-auto">
      <ManaStrip />
      <p className="mx-auto max-w-4xl px-4 py-4 text-center text-muted-foreground text-xs">
        99Overlap — a personal Commander deck &amp; shared-card tracker.
      </p>
    </footer>
  )
}
