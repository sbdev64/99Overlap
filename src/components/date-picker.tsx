import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toDisplayDate, toIsoDate } from '@/lib/date-format'
import { cn } from '@/lib/utils'

/** A date field that always displays and lets you pick dates as
 * dd/MM/yyyy, independent of browser/OS locale. `value`/`onChange` are ISO
 * ('YYYY-MM-DD') strings, matching what's stored in the DB. */
export function DatePicker({
  id,
  value,
  onChange,
}: {
  id?: string
  value: string
  onChange: (isoDate: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(`${value}T00:00:00`) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {value ? toDisplayDate(value) : 'Pick a date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(toIsoDate(date))
              setOpen(false)
            }
          }}
          // Month/year dropdowns instead of one-month-at-a-time arrows —
          // logging a game from a year-old backfilled spreadsheet entry
          // shouldn't take dozens of clicks. Defaults to a 100-year range.
          captionLayout="dropdown"
          defaultMonth={selected}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
