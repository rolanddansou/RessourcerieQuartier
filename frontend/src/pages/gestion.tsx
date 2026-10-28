import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import logo from '../assets/logo.png'
import mamie from '../assets/mamie.png'
import './gestion.css'

type Benevole = {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  is_active: boolean
}

type Formulaire = {
  id?: number
  first_name: string
  last_name: string
  username: string
  email: string
  password: string
}

const vide: Formulaire = { first_name: '', last_name: '', username: '', email: '', password: '' }

async function csrf(): Promise<string> {
  const r = await fetch('/api/planning/session/', { credentials: 'same-origin' })
  return (await r.json()).csrf
}

async function appel(path: string, method = 'GET', body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (method !== 'GET') headers['X-CSRFToken'] = await csrf()
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('Accès refusé. Reconnectez-vous.')
    const texte =
      data && typeof data === 'object'
        ? Object.values(data).flat().join(' ')
        : 'Une erreur est survenue.'
    throw new Error(texte)
  }
  return data
}

export default function Gestion() {
  const [nom, setNom] = useState('')
  const [vue, setVue] = useState<'accueil' | 'benevoles'>('accueil')

  useEffect(() => {
    fetch('/api/planning/session/', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || !d.user.roles.includes('admin')) window.location.href = '/login'
        else setNom(d.user.name)
      })
      .catch(() => (window.location.href = '/login'))
  }, [])

  async function deconnexion() {
    try {
      await appel('/planning/logout/', 'POST')
    } finally {
      window.location.href = '/login'
    }
  }

  if (!nom) return <main className="gestion"><p>Chargement…</p></main>

  return (
    <div className="gestion">
      <header className="gestion-entete">
        <div className="gestion-marque">
          <img className="gestion-logo" src={logo} alt="La Ressourcerie du Quartier" />
        </div>
        <img
          className="gestion-martine-entete"
          src={mamie}
          alt="Martine, la présidente de la Ressourcerie"
        />
        <div className="gestion-compte">
          <span>Bonjour {nom}</span>
          <button className="gestion-secondaire" onClick={deconnexion}>Me déconnecter</button>
        </div>
      </header>

      <main className="gestion-contenu">
        {vue === 'accueil' ? (
          <section className="gestion-accueil">
            <h1>Que voulez-vous faire ?</h1>
            <div className="gestion-grille">
              <button className="gestion-tuile" onClick={() => setVue('benevoles')}>
                <span className="gestion-icone">🙋</span>
                Les bénévoles
                <small>Ajouter, modifier, retirer</small>
              </button>
              <a className="gestion-tuile" href="/planning">
                <span className="gestion-icone">📅</span>
                Le planning
                <small>Qui vient et quand</small>
              </a>
              <div className="gestion-tuile gestion-bientot">
                <span className="gestion-icone">🪑</span>
                Les dons
                <small>Bientôt</small>
              </div>
              <a className="gestion-tuile" href="/ateliers">
                <span className="gestion-icone">🔧</span>
                Les ateliers
                <small>Voir le catalogue et les inscriptions</small>
              </a>
            </div>
          </section>
        ) : (
          <Benevoles onRetour={() => setVue('accueil')} />
        )}
      </main>
    </div>
  )
}

