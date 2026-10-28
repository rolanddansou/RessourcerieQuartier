import type { Draft, Slot } from './types'

function parse(day: string) {
  return new Date(`${day}T12:00:00Z`)
}

export function shift(day: string, amount: number) {
  const date = parse(day)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

export function parisToday() {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) =>
    parts.find((value) => value.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function monday(day = parisToday()) {
  return shift(day, -((parse(day).getUTCDay() + 6) % 7))
}

export function dateLabel(
  day: string,
  options: Intl.DateTimeFormatOptions = {},
) {
  return parse(day).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...options,
    timeZone: 'UTC',
  })
}

export function weekDays(week: string) {
  return Array.from({ length: 7 }, (_, index) => shift(week, index))
}

export function emptyDraft(week: string): Draft {
  return {
    date: week,
    start: '09:00',
    end: '12:00',
    details: '',
    note: '',
    user_ref: '',
  }
}

export function slotDraft(slot: Slot): Draft {
  return {
    date: slot.date,
    start: slot.start,
    end: slot.end,
    user_ref: slot.user_ref,
    details: slot.details ?? '',
    note: slot.note ?? '',
  }
}

export function totalHours(slots: Slot[]) {
  const minutes = slots.reduce((total, slot) => {
    const [startHour, startMinute] = slot.start.split(':').map(Number)
    const [endHour, endMinute] = slot.end.split(':').map(Number)
    return total + (endHour - startHour) * 60 + endMinute - startMinute
  }, 0)
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(
    minutes / 60,
  )
}
