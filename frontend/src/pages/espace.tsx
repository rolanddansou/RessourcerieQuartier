import { useEffect } from 'react'
import mamie from '../assets/mamie.png'
import './espace.css'

type User = { username: string; role: 'admin' | 'benevole' }

export default function Espace() {
  const token = localStorage.getItem('token')
  const user: User | null = JSON.parse(localStorage.getItem('user') ?? 'null')

  useEffect(() => {
    if (!token || !user) window.location.href = '/login'
  }, [token, user])

  if (!token || !user) return null

  async function logout() {
    await fetch('/api/logout/', {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
    }).catch(() => {})
    localStorage.clear()
    window.location.href = '/login'
  }

  return (
    <main className="espace">
      {user.role === 'admin' ? (
        <section className="espace-card espace-admin">
          <img src={mamie} alt="La présidente présente La Ressourcerie du Quartier" />
          <div>
            <p className="eyebrow">ESPACE PRÉSIDENTE</p>
            <h1>Bienvenue, {user.username} !</h1>
            <p>Tout est sous contrôle… et la Ressourcerie vous regarde.</p>
          </div>
        </section>
      ) : (
        <section className="espace-card">
          <p className="eyebrow">ESPACE BÉNÉVOLES</p>
          <h1>Bonjour {user.username} !</h1>
          <p>Votre planning apparaîtra ici.</p>
        </section>
      )}
      <button className="espace-logout" onClick={logout}>Se déconnecter</button>
    </main>
  )
}