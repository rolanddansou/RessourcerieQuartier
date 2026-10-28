import { StrictMode, useEffect, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import './brand.css'
import './ateliers.css'
import { App as SiteApp } from './App'
import Login from './pages/login'
import Espace from './pages/espace'
import PlanningApp from './PlanningApp'
import Gestion from './pages/gestion'
import logo from './assets/logo.png'

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

  const date = new Date(atelier.date)
  const jour = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const heure = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <article className="atelier-card">
      <div className="atelier-card-heading">
        <div className="atelier-date-badge" aria-label={jour}>
          <span className="atelier-date-day">{date.toLocaleDateString('fr-FR', { day: '2-digit' })}</span>
          <span className="atelier-date-month">{date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
        </div>
        <div className="atelier-card-title">
          <span className="atelier-card-label">Atelier participatif</span>
          <h3>{atelier.nom}</h3>
        </div>
      </div>

      <p className="atelier-card-description">
        {atelier.description || 'Un moment convivial pour apprendre, réparer et partager des savoir-faire.'}
      </p>

      <div className="atelier-card-details">
        <p><span aria-hidden="true">◷</span><span>{jour} · {heure}</span></p>
        <p><span aria-hidden="true">⌖</span><span>{atelier.lieu}</span></p>
      </div>

      <div className={`atelier-capacity${atelier.places_disponible === 0 ? ' is-full' : ''}`}>
        <span className="atelier-capacity-dot" aria-hidden="true" />
        {atelier.places_disponible > 0
          ? `${atelier.places_disponible} place${atelier.places_disponible > 1 ? 's' : ''} disponible${atelier.places_disponible > 1 ? 's' : ''}`
          : 'Atelier complet'}
      </div>

      {atelier.places_disponible > 0 ? (
        <form className="atelier-form" onSubmit={inscrire}>
          <h4>Réserver ma place</h4>
          <label>
            Votre nom
            <input
              autoComplete="name"
              maxLength={200}
              onChange={(event) => setNom(event.target.value)}
              placeholder="Prénom et nom"
              required
              value={nom}
            />
          </label>
          <label>
            Votre adresse courriel
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vous@exemple.fr"
              required
              type="email"
              value={email}
            />
          </label>
          <button className="atelier-submit" disabled={envoi} type="submit">
            {envoi ? 'Inscription en cours…' : 'Je m’inscris'}
            {!envoi && <span aria-hidden="true">→</span>}
          </button>
        </form>
      ) : (
        <p className="atelier-full-note">Les inscriptions pour cet atelier sont complètes.</p>
      )}

      {message ? <p className="atelier-feedback is-success" role="status">{message}</p> : null}
      {erreur ? <p className="atelier-feedback is-error" role="alert">{erreur}</p> : null}
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
  const [ateliers, setAteliers] = useState<Atelier[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    async function chargerAteliers() {
      try {
        const ateliersResponse = await fetch('/api/ateliers/', { signal: controller.signal })
        if (!ateliersResponse.ok) throw new Error('Impossible de charger les ateliers.')
        const data: Atelier[] = await ateliersResponse.json()
        setAteliers(data)
      } catch {
        if (!controller.signal.aborted) {
          setError('Impossible de charger les ateliers. Réessayez plus tard.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void chargerAteliers()
    return () => controller.abort()
  }, [])

  return (
    <div className="atelier-page">
      <header className="atelier-header">
        <a className="atelier-brand" href="/" aria-label="Retour à l’accueil de la Ressourcerie">
          <img src={logo} alt="" />
          <span>La Ressourcerie<small>du Quartier</small></span>
        </a>
        <nav className="atelier-nav" aria-label="Navigation principale">
          <a href="/">Accueil</a>
          <a href="/login?espace=benevole">Espace bénévole</a>
          <a className="atelier-nav-admin" href="/login?espace=admin">Espace admin</a>
        </nav>
      </header>

      <main className="atelier-main">
        <section className="atelier-hero" aria-labelledby="ateliers-title">
          <div className="atelier-hero-copy">
            <p className="atelier-eyebrow"><span /> Réparer · apprendre · partager</p>
            <h1 id="ateliers-title">Les ateliers<br /><em>du quartier</em></h1>
            <p className="atelier-hero-description">
              Des moments simples pour apprendre à réparer, fabriquer et transmettre des savoir-faire, ensemble.
            </p>
            <a className="atelier-hero-link" href="#prochains-ateliers">
              Découvrir les prochains ateliers <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="atelier-hero-art" aria-hidden="true">
            <div className="atelier-art-orbit" />
            <div className="atelier-art-card atelier-art-card-main"><span>🔧</span><strong>On répare</strong><small>ensemble</small></div>
            <div className="atelier-art-card atelier-art-card-top"><span>🪴</span><strong>On apprend</strong></div>
            <div className="atelier-art-card atelier-art-card-bottom"><span>🪑</span><strong>On partage</strong></div>
          </div>
        </section>

        <section className="atelier-list-section" id="prochains-ateliers" aria-labelledby="atelier-list-title">
          <div className="atelier-section-heading">
            <div>
              <p className="atelier-eyebrow">À VOTRE AGENDA</p>
              <h2 id="atelier-list-title">Les prochains rendez-vous</h2>
              <p>Choisissez un atelier et réservez votre place en quelques instants.</p>
            </div>
            {!loading && !error && ateliers.length > 0 && (
              <span className="atelier-count">{ateliers.length} atelier{ateliers.length > 1 ? 's' : ''}</span>
            )}
          </div>

          {loading && (
            <div className="atelier-grid" aria-label="Chargement des ateliers" aria-busy="true">
              {[1, 2, 3].map((item) => <div className="atelier-skeleton" key={item} />)}
            </div>
          )}
          {error && (
            <div className="atelier-empty atelier-empty-error" role="alert">
              <span className="atelier-empty-icon" aria-hidden="true">!</span>
              <h3>Les ateliers ne sont pas disponibles pour le moment</h3>
              <p>{error}</p>
              <button className="atelier-empty-button" onClick={() => window.location.reload()} type="button">Réessayer</button>
            </div>
          )}
          {!loading && !error && ateliers.length === 0 && (
            <div className="atelier-empty">
              <span className="atelier-empty-icon" aria-hidden="true">✳</span>
              <h3>Les prochains ateliers se préparent</h3>
              <p>Aucune date n’est publiée pour l’instant. Revenez bientôt découvrir le programme.</p>
              <a className="atelier-empty-link" href="/">Découvrir la Ressourcerie <span aria-hidden="true">→</span></a>
            </div>
          )}
          {!loading && !error && ateliers.length > 0 && (
            <div className="atelier-grid">
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
          )}
        </section>

        <aside className="atelier-contact">
          <span className="atelier-contact-icon" aria-hidden="true">✦</span>
          <div><strong>Envie de participer ?</strong><p>Les ateliers sont ouverts à toutes et à tous. Il suffit de réserver votre place ci-dessus.</p></div>
          <a href="/">En savoir plus sur la Ressourcerie <span aria-hidden="true">→</span></a>
        </aside>
      </main>

      <footer className="atelier-footer">
        <span>La Ressourcerie du Quartier</span>
        <span>Réemployer · Partager · Transmettre</span>
      </footer>
    </div>
  )
}

function Root() {
  const path = window.location.pathname.replace(/\/+$/, '').toLowerCase() || '/'
  const desinscription = path.match(/^\/desinscription\/([0-9a-f-]+)$/i)

  if (path === '/login') return <Login />
  if (path === '/espace') return <Espace />
  if (path === '/planning' || path.startsWith('/admin/planning')) return <PlanningApp />
  if (path === '/gestion') return <Gestion />
  if (desinscription) return <PageDesinscription token={desinscription[1]} />
  if (path === '/ateliers') return <PageAteliers />
  return <SiteApp />
}

createRoot(document.getElementById('root')!).render(<StrictMode><Root /></StrictMode>)
