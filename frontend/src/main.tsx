import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

type Atelier = {
  id: number
  nom: string
  description: string
  date: string
  lieu: string
  places_disponible: number
}

function App() {
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
            <article className="workshop" key={atelier.id}>
              <h3>{atelier.nom}</h3>
              <p>{new Date(atelier.date).toLocaleString('fr-FR', {
                dateStyle: 'long',
                timeStyle: 'short',
              })}</p>
              {atelier.description ? <p>{atelier.description}</p> : null}
              <p>{atelier.lieu} · {atelier.places_disponible} place(s) disponible(s)</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
