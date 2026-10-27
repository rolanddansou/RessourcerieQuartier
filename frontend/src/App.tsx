import { useEffect, useState } from 'react'
import Login from './pages/login'
import Espace from './pages/espace'

function Accueil() {
  const [status, setStatus] = useState('Connexion au backend…')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/health/', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('API indisponible')
        const data = await response.json()
        setStatus(data.status === 'ok' ? 'Django est connecté ✓' : 'Réponse API inattendue')
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('Backend indisponible : démarrez Django sur le port 8000.')
      })
    return () => controller.abort()
  }, [])

  return (
    <main>
      <p className="eyebrow">RÉEMPLOYER · PARTAGER · TRANSMETTRE</p>
      <h1>Ressourcerie Quartier</h1>
      <p>Le projet est prêt à accueillir vos prochaines idées.</p>
      <p className="status" role="status">{status}</p>
    </main>
  )
}

export default function App() {
  const path = window.location.pathname
  if (path === '/login') return <Login />
  if (path === '/espace') return <Espace />
  return <Accueil />
}