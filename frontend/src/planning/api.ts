import type { FieldErrors, User } from './types'

let csrf = ''

export class ApiError extends Error {
  constructor(
    public status: number,
    public fields: FieldErrors,
    message: string,
  ) {
    super(message)
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Une erreur est survenue. Réessayez.'
}

export async function api<T>(
  path: string,
  options: {
    method?: string
    data?: unknown
    signal?: AbortSignal
  } = {},
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/planning/${path}`, {
      method: options.method ?? 'GET',
      credentials: 'same-origin',
      signal: options.signal,
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
      body:
        options.data === undefined ? undefined : JSON.stringify(options.data),
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new Error(
      'Connexion au serveur impossible. Vérifiez votre connexion puis réessayez.',
    )
  }
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    const fields: FieldErrors = {}
    for (const [field, messages] of Object.entries(result?.errors ?? {})) {
      fields[field] = Array.isArray(messages)
        ? messages.map(String)
        : [String(messages)]
    }
    const fallback =
      response.status === 401
        ? 'Votre session a expiré. Reconnectez-vous pour continuer.'
        : response.status === 403
          ? 'Cette action est refusée. Actualisez la page et vérifiez vos droits.'
          : 'Le serveur ne peut pas répondre pour le moment. Réessayez.'
    throw new ApiError(
      response.status,
      fields,
      Object.values(fields).flat().join(' ') || fallback,
    )
  }
  if (result === null)
    throw new Error('Réponse du serveur illisible. Réessayez.')
  return result as T
}

export async function session(signal?: AbortSignal) {
  const result = await api<{ user: User | null; csrf: string }>('session/', {
    signal,
  })
  csrf = result.csrf
  return result.user
}
