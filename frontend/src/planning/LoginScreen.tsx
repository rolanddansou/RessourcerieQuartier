import { useState, type FormEvent } from 'react'
import { errorMessage, signIn } from './api'
import type { User } from './types'
import { Icon, Notice } from './components/Ui'

export function LoginScreen({
  onLogin,
  message,
}: {
  onLogin: (user: User) => void
  message: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      onLogin(
        await signIn(
          String(values.get('username')),
          String(values.get('password')),
        ),
      )
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-layout">
      <section className="login-story">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="leaf" size={25} />
          </span>
          <span>
            Ressourcerie
            <br />
            Quartier
          </span>
        </div>
        <div>
          <p className="eyebrow">L’ESPACE DES BÉNÉVOLES</p>
          <h1>
            Un peu de votre temps.
            <br />
            Beaucoup pour le quartier.
          </h1>
          <p className="login-description">
            Partagez vos disponibilités, retrouvez l’équipe et préparez votre
            prochaine venue.
          </p>
        </div>
        <div className="login-points">
          <span>
            <Icon name="calendar" />
            Vos disponibilités
          </span>
          <span>
            <Icon name="users" />
            Un planning partagé
          </span>
        </div>
      </section>
      <section className="login-card" aria-labelledby="login-title">
        <p className="eyebrow">BIENVENUE</p>
        <h2 id="login-title">Connectez-vous</h2>
        <p className="muted">
          Retrouvez votre espace et le planning de l’équipe.
        </p>
        {message && <Notice tone="info">{message}</Notice>}
        {error && <Notice>{error}</Notice>}
        <form onSubmit={(event) => void login(event)}>
          <fieldset disabled={busy}>
            <label htmlFor="username">Identifiant</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              required
              autoFocus
            />
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            <button className="full-width" type="submit">
              {busy ? 'Connexion…' : 'Se connecter'}
              <Icon name="right" />
            </button>
          </fieldset>
        </form>
        <p className="login-help">
          Besoin d’un accès ? Contactez l’administrateur de la ressourcerie.
        </p>
      </section>
    </main>
  )
}
