import { Link } from '@tanstack/react-router'
import { Menu, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { ManaStrip } from '@/components/mana-strip'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const NAV_LINKS = [
  { to: '/', label: 'Import' },
  { to: '/decks', label: 'Decks' },
  { to: '/search', label: 'Search' },
  { to: '/shared', label: 'Shared' },
  { to: '/history', label: 'History' },
  { to: '/stats', label: 'Statistics' },
] as const

/** Persistent header rendered once from the root route — replaces the nav
 * row every page used to repeat individually. See docs/PRODUCT.md #13 /
 * roadmap issue #68. */
export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-card">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link
          to="/"
          className="flex items-center gap-2 font-display font-semibold text-lg"
        >
          <Wand2 className="size-5 text-primary" aria-hidden="true" />
          99Overlap
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-muted-foreground text-sm hover:text-foreground"
              activeOptions={{ exact: link.to === '/' }}
              activeProps={{ className: '!text-primary font-medium' }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle className="font-display">99Overlap</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-2 py-2 text-sm hover:bg-accent"
                  activeOptions={{ exact: link.to === '/' }}
                  activeProps={{ className: '!text-primary font-medium' }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
      <ManaStrip />
    </header>
  )
}
