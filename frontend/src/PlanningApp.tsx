import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage, session } from './planning/api'
import { PlanningWorkspace } from './planning/PlanningWorkspace'
import { Loading, Notice } from './planning/components/Ui'
import type { User } from './planning/types'
import mamie from './assets/mamie.png'


export default function PlanningApp() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [expiredSession, setExpiredSession] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const expired = useCallback(() => {
    setUser(null)
    setExpiredSession(true)
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
  if (!user) return <LoginRedirect expired={expiredSession} />
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
              window.location.href = '/login'
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
    <>
      
      <PlanningWorkspace
        key={user.id}
        user={user}
        onExpired={expired}
        onLogout={() => {
          setUser(null)
          setExpiredSession(false)
          window.location.href = '/login'
        }}
      />
    </>
  )
}

function LoginRedirect({ expired }: { expired: boolean }) {
  const destination = expired ? '/login?expired=1' : '/login'
  useEffect(() => {
    window.location.replace(destination)
  }, [destination])
  return (
    <main className="session-state">
      <Loading>Redirection vers la connexion…</Loading>
      <a href={destination}>Accéder à la page de connexion</a>
    </main>
  )
}