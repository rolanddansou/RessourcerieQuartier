import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage, session } from './planning/api'
import { LoginScreen } from './planning/LoginScreen'
import { PlanningWorkspace } from './planning/PlanningWorkspace'
import { Loading, Notice } from './planning/components/Ui'
import type { User } from './planning/types'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  const expired = useCallback(() => {
    setUser(null)
    setMessage('Votre session a expiré. Reconnectez-vous pour continuer.')
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setReady(false)
    setError('')
    session(controller.signal)
      .then((user) => {
        if (!controller.signal.aborted) setUser(user)
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setReady(true)
      })
    return () => controller.abort()
  }, [attempt])

  if (!ready)
    return (
      <main className="session-state">
        <Loading>Chargement de votre espace…</Loading>
      </main>
    )
  if (error)
    return (
      <main className="session-state">
        <Notice
          action={
            <button
              type="button"
              className="secondary"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Réessayer
            </button>
          }
        >
          {error}
        </Notice>
      </main>
    )
  if (!user)
    return (
      <LoginScreen
        message={message}
        onLogin={(user) => {
          setUser(user)
          setMessage('')
        }}
      />
    )
  if (
    !user.active ||
    !user.roles.some((role) => ['admin', 'benevole'].includes(role))
  ) {
    return (
      <main className="session-state">
        <Notice>
          Votre compte n’a pas accès au planning. Contactez un administrateur.
        </Notice>
        <button
          type="button"
          className="secondary"
          onClick={async () => {
            try {
              await api('logout/', { method: 'POST' })
              setUser(null)
            } catch (error) {
              setError(errorMessage(error))
            }
          }}
        >
          Déconnexion
        </button>
      </main>
    )
  }
  return (
    <PlanningWorkspace
      key={user.id}
      user={user}
      onExpired={expired}
      onLogout={() => {
        setUser(null)
        setMessage('')
      }}
    />
  )
}
