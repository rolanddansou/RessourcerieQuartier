import { useState, useEffect } from 'react'

// Types pour l'API
interface DonItem {
  id: string
  db_id: number
  name: string
  category: string
  status: 'stockage' | 'reparation' | 'vente' | 'vendu'
  date: string
  notes: string
}

interface Stats {
  dons: { total: number; stockage: number; reparation: number; vente: number; vendu: number }
}

/* ── Palette tirée du logo ── */
const c = {
  vert:     '#2D5A1B',
  vertMed:  '#4a7c3f',
  vertClair:'#e8f4e2',
  orange:   '#c0392b',
  orangeCl: '#fdecea',
  jaune:    '#e8a820',
  jauneCl:  '#fef9ec',
  beige:    '#f5f0e8',
  brun:     '#6b3a1f',
  brunCl:   '#f2ebe3',
}

/* ── Badge statut don ── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    stockage:  { label: '📦 Stockage',     bg: c.brunCl,  color: c.brun   },
    reparation:{ label: '🔧 Réparation',   bg: c.jauneCl, color: '#92570a' },
    vente:     { label: '🏷️ En vente',     bg: c.vertClair,color: c.vert  },
    vendu:     { label: '✅ Vendu',         bg: '#e6f4f1', color: '#1a6b57' },
  }
  const s = map[status] ?? { label: status, bg: '#f0f0f0', color: '#555' }
  return (
    <span style={{ background: s.bg, color: s.color }}
          className="text-[10px] font-bold px-2 py-0.5 rounded-full">
      {s.label}
    </span>
  )
}

export function App() {
  const [currentRoute, setCurrentRoute] = useState<'/' | '/benevole' | '/admin'>('/')
  const [benevoleView, setBenevoleView] = useState<'dons'>('dons')
  const [adminView, setAdminView] = useState<'dons' | 'supervision'>('dons')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Données de l'API Django
  const [dons, setDons] = useState<DonItem[]>([])
  const [donName, setDonName] = useState('')
  const [donCategory, setDonCategory] = useState('Petit électroménager')
  const [stats, setStats] = useState<Stats | null>(null)
  const [itemFilter, setItemFilter] = useState('tous')

  // Bénévole actif (simulation)

  // Modales
  const [isDonFormOpen, setIsDonFormOpen] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const fetchAllData = async () => {
    try {
      const [resDons, resStats] = await Promise.all([
        fetch('/api/dons/').then(r => r.json()),
        fetch('/api/stats/').then(r => r.json()),
      ])
      setDons(resDons)
      setStats(resStats)
    } catch {
      console.warn('Backend Django en cours de synchronisation...')
    }
  }

  useEffect(() => { fetchAllData() }, [])

  const handleChangeDonStatus = async (dbId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/dons/${dbId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) { showToast(`Statut mis à jour : ${newStatus}`); fetchAllData() }
    } catch { showToast('Erreur réseau') }
  }

  const handleDeleteDon = async (dbId: number) => {
    if (!confirm("Supprimer cet objet de l'inventaire ?")) return
    try {
      const res = await fetch(`/api/dons/${dbId}/`, { method: 'DELETE' })
      if (res.ok) { showToast('Don supprimé'); fetchAllData() }
    } catch { showToast('Erreur réseau') }
  }

  const handleCreateDon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      category: (form.elements.namedItem('category') as HTMLSelectElement).value,
      status: (form.elements.namedItem('status') as HTMLSelectElement).value,
      notes: (form.elements.namedItem('notes') as HTMLTextAreaElement).value,
    }
    try {
      const res = await fetch('/api/dons/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        showToast(`Objet « ${data.name} » enregistré`)
        form.reset()
        setDonName('')
        setDonCategory('Petit électroménager')
        fetchAllData()
      }
    } catch { showToast('Erreur réseau') }
  }

  const filteredDons = itemFilter === 'tous' ? dons : dons.filter(d => d.status === itemFilter)

  const topObjets = (() => {
    const map = new Map<string, { name: string; count: number; cats: Record<string, number> }>()
    for (const d of dons) {
      const key = d.name.trim().toLowerCase()
      if (!key) continue
      const e = map.get(key) ?? { name: d.name.trim(), count: 0, cats: {} }
      e.count++
      e.cats[d.category] = (e.cats[d.category] ?? 0) + 1
      map.set(key, e)
    }
    return [...map.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map(e => ({
        name: e.name,
        count: e.count,
        category: Object.entries(e.cats).sort((a, b) => b[1] - a[1])[0][0],
      }))
  })()

  /* ── Helpers de style ── */
  const btnVert = "px-3 py-1.5 rounded-lg text-white text-xs font-bold transition shadow-sm"
  const btnPetit = "px-2 py-1 rounded text-xs font-semibold border"
  const card = "bg-white rounded-xl border border-stone-200 shadow-sm"
  const inputCls = "w-full border border-stone-200 rounded-lg px-3 py-2 bg-stone-50 text-xs focus:outline-none focus:border-[#4a7c3f] focus:bg-white transition"

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: c.beige }} className="text-stone-800 antialiased min-h-screen flex flex-col">

      {/* ══════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════ */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">

          {/* Logo + titre */}
          <button onClick={() => setCurrentRoute('/')} className="flex items-center gap-2.5 hover:opacity-80 transition">
            <img src="/logo.jpg" alt="La Ressourcerie du Quartier"
                 className="h-10 w-auto rounded-lg object-cover" />
            <div className="hidden sm:block text-left">
              <p className="text-[10px] font-semibold uppercase tracking-widest"
                 style={{ color: c.vertMed }}>
                {currentRoute === '/' ? 'Site public' : currentRoute === '/benevole' ? 'Espace Bénévoles' : 'Espace Martine'}
              </p>
            </div>
          </button>

          {/* Nav desktop (vitrine seulement) */}
          {currentRoute === '/' && (
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold" style={{ color: c.brun }}>
              <a href="#horaires" className="hover:opacity-75">⏰ Horaires</a>
              <a href="#dons" className="hover:opacity-75">📦 Guide des dons</a>
            </nav>
          )}

          {/* Actions droite */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentRoute('/benevole')}
              className="px-3 py-1.5 rounded-lg text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              style={{ background: c.vert }}
            >
              <span>🤝</span>
              <span className="hidden sm:inline">Espace Bénévoles</span>
              <span className="sm:hidden">Bénévoles</span>
            </button>
            {/* Burger mobile */}
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="md:hidden p-1.5 rounded-lg hover:bg-stone-100 focus:outline-none"
              style={{ color: c.brun }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Drawer mobile */}
      {isDrawerOpen && (
        <>
          <div onClick={() => setIsDrawerOpen(false)} className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50" />
          <div className="fixed top-0 right-0 h-full w-72 max-w-[85vw] bg-white shadow-2xl z-50 flex flex-col p-5 gap-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <img src="/logo.jpg" alt="logo" className="h-9 rounded-md" />
              <button onClick={() => setIsDrawerOpen(false)} style={{ color: c.brun }}>✕</button>
            </div>
            <button onClick={() => { setCurrentRoute('/'); setIsDrawerOpen(false) }}
                    className="w-full text-left p-3 rounded-xl text-xs font-bold border border-stone-200"
                    style={{ background: c.vertClair, color: c.vert }}>
              🏠 Accueil &amp; Horaires
            </button>
            <button onClick={() => { setCurrentRoute('/benevole'); setIsDrawerOpen(false) }}
                    className="w-full text-left p-3 rounded-xl text-white text-xs font-bold shadow-sm"
                    style={{ background: c.vert }}>
              🤝 Espace Bénévoles
            </button>
            <button onClick={() => { setCurrentRoute('/admin'); setIsDrawerOpen(false) }}
                    className="w-full text-left p-3 rounded-xl text-xs font-bold border border-stone-200"
                    style={{ background: c.jauneCl, color: c.brun }}>
              👑 Espace Martine (Admin)
            </button>
          </div>
        </>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-20 sm:bottom-5 right-4 left-4 sm:left-auto sm:right-5 z-50 text-white px-4 py-3 rounded-xl shadow-2xl text-xs flex items-center gap-2"
             style={{ background: c.vert }}>
          <span>✅</span> <span>{toast}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          VUE 1 : SITE VITRINE (/)
      ══════════════════════════════════════════════ */}
      {currentRoute === '/' && (
        <main className="max-w-7xl w-full mx-auto px-4 py-6 space-y-8 flex-1">

          {/* Hero */}
          <div className="rounded-2xl overflow-hidden relative" style={{ background: `linear-gradient(135deg, ${c.vert} 0%, #1e4d2b 60%, #3a2010 100%)` }}>
            <div className="px-6 py-8 sm:px-10 sm:py-12 text-white space-y-4 relative z-10">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                    style={{ background: c.jaune, color: c.brun }}>
                🌱 Quartier Solidaire · Zéro Déchet
              </span>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight">
                Donnez une seconde vie<br />à vos objets du quotidien
              </h2>
              <p className="text-sm opacity-80 max-w-md">
                Collecte solidaire, réemploi et ateliers participatifs de réparation — gratuits pour tous.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a href="#horaires"
                   className="px-4 py-2 rounded-lg text-white font-bold text-xs shadow-sm transition hover:opacity-90"
                   style={{ background: c.orange }}>
                  ⏰ Horaires &amp; accès
                </a>
                <a href="#dons"
                   className="px-4 py-2 rounded-lg font-bold text-xs border border-white/30 text-white hover:bg-white/10 transition">
                  📦 Guide des dons
                </a>
              </div>
            </div>
          </div>

          {/* Horaires & Accès */}
          <section id="horaires" className="space-y-3">
            <h3 className="text-lg font-bold" style={{ color: c.brun }}>⏰ Horaires &amp; Accès</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`${card} p-4`}>
                <h4 className="font-bold text-xs mb-2.5" style={{ color: c.vert }}>📅 Boutique &amp; Dépôts</h4>
                <ul className="text-xs space-y-1.5 text-stone-700">
                  <li className="flex justify-between border-b border-stone-100 pb-1"><span>Mercredi</span><strong>14h00 – 18h30</strong></li>
                  <li className="flex justify-between border-b border-stone-100 pb-1"><span>Vendredi</span><strong>14h00 – 19h00</strong></li>
                  <li className="flex justify-between border-b border-stone-100 pb-1"><span>Samedi</span><strong>10h00 – 18h00</strong></li>
                  <li className="flex justify-between text-stone-400"><span>Dim., Lun., Mar.</span><span>Fermé</span></li>
                </ul>
              </div>
              <div className={`${card} p-4`}>
                <h4 className="font-bold text-xs mb-2" style={{ color: c.brun }}>📍 Nous trouver</h4>
                <p className="text-xs font-semibold text-stone-700">14 rue de la Solidarité, 75000 Paris</p>
                <p className="text-xs text-stone-500 mt-1">Métro Ligne 9 · Vélib' en face</p>
                <p className="text-xs text-stone-600 mt-2">📞 01 42 00 00 00</p>
              </div>
              <div className={`${card} p-4 flex flex-col justify-between`}>
                <div>
                  <h4 className="font-bold text-xs mb-1" style={{ color: c.orange }}>🤝 Devenir Bénévole</h4>
                  <p className="text-xs text-stone-600 mt-1">Rejoignez l'équipe et partagez vos compétences en réparation !</p>
                </div>
                <button onClick={() => setCurrentRoute('/benevole')}
                        className="w-full py-2 rounded-lg text-white text-xs font-bold mt-4"
                        style={{ background: c.vert }}>
                  Accéder à l'espace bénévoles
                </button>
              </div>
            </div>
          </section>

          {/* Guide des dons */}
          <section id="dons" className="space-y-3">
            <h3 className="text-lg font-bold" style={{ color: c.brun }}>📦 Que peut-on donner ?</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: '🔌', label: 'Petit électroménager', detail: 'Aspirateurs, grille-pain…', ok: true },
                { icon: '🪑', label: 'Mobilier & Déco', detail: 'En bon état, démontable', ok: true },
                { icon: '👕', label: 'Vêtements propres', detail: 'Toutes tailles acceptées', ok: true },
                { icon: '🖨️', label: 'Gros électroménager', detail: 'Hors liste, désolé', ok: false },
              ].map(item => (
                <div key={item.label} className={`${card} p-3 text-center`}
                     style={{ borderLeft: `3px solid ${item.ok ? c.vert : c.orange}` }}>
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <p className="text-xs font-bold text-stone-800">{item.label}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">{item.detail}</p>
                  <span className="text-[9px] font-bold mt-1 inline-block"
                        style={{ color: item.ok ? c.vert : c.orange }}>
                    {item.ok ? '✔ Accepté' : '✕ Refusé'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* ══════════════════════════════════════════════
          VUE 2 : ESPACE BÉNÉVOLE (/benevole)
      ══════════════════════════════════════════════ */}
      {currentRoute === '/benevole' && (
        <main className="max-w-7xl w-full mx-auto px-4 py-4 space-y-4 flex-1 pb-24 md:pb-8">

          {/* Header sous-vue */}
          <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: c.vertMed }}>
                Espace Bénévoles
              </span>
              <h2 className="text-base sm:text-xl font-black" style={{ color: c.brun }}>
                Gestion des Dons
              </h2>
            </div>
          </div>

          {/* Sous-vue : Dons */}
          {benevoleView === 'dons' && (
            <div className="space-y-4">
              {/* Formulaire enregistrement don — toujours visible (issue #2) */}
              <div className={`${card} p-4 space-y-3`}>
                <h4 className="font-bold text-xs text-stone-800">📦 Enregistrer un don</h4>
                <form onSubmit={handleCreateDon} className="space-y-2.5 text-xs">
                  {topObjets.length > 0 && (
                    <div>
                      <p className="text-[10px] text-stone-400 mb-1">Les plus fréquents en stock :</p>
                      <div className="flex flex-wrap gap-1.5">
                        {topObjets.map(o => (
                          <button key={o.name} type="button"
                                  onClick={() => { setDonName(o.name); setDonCategory(o.category) }}
                                  className="px-2 py-0.5 rounded-lg text-[11px] font-semibold border"
                                  style={donName === o.name
                                    ? { background: c.vert, color: 'white', borderColor: c.vert }
                                    : { background: c.vertClair, color: c.vert, borderColor: c.vertClair }}>
                            {o.name} <span className="opacity-60">×{o.count}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <input name="name" required value={donName} onChange={e => setDonName(e.target.value)}
                         placeholder="Désignation de l'objet *" className={inputCls} />
                  <div className="grid grid-cols-2 gap-2">
                    <select name="category" value={donCategory} onChange={e => setDonCategory(e.target.value)} className={inputCls}>
                      <option value="Petit électroménager">Petit électroménager</option>
                      <option value="Mobilier & Déco">Mobilier &amp; Déco</option>
                      <option value="Vaisselle & Cuisine">Vaisselle &amp; Cuisine</option>
                      <option value="Vêtements & Textile">Vêtements &amp; Textile</option>
                      <option value="Livres & Jouets">Livres &amp; Jouets</option>
                      <option value="Autre">Autre</option>
                    </select>
                    <select name="status" className={inputCls}>
                      <option value="stockage">📦 Stockage</option>
                      <option value="reparation">🔧 Réparation</option>
                      <option value="vente">🏷️ Présenté client</option>
                    </select>
                  </div>
                  <textarea name="notes" rows={2} placeholder="Notes / Travaux à prévoir (optionnel)" className={inputCls} />
                  <button type="submit" className="w-full py-2 rounded-lg text-white font-bold text-xs"
                          style={{ background: c.vert }}>
                    Enregistrer le don
                  </button>
                </form>
              </div>

              {/* Inventaire */}
              <div className={`${card} p-4 space-y-3`}>
                <h4 className="font-bold text-xs text-stone-800">📋 Inventaire des dons</h4>

                {/* Filtres */}
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {[
                    { key: 'tous', label: 'Tous' },
                    { key: 'stockage', label: '📦 Stock' },
                    { key: 'reparation', label: '🔧 Réparation' },
                    { key: 'vente', label: '🏷️ Vente' },
                    { key: 'vendu', label: '✅ Vendus' },
                  ].map(f => (
                    <button key={f.key} onClick={() => setItemFilter(f.key)}
                            className="px-2 py-0.5 rounded-lg font-semibold transition"
                            style={itemFilter === f.key
                              ? { background: c.brun, color: 'white' }
                              : { background: '#e8e3dc', color: c.brun }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {filteredDons.map(item => (
                  <div key={item.id} className={`${card} p-3 flex items-center justify-between gap-2 text-xs`}>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-stone-400">{item.id}</span>
                        <strong className="text-stone-800">{item.name}</strong>
                      </div>
                      <p className="text-[10px] text-stone-400">{item.category} · {item.date}</p>
                    </div>
                    <select
                      value={item.status}
                      onChange={e => handleChangeDonStatus(item.db_id, e.target.value)}
                      className="text-xs font-bold rounded-lg px-2 py-1 border border-stone-200"
                      style={{ background: c.beige, color: c.brun }}
                    >
                      <option value="stockage">📦 Stockage</option>
                      <option value="reparation">🔧 Réparation</option>
                      <option value="vente">🏷️ Vente</option>
                      <option value="vendu">✅ Vendu</option>
                    </select>
                  </div>
                ))}
                {filteredDons.length === 0 && (
                  <p className="text-center text-stone-400 text-xs py-6">Aucun objet dans cette catégorie.</p>
                )}
              </div>
            </div>
          )}

        </main>
      )}

      {/* ══════════════════════════════════════════════
          VUE 3 : ESPACE MARTINE (/admin)
      ══════════════════════════════════════════════ */}
      {currentRoute === '/admin' && (
        <main className="max-w-7xl w-full mx-auto px-4 py-4 space-y-4 flex-1 pb-24 md:pb-8">

          {/* Header admin */}
          <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: c.jaune }}>
                Supervision Présidence
              </span>
              <h2 className="text-base sm:text-xl font-black" style={{ color: c.brun }}>
                {adminView === 'dons' ? 'Gestion des Dons'
                  : 'Supervision & Statistiques'}
              </h2>
            </div>
            {adminView === 'dons' && (
              <button onClick={() => setIsDonFormOpen(true)}
                      className="px-3 py-1.5 text-white rounded-lg text-xs font-bold shadow-sm"
                      style={{ background: c.vert }}>
                + Don
              </button>
            )}
          </div>

          {/* Admin : Dons */}
          {adminView === 'dons' && (
            <div className="space-y-2.5">
              {isDonFormOpen && (
                <form onSubmit={handleCreateDon} className={`${card} p-4 space-y-2.5 text-xs mb-4`}>
                  <h4 className="font-bold text-stone-800">Enregistrer un don</h4>
                  <input name="name" required placeholder="Désignation de l'objet *" className={inputCls} />
                  <div className="grid grid-cols-2 gap-2">
                    <select name="category" className={inputCls}>
                      <option>Petit électroménager</option>
                      <option>Mobilier &amp; Déco</option>
                      <option>Vaisselle &amp; Cuisine</option>
                      <option>Vêtements &amp; Textile</option>
                    </select>
                    <select name="status" className={inputCls}>
                      <option value="stockage">📦 Stockage</option>
                      <option value="reparation">🔧 Réparation</option>
                      <option value="vente">🏷️ En vente</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setIsDonFormOpen(false)} className="px-2 py-1 text-stone-500">Annuler</button>
                    <button type="submit" className="px-3 py-1 text-white font-bold rounded-lg"
                            style={{ background: c.vert }}>Enregistrer</button>
                  </div>
                </form>
              )}
              {dons.map(item => (
                <div key={item.id} className={`${card} p-3 flex justify-between items-center text-xs`}>
                  <div>
                    <strong className="text-stone-800">{item.name}</strong>
                    <p className="text-[10px] text-stone-400">{item.id} · {item.category} · {item.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={item.status}
                      onChange={e => handleChangeDonStatus(item.db_id, e.target.value)}
                      className="text-xs font-bold rounded-lg px-2 py-1 border border-stone-200"
                      style={{ background: c.beige, color: c.brun }}
                    >
                      <option value="stockage">📦 Stockage</option>
                      <option value="reparation">🔧 Réparation</option>
                      <option value="vente">🏷️ Vente</option>
                      <option value="vendu">✅ Vendu</option>
                    </select>
                    <button onClick={() => handleDeleteDon(item.db_id)} style={{ color: c.orange }} className="font-bold p-1">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Admin : Supervision & KPIs */}
          {adminView === 'supervision' && stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                {[
                  { label: 'Stockage',     val: stats.dons.stockage,   color: c.brun   },
                  { label: 'En réparation',val: stats.dons.reparation,  color: '#92570a' },
                  { label: 'En vente',     val: stats.dons.vente,       color: c.vert   },
                  { label: 'Vendus',       val: stats.dons.vendu,       color: '#1a6b57' },
                ].map(kpi => (
                  <div key={kpi.label} className={`${card} p-3`}>
                    <p className="text-[10px] text-stone-500 font-semibold">{kpi.label}</p>
                    <p className="text-2xl font-black mt-0.5" style={{ color: kpi.color }}>{kpi.val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      )}

      {/* Bottom Nav Bénévoles */}
      {currentRoute === '/benevole' && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-40 py-1.5 px-2 flex justify-around shadow-lg">
          {[
            { key: 'dons',     icon: '📦', label: 'Dons' },
          ].map(item => (
            <button key={item.key}
                    onClick={() => setBenevoleView(item.key as typeof benevoleView)}
                    className="flex flex-col items-center text-[10px] font-medium transition"
                    style={{ color: benevoleView === item.key ? c.vert : '#94a3b8' }}>
              <span className="text-base">{item.icon}</span>
              <span className={benevoleView === item.key ? 'font-bold' : ''}>{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Bottom Nav Admin Martine */}
      {currentRoute === '/admin' && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-40 py-1.5 px-2 flex justify-around shadow-lg">
          {[
            { key: 'dons',       icon: '📦', label: 'Dons' },
            { key: 'supervision',icon: '📊', label: 'Stats' },
          ].map(item => (
            <button key={item.key}
                    onClick={() => setAdminView(item.key as typeof adminView)}
                    className="flex flex-col items-center text-[10px] font-medium transition"
                    style={{ color: adminView === item.key ? c.brun : '#94a3b8' }}>
              <span className="text-base">{item.icon}</span>
              <span className={adminView === item.key ? 'font-bold' : ''}>{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-4 text-center text-[11px] text-stone-400 mt-auto">
        <p>© 2026 La Ressourcerie du Quartier</p>
      </footer>
    </div>
  )
}
