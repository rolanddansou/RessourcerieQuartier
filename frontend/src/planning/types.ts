export type Page = 'availability' | 'planning' | 'admin'

export interface User {
  id: string
  name: string
  roles: string[]
  active: boolean
}

export interface Slot {
  id: number
  user_ref: string
  date: string
  start: string
  end: string
  details?: string
  note?: string
  name?: string
}

export interface Planning {
  id: number
  week: string
  published: boolean
  assignments: Slot[]
}

export interface Draft {
  date: string
  start: string
  end: string
  details: string
  note: string
  user_ref: string
}

export type FieldErrors = Record<string, string[]>

export interface WeekData {
  planning: Planning | null
  slots: Slot[]
  people: User[]
}
