import { useState } from 'react'
import type { FormEvent } from 'react'
import logo from '../assets/logo.png'
import './login.css'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail ?? 'Connexion impossible.')
        return
      }
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      window.location.href = '/espace'
    } catch {
      setError('Le serveur ne répond pas. Réessayez plus tard.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login">
      <section className="login-card">
        <img className="login-logo" src={logo} alt="La Ressourcerie du Quartier" />
        <p className="eyebrow">RÉEMPLOYER · PARTAGER · TRANSMETTRE</p>
        <h1>Espace bénévoles</h1>

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Identifiant</label>
          <input id="username" value={username} autoComplete="username"
            onChange={(e) => setUsername(e.target.value)} required />

          <label htmlFor="password">Mot de passe</label>
          <input id="password" type="password" value={password} autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)} required />

          {error && <p className="login-error" role="alert">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </section>
    </main>
  )
}