function Benevoles({ onRetour }: { onRetour: () => void }) {
  const [liste, setListe] = useState<Benevole[]>([])
  const [form, setForm] = useState<Formulaire | null>(null)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [chargement, setChargement] = useState(true)

  const charger = useCallback(async () => {
    try {
      setListe(await appel('/benevoles/'))
    } catch (e) {
      setErreur((e as Error).message)
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    void charger()
  }, [charger])

  function modifier(b: Benevole) {
    setMessage('')
    setErreur('')
    setForm({
      id: b.id,
      first_name: b.first_name,
      last_name: b.last_name,
      username: b.username,
      email: b.email,
      password: '',
    })
  }

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setErreur('')
    const { id, password, ...champs } = form
    const donnees: Record<string, unknown> = { ...champs }
    if (password) donnees.password = password
    try {
      if (id) await appel(`/benevoles/${id}/`, 'PATCH', donnees)
      else await appel('/benevoles/', 'POST', { ...donnees, password })
      setMessage(id ? 'Les informations sont enregistrées.' : 'Le bénévole est ajouté.')
      setForm(null)
      await charger()
    } catch (err) {
      setErreur((err as Error).message)
    }
  }

  async function retirer(b: Benevole) {
    if (!window.confirm(`Retirer ${b.first_name || b.username} de la liste ? Vous pourrez le remettre plus tard.`)) return
    try {
      await appel(`/benevoles/${b.id}/`, 'DELETE')
      setMessage('Le bénévole est retiré de la liste.')
      await charger()
    } catch (err) {
      setErreur((err as Error).message)
    }
  }

  async function reactiver(b: Benevole) {
    try {
      await appel(`/benevoles/${b.id}/`, 'PATCH', { is_active: true })
      setMessage('Le bénévole est de retour dans la liste.')
      await charger()
    } catch (err) {
      setErreur((err as Error).message)
    }
  }

  return (
    <section>
      <button className="gestion-secondaire" onClick={onRetour}>← Retour</button>
      <h1>Les bénévoles</h1>

      {message && <p className="gestion-ok" role="status">{message}</p>}
      {erreur && <p className="gestion-erreur" role="alert">{erreur}</p>}

      {form ? (
        <form className="gestion-carte" onSubmit={enregistrer}>
          <h2>{form.id ? 'Modifier un bénévole' : 'Ajouter un bénévole'}</h2>

          <label htmlFor="g-prenom">Prénom</label>
          <input id="g-prenom" value={form.first_name} required
            onChange={(e) => setForm({ ...form, first_name: e.target.value })} />

          <label htmlFor="g-nom">Nom</label>
          <input id="g-nom" value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })} />

          <label htmlFor="g-id">Identifiant (pour se connecter)</label>
          <input id="g-id" value={form.username} required autoComplete="off"
            onChange={(e) => setForm({ ...form, username: e.target.value })} />

          <label htmlFor="g-mail">Adresse mail</label>
          <input id="g-mail" type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />

          <label htmlFor="g-mdp">{form.id ? 'Nouveau mot de passe (laissez vide pour ne rien changer)' : 'Mot de passe'}</label>
          <input id="g-mdp" type="password" value={form.password} autoComplete="new-password"
            required={!form.id}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />

          <div className="gestion-actions">
            <button type="submit">Enregistrer</button>
            <button type="button" className="gestion-secondaire" onClick={() => setForm(null)}>Annuler</button>
          </div>
        </form>
      ) : (
        <button onClick={() => { setMessage(''); setErreur(''); setForm({ ...vide }) }}>
          + Ajouter un bénévole
        </button>
      )}

      {chargement ? (
        <p>Chargement…</p>
      ) : liste.length === 0 ? (
        <p className="gestion-vide">Aucun bénévole pour le moment.</p>
      ) : (
        <ul className="gestion-liste">
          {liste.map((b) => (
            <li key={b.id} className={`gestion-carte ${b.is_active ? '' : 'gestion-retire'}`}>
              <div>
                <strong>{`${b.first_name} ${b.last_name}`.trim() || b.username}</strong>
                <small>{b.email || 'Pas de mail'}{!b.is_active && ' · Retiré de la liste'}</small>
              </div>
              <div className="gestion-actions">
                {b.is_active ? (
                  <>
                    <button className="gestion-secondaire" onClick={() => modifier(b)}>Modifier</button>
                    <button className="gestion-danger" onClick={() => retirer(b)}>Retirer</button>
                  </>
                ) : (
                  <button onClick={() => reactiver(b)}>Remettre</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
