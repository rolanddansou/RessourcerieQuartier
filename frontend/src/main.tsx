import { StrictMode, useEffect, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import { App } from './App'
import Login from './pages/login'
import Espace from './pages/espace'

function Root() {
  const path = window.location.pathname
  if (path === '/login') return <Login />
  if (path === '/espace') return <Espace />
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
import './brand.css'

type AtelierInscription = {
  id: number
  nom: string
  date: string
  active: boolean
}

type Atelier = {
  id: number
  nom: string
  description: string
  date: string
  lieu: string
  places_disponible: number
}

function AtelierCard({
  atelier,
  onInscription,
}: {
  atelier: Atelier
  onInscription: () => void
}) {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  async function inscrire(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErreur('')
    setMessage('')
    setEnvoi(true)
    try {
      const response = await fetch(`/api/ateliers/${atelier.id}/inscriptions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, email }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Inscription impossible.')
      setMessage(`Inscription confirmée. Un lien de désinscription a été envoyé à ${data.email}.`)
      onInscription()
      setNom('')
      setEmail('')
    } catch (error) {
      setErreur(error instanceof Error ? error.message : 'Inscription impossible.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <article className="workshop" key={atelier.id}>
      <h3>{atelier.nom}</h3>
      <p>{new Date(atelier.date).toLocaleString('fr-FR', {
        dateStyle: 'long',
        timeStyle: 'short',
      })}</p>
      {atelier.description ? <p>{atelier.description}</p> : null}
      <p>{atelier.lieu} · {atelier.places_disponible} place(s) disponible(s)</p>
      {atelier.places_disponible > 0 ? (
        <form className="registration-form" onSubmit={inscrire}>
          <label>
            Nom
            <input
              autoComplete="name"
              maxLength={200}
              onChange={(event) => setNom(event.target.value)}
              required
              value={nom}
            />
          </label>
          <label>
            Courriel
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <button disabled={envoi} type="submit">
            {envoi ? 'Inscription en cours…' : 'S’inscrire'}
          </button>
        </form>
      ) : <p>Atelier complet</p>}
      {message ? <p className="notice" role="status">{message}</p> : null}
      {erreur ? <p className="error" role="alert">{erreur}</p> : null}
    </article>
  )
}

function PageDesinscription({ token }: { token: string }) {
  const [inscription, setInscription] = useState<AtelierInscription | null>(null)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/ateliers/desinscription/${token}/`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Lien de désinscription invalide.')
        setInscription(data)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setErreur(error instanceof Error ? error.message : 'Lien de désinscription invalide.')
        }
      })
    return () => controller.abort()
  }, [token])

  async function confirmerDesinscription() {
    setErreur('')
    setEnvoi(true)
    try {
      const response = await fetch(`/api/ateliers/desinscription/${token}/`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Désinscription impossible.')
      setMessage(data.message)
      setInscription((actuelle) => actuelle ? { ...actuelle, active: false } : actuelle)
    } catch (error) {
      setErreur(error instanceof Error ? error.message : 'Désinscription impossible.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <main>
      <p className="eyebrow">RÉEMPLOYER · PARTAGER · TRANSMETTRE</p>
      <h1>Annuler mon inscription</h1>
      {erreur ? <p className="error" role="alert">{erreur}</p> : null}
      {inscription && !message ? (
        inscription.active ? (
          <>
            <p>Confirmez votre désinscription à l’atelier « {inscription.nom} » du {new Date(inscription.date).toLocaleString('fr-FR', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}.</p>
            <button disabled={envoi} onClick={confirmerDesinscription} type="button">
              {envoi ? 'Annulation en cours…' : 'Confirmer ma désinscription'}
            </button>
          </>
        ) : <p>Cette inscription a déjà été annulée.</p>
      ) : null}
      {message ? <p className="notice" role="status">{message}</p> : null}
      {!inscription && !erreur ? <p>Vérification du lien…</p> : null}
    </main>
  )
}

function PageAteliers() {
  const [status, setStatus] = useState('Connexion au backend…')
  const [ateliers, setAteliers] = useState<Atelier[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function chargerAteliers() {
      try {
        const [healthResponse, ateliersResponse] = await Promise.all([
          fetch('/api/health/', { signal: controller.signal }),
          fetch('/api/ateliers/', { signal: controller.signal }),
        ])
        if (!healthResponse.ok || !ateliersResponse.ok) {
          throw new Error('API indisponible')
        }
        const health = await healthResponse.json()
        const data: Atelier[] = await ateliersResponse.json()
        setStatus(health.status === 'ok' ? 'Django est connecté ✓' : 'Réponse API inattendue')
        setAteliers(data)
      } catch {
        if (!controller.signal.aborted) {
          setStatus('Backend indisponible : démarrez Django sur le port 8000.')
          setError('Impossible de charger les ateliers. Réessayez plus tard.')
        }
      }
    }
    void chargerAteliers()
    return () => controller.abort()
  }, [])

  return (
    <main>
      <p className="eyebrow">RÉEMPLOYER · PARTAGER · TRANSMETTRE</p>
      <h1>Ressourcerie Quartier</h1>
      <p>Découvrez les ateliers proposés par la ressourcerie.</p>
      <p className="status" role="status">{status}</p>
      <section aria-labelledby="ateliers-title">
        <h2 id="ateliers-title">Les prochains ateliers</h2>
        {error ? <p role="alert">{error}</p> : null}
        {!error && ateliers.length === 0 ? <p>Aucun atelier n’est programmé pour le moment.</p> : null}
        <div className="workshop-list">
          {ateliers.map((atelier) => (
            <AtelierCard
              atelier={atelier}
              key={atelier.id}
              onInscription={() => setAteliers((actuels) => actuels.map((actuel) => (
                actuel.id === atelier.id
                  ? { ...actuel, places_disponible: Math.max(0, actuel.places_disponible - 1) }
                  : actuel
              )))}
            />
          ))}
        </div>
      </section>
    </main>
  )
}

function App() {
  const match = window.location.pathname.match(/^\/desinscription\/([0-9a-f-]+)\/?$/i)
  return match ? <PageDesinscription token={match[1]} /> : <PageAteliers />
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
