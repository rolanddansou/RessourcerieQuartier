import { useEffect, useState } from 'react'
import { api, ApiError, errorMessage } from './api'
import type { Page, Planning, Slot, User, WeekData } from './types'

type State = {
  key: string
  status: 'loading' | 'ready' | 'error'
  data: WeekData | null
  error: string
}

export function useWeekData(
  user: User,
  page: Page,
  week: string,
  revision: number,
  onExpired: () => void,
) {
  const key = `${user.id}:${page}:${week}:${revision}`
  const [state, setState] = useState<State>({
    key: '',
    status: 'loading',
    data: null,
    error: '',
  })

  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal
    setState({ key, status: 'loading', data: null, error: '' })
    async function load(): Promise<WeekData> {
      if (page === 'availability') {
        const result = await api<{ items: Slot[] }>(
          `availabilities/?week=${week}`,
          { signal },
        )
        return { slots: result.items, planning: null, people: [] }
      }
      const [weeks, slots, people] = await Promise.all([
        api<{ items: Planning[] }>(`weeks/?week=${week}`, { signal }),
        page === 'admin'
          ? api<{ items: Slot[] }>(`team-availabilities/?week=${week}`, {
              signal,
            })
          : Promise.resolve({ items: [] }),
        page === 'admin'
          ? api<{ items: User[] }>('volunteers/', { signal })
          : Promise.resolve({ items: [] }),
      ])
      return {
        planning: weeks.items[0] ?? null,
        slots: slots.items,
        people: people.items,
      }
    }
    load()
      .then((data) => {
        if (!signal.aborted) setState({ key, status: 'ready', data, error: '' })
      })
      .catch((error) => {
        if (signal.aborted) return
        if (error instanceof ApiError && error.status === 401) onExpired()
        setState({
          key,
          status: 'error',
          data: null,
          error: errorMessage(error),
        })
      })
    return () => controller.abort()
  }, [key, week, page, onExpired])

  // Never expose the previous week's actions during the render before the effect.
  return state.key === key
    ? state
    : { key, status: 'loading' as const, data: null, error: '' }
}
