import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Light/dark toggle. The actual theme is applied by a synchronous inline
 * script in `__root.tsx` (before paint, to avoid a flash of the wrong
 * theme) — this component just reflects and updates it after mount. State
 * starts as 'light' unconditionally (matching what the server always
 * renders) and is corrected in an effect once the DOM's real class is
 * readable, rather than read during the initial render, to avoid a
 * hydration mismatch. See docs/PRODUCT.md #17.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    setTheme(
      document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    )
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    window.localStorage.setItem('theme', next)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      }
      onClick={toggle}
    >
      {theme === 'dark' ? (
        <Sun className="size-5" aria-hidden="true" />
      ) : (
        <Moon className="size-5" aria-hidden="true" />
      )}
    </Button>
  )
}
