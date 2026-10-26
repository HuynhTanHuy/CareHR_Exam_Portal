import dayjs from 'dayjs'
import viLocale from 'dayjs/locale/vi'
import utc from 'dayjs/plugin/utc'

dayjs.locale(viLocale)
dayjs.extend(utc)

const DISPLAY_TZ_OFFSET_MINUTES = 7 * 60

function toDisplay(value: string | null | undefined) {
  if (!value) return null
  const parsed = dayjs(value)
  if (!parsed.isValid()) return null
  return parsed.utcOffset(DISPLAY_TZ_OFFSET_MINUTES)
}

export function formatDisplayTime(value: string | null | undefined): string {
  return toDisplay(value)?.format('HH:mm') ?? ''
}

export function formatDisplayDateTime(value: string | null | undefined): string {
  return toDisplay(value)?.format('HH:mm DD-MM-YYYY') ?? '—'
}
