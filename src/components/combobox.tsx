import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
}

/**
 * A typeable, styled picker that (unlike `PodCombobox`) only accepts a
 * value from `options` — typing filters the list, it never creates a new
 * value. Shares `PodCombobox`'s Popover+Input interaction pattern so both
 * read as the same control. See roadmap issue #70.
 */
export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
}) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? ''
  const [query, setQuery] = useState(selectedLabel)
  const [open, setOpen] = useState(false)

  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  )
  const showSuggestions = open && filtered.length > 0

  function selectOption(option: ComboboxOption) {
    onChange(option.value)
    setQuery(option.label)
    setOpen(false)
  }

  return (
    <Popover open={showSuggestions}>
      <PopoverAnchor asChild>
        <Input
          id={id}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false)
            // This combobox only accepts values from the list — revert any
            // typed-but-unselected text back to the committed selection.
            setQuery(selectedLabel)
          }}
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
            <li key={option.value}>
              <button
                type="button"
                className={cn(
                  'w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                )}
                // onMouseDown (not onClick) fires before the input's onBlur
                // closes the popover, so the click actually registers.
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectOption(option)
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
