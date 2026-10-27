import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

function App() {
  const [status, setStatus] = useState('Connexion au backend…')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/health/', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('API indisponible')
        const data = await response.json()
        setStatus(data.status === 'ok' ? 'Django est connecté ✓' : 'Réponse API inattendue')
      })
      .catch((error: unknown) => {
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

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
