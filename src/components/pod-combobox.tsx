import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/** A free-text pod field with a styled autocomplete dropdown of previously
 * used pod names — not a strict select, any typed value is accepted. See
 * the "Game.pod is free text" decision in docs/PRODUCT.md. */
export function PodCombobox({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)

  const filtered = options.filter((option) =>
    option.toLowerCase().includes(value.trim().toLowerCase()),
  )
  const showSuggestions = open && filtered.length > 0

  return (
    <Popover open={showSuggestions}>
      <PopoverAnchor asChild>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder={placeholder}
          autoComplete="off"
          required
        />
      </PopoverAnchor>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-1"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ul className="flex max-h-48 flex-col overflow-y-auto">
          {filtered.map((option) => (
            <li key={option}>
              <button
                type="button"
                className={cn(
                  'w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                )}
                // onMouseDown (not onClick) fires before the input's onBlur
                // closes the popover, so the click actually registers.
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(option)
                  setOpen(false)
                }}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
