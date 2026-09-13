import { format, parseISO } from 'date-fns'

/** All dates in the app display as dd/MM/yyyy, regardless of browser/OS
 * locale — stored value stays ISO ('YYYY-MM-DD') everywhere else. */
export function toDisplayDate(isoDate: string): string {
  return format(parseISO(isoDate), 'dd/MM/yyyy')
}

export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}
