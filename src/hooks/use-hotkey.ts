import { useEffect } from 'react'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

/**
 * Registers a single-key global shortcut (no modifiers — Ctrl/Cmd/Alt
 * combos are left alone so this never fights a browser or OS shortcut).
 * Ignored while a text input/textarea/select has focus. See
 * docs/PRODUCT.md (Keyboard shortcuts, M5/#64).
 */
export function useHotkey(
  key: string,
  handler: (event: KeyboardEvent) => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      if (event.key !== key) return

      event.preventDefault()
      handler(event)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [key, handler, enabled])
}
