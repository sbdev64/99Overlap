import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useHotkey } from '@/hooks/use-hotkey'

const SHORTCUTS = [
  { key: '/', description: 'Search cards' },
  { key: 'n', description: 'Log a game (on the history page)' },
  { key: '?', description: 'Show this list' },
]

/**
 * Mounted once at the root layout. Owns the global shortcuts that make
 * sense from anywhere (search, help) — page-specific ones like "n" to log
 * a game are registered by the page itself. See docs/PRODUCT.md, roadmap
 * issue #64.
 */
export function GlobalHotkeys() {
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const [helpOpen, setHelpOpen] = useState(false)

  const focusOrGoToSearch = useCallback(() => {
    if (pathname === '/search') {
      document.getElementById('search-input')?.focus()
    } else {
      navigate({ to: '/search' })
    }
  }, [pathname, navigate])

  useHotkey('/', focusOrGoToSearch)
  useHotkey('?', () => setHelpOpen(true))

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Ignored while typing in a text field.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2 text-sm">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.key} className="flex items-center gap-3">
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                {shortcut.key}
              </kbd>
              <span>{shortcut.description}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
