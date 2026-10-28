import { useState, useEffect } from 'react'

// Types pour l'API
interface DonItem {
  id: string
  db_id: number
  name: string
  category: string
  status: 'recu' | 'a_reparer' | 'repare' | 'vente' | 'vendu'
  date: string
  notes: string
}

interface Infos {
  adresse: string
  acces: string
  telephone: string
  email: string
  horaires: { jour: string; plage: string }[]
  jours_fermes: string
  fermetures: { id: number; date: string; motif: string }[]
  updated_at: string
}

interface Stats {
  dons: { total: number; recu: number; a_reparer: number; repare: number; vente: number; vendu: number }
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

interface Critere {
  id: number
  kind: 'accepte' | 'refuse' | 'depot'
  icon: string
  label: string
  detail: string
  condition: string
}

/* ── Ligne éditable d'un critère de don (espace admin) ── */
function CritereRow({ critere, onSave, onDelete, inputCls }: {
  critere: Critere
  onSave: (id: number, data: Partial<Critere>) => void
  onDelete: (id: number) => void
  inputCls: string
}) {
  const [draft, setDraft] = useState(critere)
  const changed = JSON.stringify(draft) !== JSON.stringify(critere)
  const set = (k: keyof Critere, v: string) => setDraft({ ...draft, [k]: v })
  const k = critere.kind
  return (
    <div className="rounded-lg border border-stone-200 p-2 space-y-1.5 bg-stone-50">
      {k !== 'depot' && (
        <div className="flex gap-2">
          {k === 'accepte' && <input value={draft.icon} onChange={e => set('icon', e.target.value)} className={`${inputCls} !w-14 text-center`} placeholder="🔌" />}
          <input value={draft.label} onChange={e => set('label', e.target.value)} className={inputCls}
                 placeholder={k === 'accepte' ? 'Catégorie' : 'Objet refusé'} />
        </div>
      )}
      <input value={draft.detail} onChange={e => set('detail', e.target.value)} className={inputCls}
             placeholder={k === 'accepte' ? "Exemples d'objets" : k === 'refuse' ? 'Raison du refus' : 'Condition de dépôt'} />
      {k === 'accepte' && (
        <input value={draft.condition} onChange={e => set('condition', e.target.value)} className={inputCls} placeholder="Condition (ex : propre, en bon état)" />
      )}
      <div className="flex justify-end gap-3 text-xs font-bold">
        <button type="button" onClick={() => onDelete(critere.id)}
                className="px-2.5 py-1 rounded-lg border" style={{ color: c.orange, borderColor: c.orange }}>🗑 Retirer</button>
        <button type="button" disabled={!changed} onClick={() => onSave(critere.id, draft)}
                className="px-2.5 py-1 rounded-lg text-white"
                style={{ background: changed ? c.vert : '#cfcfcf' }}>{changed ? '💾 Enregistrer' : '✓ À jour'}</button>
      </div>
    </div>
  )
}

/* ── Groupe de critères : lecture + mode « éditer la liste » ── */
function CritereGroup({ kind, titre, color, items, itemLabel, onSave, onDelete, onAdd, inputCls }: {
  kind: Critere['kind']
  titre: string
  color: string
  items: Critere[]
  itemLabel: string
  onSave: (id: number, data: Partial<Critere>) => void
  onDelete: (id: number) => void
  onAdd: (data: Partial<Critere> & { kind: Critere['kind'] }) => Promise<boolean>
  inputCls: string
}) {
  const [editing, setEditing] = useState(false)
  const [nouveau, setNouveau] = useState({ icon: '', label: '', detail: '', condition: '' })
  const vide = kind === 'depot' ? !nouveau.detail.trim() : !nouveau.label.trim()

  const ajouter = async () => {
    if (vide) return
    if (await onAdd({ kind, ...nouveau })) setNouveau({ icon: '', label: '', detail: '', condition: '' })
  }

  return (
    <div className="rounded-xl border-2 p-3 space-y-3" style={{ borderColor: `${color}55` }}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-sm" style={{ color }}>{titre} <span className="text-stone-400 font-normal">({items.length})</span></p>
        <button type="button" onClick={() => setEditing(!editing)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white whitespace-nowrap shrink-0"
                style={{ background: editing ? '#6b7280' : color }}>
          {editing ? '✓ Terminer' : '✏️ Éditer la liste'}
        </button>
      </div>

      {!editing && (
        items.length === 0
          ? <p className="text-xs text-stone-400">Liste vide. Cliquez sur « Éditer la liste » pour ajouter.</p>
          : <ul className="text-xs text-stone-700 space-y-1">
              {items.map(it => (
                <li key={it.id}>
                  {kind === 'accepte' && `${it.icon} `}<strong>{it.label}</strong>
                  {it.label && it.detail && ' — '}{it.detail}
                  {it.condition && <span className="text-stone-400"> (condition : {it.condition})</span>}
                </li>
              ))}
            </ul>
      )}

      {editing && (
        <div className="space-y-3">
          <div className="rounded-lg p-2.5 space-y-1.5" style={{ background: `${color}12` }}>
            <p className="text-xs font-bold" style={{ color }}>➕ {itemLabel}</p>
            {kind !== 'depot' && (
              <div className="flex gap-2">
                {kind === 'accepte' && <input value={nouveau.icon} onChange={e => setNouveau({ ...nouveau, icon: e.target.value })} className={`${inputCls} !w-14 text-center`} placeholder="📦" />}
                <input value={nouveau.label} onChange={e => setNouveau({ ...nouveau, label: e.target.value })} className={inputCls}
                       placeholder={kind === 'accepte' ? 'Nom de la catégorie *' : "Nom de l'objet refusé *"} />
              </div>
            )}
            <input value={nouveau.detail} onChange={e => setNouveau({ ...nouveau, detail: e.target.value })} className={inputCls}
                   placeholder={kind === 'accepte' ? "Exemples d'objets" : kind === 'refuse' ? 'Raison du refus' : 'Texte de la condition *'} />
            {kind === 'accepte' && (
              <input value={nouveau.condition} onChange={e => setNouveau({ ...nouveau, condition: e.target.value })} className={inputCls} placeholder="Condition (ex : propre, en bon état)" />
            )}
            <button type="button" onClick={ajouter} disabled={vide}
                    className="w-full py-2 rounded-lg text-white text-xs font-bold"
                    style={{ background: vide ? '#cfcfcf' : color }}>➕ Ajouter à la liste</button>
          </div>

          {items.length > 0 && <p className="text-[11px] text-stone-400">Modifiez un texte puis cliquez sur « Enregistrer », ou retirez la ligne :</p>}
          {items.map(cr => (
            <CritereRow key={`${cr.id}-${cr.label}-${cr.detail}-${cr.condition}-${cr.icon}`} critere={cr}
                        onSave={onSave} onDelete={onDelete} inputCls={inputCls} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── États d'un objet ── */
const DON_STATUTS = [
  { key: 'recu',      label: '📥 Reçu' },
  { key: 'a_reparer', label: '🔧 À réparer' },
  { key: 'repare',    label: '🛠️ Réparé' },
  { key: 'vente',     label: '🏷️ Mis en vente' },
  { key: 'vendu',     label: '✅ Vendu' },
]

function StatutOptions({ sans = [] }: { sans?: string[] }) {
  return <>{DON_STATUTS.filter(s => !sans.includes(s.key)).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</>
}

/* ── Badge statut don ── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    recu:      { label: '📥 Reçu',         bg: c.brunCl,  color: c.brun   },
    a_reparer: { label: '🔧 À réparer',    bg: c.jauneCl, color: '#92570a' },
    repare:    { label: '🛠️ Réparé',       bg: '#eaf1fb', color: '#1e4f8a' },
    vente:     { label: '🏷️ Mis en vente',     bg: c.vertClair,color: c.vert  },
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
  const [adminView, setAdminView] = useState<'dons' | 'supervision' | 'infos'>('dons')
  const [infos, setInfos] = useState<Infos | null>(null)
  const [criteres, setCriteres] = useState<Critere[]>([])
  const [horairesEdit, setHorairesEdit] = useState<{ jour: string; plage: string }[]>([])
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
      const [resDons, resStats, resInfos, resCriteres] = await Promise.all([
        fetch('/api/dons/').then(r => r.json()),
        fetch('/api/stats/').then(r => r.json()),
        fetch('/api/infos/').then(r => r.json()),
        fetch('/api/criteres/').then(r => r.json()),
      ])
      setDons(resDons)
      setStats(resStats)
      setInfos(resInfos)
      setCriteres(resCriteres)
      setHorairesEdit(resInfos.horaires)
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
      if (res.ok) { showToast(`État mis à jour : ${DON_STATUTS.find(s => s.key === newStatus)?.label ?? newStatus}`); fetchAllData() }
    } catch { showToast('Erreur réseau') }
  }

  const handleSaveInfos = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = e.currentTarget.elements
    const val = (n: string) => (f.namedItem(n) as HTMLInputElement).value
    try {
      const res = await fetch('/api/infos/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adresse: val('adresse'), acces: val('acces'), telephone: val('telephone'),
          email: val('email'), jours_fermes: val('jours_fermes'), horaires: horairesEdit,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setInfos(data); setHorairesEdit(data.horaires)
        showToast('Informations publiques mises à jour')
      } else showToast('Enregistrement impossible')
    } catch { showToast('Erreur réseau') }
  }

  const handleAddFermeture = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const date = (form.elements.namedItem('date') as HTMLInputElement).value
    const motif = (form.elements.namedItem('motif') as HTMLInputElement).value
    try {
      const res = await fetch('/api/fermetures/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, motif }),
      })
      if (res.ok) { showToast('Jour de fermeture ajouté'); form.reset(); fetchAllData() }
      else showToast('Date invalide')
    } catch { showToast('Erreur réseau') }
  }

  const handleDeleteFermeture = async (id: number) => {
    try {
      const res = await fetch(`/api/fermetures/${id}/`, { method: 'DELETE' })
      if (res.ok) { showToast('Fermeture retirée'); fetchAllData() }
    } catch { showToast('Erreur réseau') }
  }

  const fmtJour = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const handleSaveCritere = async (id: number, data: Partial<Critere>) => {
    try {
      const res = await fetch(`/api/criteres/${id}/`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      if (res.ok) { showToast('Critère enregistré'); fetchAllData() } else showToast('Enregistrement impossible')
    } catch { showToast('Erreur réseau') }
  }

  const handleAddCritere = async (data: Partial<Critere> & { kind: Critere['kind'] }) => {
    try {
      const res = await fetch('/api/criteres/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      if (res.ok) { showToast('Ajouté à la liste'); fetchAllData(); return true }
      showToast("Ajout impossible")
    } catch { showToast('Erreur réseau') }
    return false
  }

  const handleDeleteCritere = async (id: number) => {
    if (!confirm('Supprimer ce critère ?')) return
    try {
      const res = await fetch(`/api/criteres/${id}/`, { method: 'DELETE' })
      if (res.ok) { showToast('Critère supprimé'); fetchAllData() }
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
        <div className="fixed bottom-20 right-4 left-4 sm:left-auto sm:right-5 z-50 text-white px-4 py-3 rounded-xl shadow-2xl text-xs flex items-center gap-2"
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
          <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm"
               style={{ background: `linear-gradient(120deg, #fffdf8 0%, ${c.jauneCl} 55%, ${c.vertClair} 100%)` }}>
            <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-2 px-6 pt-8 sm:px-10 md:pt-0">
              <div className="md:col-span-3 space-y-4 md:py-12">
                <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                      style={{ background: c.jaune, color: c.brun }}>
                  🌱 Quartier solidaire · Zéro déchet
                </span>
                <h2 className="text-2xl sm:text-4xl font-black leading-tight" style={{ color: c.vert }}>
                  Ici, rien ne se perd,<br />tout se partage&nbsp;!
                </h2>
                <p className="text-sm sm:text-base text-stone-700 leading-relaxed max-w-xl">
                  La Ressourcerie du Quartier, c'est la bande de voisins qui donne une seconde vie à tout ce que vous n'utilisez plus :
                  une lampe, une chaise, un grille-pain… On les récupère, on les répare dans la bonne humeur, puis on les revend
                  à petit prix. Résultat : moins de déchets, des économies pour tous et un quartier qui se
                  connaît mieux.
                </p>
                <p className="text-sm sm:text-base text-stone-700 leading-relaxed max-w-xl">
                  Venez donner, dénicher une bonne affaire, ou pousser la porte d'un de nos <strong>ateliers de réparation</strong> :
                  on vous y apprend à réparer, café et sourires compris.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a href="#horaires"
                     className="px-4 py-2.5 rounded-lg text-white font-bold text-xs shadow-sm transition hover:opacity-90"
                     style={{ background: c.orange }}>
                    ⏰ Horaires &amp; accès
                  </a>
                  <a href="#dons"
                     className="px-4 py-2.5 rounded-lg font-bold text-xs border transition hover:bg-white"
                     style={{ color: c.vert, borderColor: c.vert }}>
                    📦 Que peut-on donner ?
                  </a>
                </div>
              </div>
              <div className="md:col-span-2 flex justify-center md:justify-end self-end">
                <img src="/martine.png" alt="Martine, présidente de la Ressourcerie du Quartier, tenant le panneau de l'association"
                     className="w-64 sm:w-80 md:w-full max-w-sm h-auto drop-shadow-lg" />
              </div>
            </div>
          </div>

          {/* Horaires & Accès */}
          <section id="horaires" className="space-y-3">
            <h3 className="text-lg font-bold" style={{ color: c.brun }}>⏰ Horaires &amp; Accès</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`${card} p-4`}>
                <h4 className="font-bold text-xs mb-2.5" style={{ color: c.vert }}>📅 Boutique &amp; Dépôts</h4>
                <ul className="text-xs space-y-1.5 text-stone-700">
                  {infos?.horaires.map(h => (
                    <li key={h.jour} className="flex justify-between border-b border-stone-100 pb-1"><span>{h.jour}</span><strong>{h.plage}</strong></li>
                  ))}
                  {infos?.jours_fermes && (
                    <li className="flex justify-between text-stone-400"><span>{infos.jours_fermes}</span><span>Fermé</span></li>
                  )}
                </ul>
                {infos && infos.fermetures.length > 0 && (
                  <div className="mt-3 rounded-lg p-2 text-xs" style={{ background: c.orangeCl, color: c.orange }}>
                    <p className="font-bold mb-1">⚠️ Fermetures exceptionnelles</p>
                    <ul className="space-y-0.5">
                      {infos.fermetures.map(f => (
                        <li key={f.id}><span className="capitalize">{fmtJour(f.date)}</span>{f.motif && ` · ${f.motif}`}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {infos && (
                  <p className="text-[10px] text-stone-400 mt-2">
                    Mis à jour le {new Date(infos.updated_at).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
              <div className={`${card} p-4`}>
                <h4 className="font-bold text-xs mb-2" style={{ color: c.brun }}>📍 Nous trouver</h4>
                <p className="text-xs font-semibold text-stone-700">{infos?.adresse}</p>
                {infos?.acces && <p className="text-xs text-stone-500 mt-1">{infos.acces}</p>}
                {infos?.telephone && <p className="text-xs text-stone-600 mt-2">📞 <a href={`tel:${infos.telephone.replace(/\s/g, '')}`}>{infos.telephone}</a></p>}
                {infos?.email && <p className="text-xs text-stone-600 mt-1">✉️ <a href={`mailto:${infos.email}`} className="underline">{infos.email}</a></p>}
              </div>
            </div>
          </section>

          {/* Devenir bénévole */}
          <section id="benevoles" className="rounded-2xl overflow-hidden text-white"
                   style={{ background: `linear-gradient(135deg, ${c.vert} 0%, #1e4d2b 100%)` }}>
            <div className="px-6 py-8 sm:px-10 sm:py-10 space-y-5">
              <div className="space-y-2 max-w-2xl">
                <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                      style={{ background: c.jaune, color: c.brun }}>🤝 On a besoin de vous</span>
                <h3 className="text-2xl sm:text-3xl font-black leading-tight">Et si vous nous rejoigniez&nbsp;?</h3>
                <p className="text-sm sm:text-base opacity-90 leading-relaxed">
                  Pas besoin d'être bricoleur ni disponible tous les jours : chez nous, chacun donne le temps qu'il peut,
                  et repart avec le sourire.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: '🔧', titre: 'Apprenez de nouveaux gestes', texte: "Réparer, trier, relooker : nos bénévoles vous montrent, vous transmettez ensuite." },
                  { icon: '☕', titre: 'Rencontrez vos voisins', texte: 'Une équipe chaleureuse, des permanences conviviales et beaucoup de rires.' },
                  { icon: '🌍', titre: 'Agissez concrètement', texte: "Chaque objet sauvé, c'est un déchet évité et un foyer qui économise." },
                ].map(b => (
                  <div key={b.titre} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.12)' }}>
                    <p className="text-2xl">{b.icon}</p>
                    <p className="font-bold text-sm mt-1">{b.titre}</p>
                    <p className="text-xs opacity-85 mt-1 leading-relaxed">{b.texte}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a href={`mailto:${infos?.email ?? ""}?subject=Devenir%20b%C3%A9n%C3%A9vole`}
                        className="inline-block px-6 py-3 rounded-xl font-black text-sm shadow-lg transition hover:scale-105"
                        style={{ background: c.jaune, color: c.brun }}>
                  🙋 Devenir bénévole
                </a>
                <span className="text-xs opacity-80">Moins de 2 minutes · sans engagement</span>
              </div>
            </div>
          </section>

          {/* Guide des dons */}
          <section id="dons" className="space-y-4">
            <div>
              <h3 className="text-lg font-bold" style={{ color: c.brun }}>📦 Que peut-on donner ?</h3>
              <p className="text-xs text-stone-500 mt-0.5">Vérifiez en 30 secondes si votre objet convient avant de vous déplacer.</p>
            </div>

            {/* Acceptés */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold" style={{ color: c.vert }}>✔ Nous acceptons</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {criteres.filter(x => x.kind === 'accepte').map(item => (
                  <div key={item.id} className={`${card} p-3`} style={{ borderLeft: `4px solid ${c.vert}` }}>
                    <p className="text-sm font-bold text-stone-800">{item.icon} {item.label}</p>
                    <p className="text-xs text-stone-600 mt-1">{item.detail}</p>
                    {item.condition && <p className="text-[11px] mt-1.5 font-semibold" style={{ color: c.vertMed }}>Condition : {item.condition}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Refusés */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold" style={{ color: c.orange }}>✕ Nous refusons</h4>
              <div className="rounded-xl p-3" style={{ background: c.orangeCl, border: `1px solid ${c.orange}33` }}>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-stone-700">
                  {criteres.filter(x => x.kind === 'refuse').map(r => (
                    <li key={r.id}><strong style={{ color: c.orange }}>✕ {r.label}</strong>{r.detail && ` — ${r.detail}`}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Conditions de dépôt */}
            <div className={`${card} p-4 space-y-2`}>
              <h4 className="text-sm font-bold" style={{ color: c.brun }}>📋 Conditions de dépôt</h4>
              <ol className="text-xs text-stone-700 space-y-1 list-decimal list-inside">
                {criteres.filter(x => x.kind === 'depot').map(cd => <li key={cd.id}>{cd.detail}</li>)}
              </ol>
              {infos && (
                <div className="text-xs rounded-lg p-2" style={{ background: c.vertClair, color: c.vert }}>
                  <strong>Déposez aux heures d'ouverture :</strong>{' '}
                  {infos.horaires.map(h => `${h.jour} ${h.plage}`).join(' · ')}
                  <br />📍 {infos.adresse}
                  {infos.fermetures.length > 0 && (
                    <span className="block mt-1" style={{ color: c.orange }}>
                      ⚠️ Fermé exceptionnellement : {infos.fermetures.map(f => fmtJour(f.date)).join(', ')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      {/* ══════════════════════════════════════════════
          VUE 2 : ESPACE BÉNÉVOLE (/benevole)
      ══════════════════════════════════════════════ */}
      {currentRoute === '/benevole' && (
        <main className="max-w-7xl w-full mx-auto px-4 py-4 space-y-4 flex-1 pb-24">

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
                      <StatutOptions sans={['vendu']} />
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
                    ...DON_STATUTS,
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
                  <div key={item.id} className={`${card} p-3 flex items-center justify-between gap-2 text-xs ${item.status === 'vendu' ? 'opacity-50' : ''}`}>
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
                      <StatutOptions />
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
        <main className="max-w-7xl w-full mx-auto px-4 py-4 space-y-4 flex-1 pb-24">

          {/* Header admin */}
          <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: c.jaune }}>
                Supervision Présidence
              </span>
              <h2 className="text-base sm:text-xl font-black" style={{ color: c.brun }}>
                {adminView === 'dons' ? 'Gestion des Dons'
                  : adminView === 'infos' ? 'Informations publiques'
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
                      <StatutOptions sans={['vendu']} />
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
                <div key={item.id} className={`${card} p-3 flex justify-between items-center text-xs ${item.status === 'vendu' ? 'opacity-50' : ''}`}>
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
                      <StatutOptions />
                    </select>
                    <button onClick={() => handleDeleteDon(item.db_id)} style={{ color: c.orange }} className="font-bold p-1">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Admin : Informations publiques (horaires, adresse, contact) */}
          {adminView === 'infos' && infos && (
            <div className={`${card} p-4 space-y-3 text-xs`}>
              <h4 className="font-bold text-stone-800">🚫 Ajouter un jour de fermeture</h4>
              <form onSubmit={handleAddFermeture} className="flex flex-wrap gap-2">
                <input name="date" type="date" required min={new Date().toISOString().slice(0, 10)} className={`${inputCls} !w-auto`} />
                <input name="motif" placeholder="Motif (ex : jour férié)" className={`${inputCls} flex-1 min-w-[140px]`} />
                <button type="submit" className="px-3 py-2 rounded-lg text-white font-bold" style={{ background: c.orange }}>
                  Fermer ce jour
                </button>
              </form>
              {infos.fermetures.length > 0 ? (
                <ul className="space-y-1">
                  {infos.fermetures.map(f => (
                    <li key={f.id} className="flex items-center justify-between rounded-lg px-2 py-1" style={{ background: c.orangeCl }}>
                      <span><span className="capitalize font-semibold">{fmtJour(f.date)}</span>{f.motif && ` · ${f.motif}`}</span>
                      <button onClick={() => handleDeleteFermeture(f.id)} style={{ color: c.orange }} className="font-bold px-1">✕</button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-stone-400">Aucune fermeture exceptionnelle à venir.</p>}
            </div>
          )}

          {adminView === 'infos' && infos && (
            <form onSubmit={handleSaveInfos} className={`${card} p-4 space-y-3 text-xs`}>
              <p className="text-stone-500">Ces informations s'affichent sur le site public, sans connexion.</p>
              <input name="adresse" required defaultValue={infos.adresse} placeholder="Adresse" className={inputCls} />
              <input name="acces" defaultValue={infos.acces} placeholder="Accès / transports" className={inputCls} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input name="telephone" defaultValue={infos.telephone} placeholder="Téléphone" className={inputCls} />
                <input name="email" type="email" defaultValue={infos.email} placeholder="Email" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <p className="font-bold text-stone-800">Horaires d'ouverture</p>
                {horairesEdit.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={h.jour} placeholder="Jour"
                           onChange={e => setHorairesEdit(horairesEdit.map((x, j) => j === i ? { ...x, jour: e.target.value } : x))}
                           className={inputCls} />
                    <input value={h.plage} placeholder="14h00 – 18h30"
                           onChange={e => setHorairesEdit(horairesEdit.map((x, j) => j === i ? { ...x, plage: e.target.value } : x))}
                           className={inputCls} />
                    <button type="button" onClick={() => setHorairesEdit(horairesEdit.filter((_, j) => j !== i))}
                            style={{ color: c.orange }} className="font-bold px-1">✕</button>
                  </div>
                ))}
                <button type="button" onClick={() => setHorairesEdit([...horairesEdit, { jour: '', plage: '' }])}
                        className="font-semibold" style={{ color: c.vert }}>+ Ajouter un jour</button>
              </div>
              <input name="jours_fermes" defaultValue={infos.jours_fermes} placeholder="Jours de fermeture (ex : Dim., Lun., Mar.)" className={inputCls} />
              <button type="submit" className="w-full py-2 rounded-lg text-white font-bold" style={{ background: c.vert }}>
                Enregistrer
              </button>
            </form>
          )}

          {adminView === 'infos' && (
            <div className={`${card} p-4 space-y-4 text-xs`}>
              <div>
                <h4 className="font-bold text-sm text-stone-800">📦 Critères de dons</h4>
                <p className="text-stone-500">Ce que les habitants voient sur le site public. Cliquez sur « Éditer la liste » pour ajouter ou retirer des éléments.</p>
              </div>
              {([
                { kind: 'accepte', titre: '✔ Objets acceptés', color: c.vert, itemLabel: 'Ajouter un objet accepté' },
                { kind: 'refuse', titre: '✕ Objets refusés', color: c.orange, itemLabel: 'Ajouter un objet refusé' },
                { kind: 'depot', titre: '📋 Conditions de dépôt', color: c.brun, itemLabel: 'Ajouter une condition' },
              ] as const).map(g => (
                <CritereGroup key={g.kind} kind={g.kind} titre={g.titre} color={g.color} itemLabel={g.itemLabel}
                              items={criteres.filter(x => x.kind === g.kind)}
                              onSave={handleSaveCritere} onDelete={handleDeleteCritere} onAdd={handleAddCritere} inputCls={inputCls} />
              ))}
            </div>
          )}

          {/* Admin : Supervision & KPIs */}
          {adminView === 'supervision' && stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                {[
                  { label: 'Reçus',        val: stats.dons.recu,       color: c.brun   },
                  { label: 'À réparer',    val: stats.dons.a_reparer,  color: '#92570a' },
                  { label: 'Réparés',      val: stats.dons.repare,     color: '#1e4f8a' },
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
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-40 py-1.5 px-2 flex justify-around md:justify-center md:gap-14 shadow-lg">
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
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-40 py-1.5 px-2 flex justify-around md:justify-center md:gap-14 shadow-lg">
          {[
            { key: 'dons',       icon: '📦', label: 'Dons' },
            { key: 'infos',      icon: 'ℹ️', label: 'Infos' },
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
