import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, ApiError, errorMessage } from './api'
import { dateLabel, emptyDraft, monday, slotDraft, totalHours } from './dates'
import { useWeekData } from './useWeekData'
import { validateDraft } from './validation'
import type { Draft, FieldErrors, Page, Slot, User } from './types'
import {
  ConfirmDialog,
  EmptyState,
  Icon,
  Loading,
  Notice,
  type Confirmation,
} from './components/Ui'
import { SlotEditor } from './components/SlotEditor'
import { SlotList } from './components/SlotList'
import { WeekNavigation } from './components/WeekNavigation'
import { Brand, BrandEmblem } from './components/Brand'
import equipeBenevoles from '../assets/equipe-benevoles.png'

const pages: Record<Page, { title: string; description: string }> = {
  availability: {
    title: 'Mes disponibilités',
    description:
      'Un créneau libre ? Faites savoir à l’équipe quand vous pouvez venir.',
  },
  planning: {
    title: 'Le planning de l’équipe',
    description:
      'Retrouvez les présences de la semaine et préparez votre prochaine venue.',
  },
  admin: {
    title: 'Organiser la semaine',
    description:
      'Rassemblez les disponibilités et composez le planning de l’équipe.',
  },
}

export function PlanningWorkspace({
  user,
  onExpired,
  onLogout,
}: {
  user: User
  onExpired: () => void
  onLogout: () => void
}) {
  const admin = user.roles.includes('admin')
  const volunteer = user.roles.includes('benevole')
  const [page, setPage] = useState<Page>(user.roles.includes('admin') ? 'admin' : 'availability')
  const [week, setWeek] = useState(monday)
  const [revision, setRevision] = useState(0)
  const [draft, setDraft] = useState(() => emptyDraft(week))
  const [initialDraft, setInitialDraft] = useState(draft)
  const [editing, setEditing] = useState<number | null>(null)
  const [focusKey, setFocusKey] = useState(0)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [errorFocusKey, setErrorFocusKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const actionInProgress = useRef(false)
  const hasAccess = user.active && (admin || volunteer)
  // Mounted only for authorized users by App; permission errors remain visible.
  const state = useWeekData(user, page, week, revision, onExpired)
  const data = state.data
  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft)
  const loading = state.status === 'loading'
  const locked = busy || loading

  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])

  function resetEditor(next = emptyDraft(week), id: number | null = null) {
    setDraft(next)
    setInitialDraft(next)
    setEditing(id)
    setErrors({})
  }

  function guard(change: () => void) {
    if (!dirty) return change()
    setConfirmation({
      title: 'Quitter la saisie en cours ?',
      description:
        'Vos modifications ne sont pas encore enregistrées. Elles seront perdues si vous continuez.',
      label: 'Continuer sans enregistrer',
      confirm: () => {
        setConfirmation(null)
        change()
      },
    })
  }

  function navigate(nextPage: Page, nextWeek = week) {
    if (nextPage === page && nextWeek === week) return
    guard(() => {
      setPage(nextPage)
      setWeek(nextWeek)
      resetEditor(emptyDraft(nextWeek))
      setActionError('')
      setSuccess('')
      setFocusKey(0)
    })
  }

  async function run(task: () => Promise<void>, message: string, form = false) {
    if (actionInProgress.current) return false
    actionInProgress.current = true
    setBusy(true)
    setSuccess('')
    setActionError('')
    if (form) setErrors({})
    try {
      await task()
      setSuccess(message)
      return true
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) onExpired()
      else if (form) {
        setErrors(
          error instanceof ApiError && Object.keys(error.fields).length
            ? error.fields
            : { form: [errorMessage(error)] },
        )
        setErrorFocusKey((value) => value + 1)
      } else setActionError(errorMessage(error))
      return false
    } finally {
      actionInProgress.current = false
      setBusy(false)
    }
  }

  function changeField(key: keyof Draft, value: string) {
    setDraft((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) =>
      Object.fromEntries(
        Object.entries(previous).filter(
          ([field]) =>
            field !== key && !['form', 'availability'].includes(field),
        ),
      ),
    )
    setSuccess('')
  }

  function edit(slot: Slot) {
    guard(() => {
      resetEditor(slotDraft(slot), slot.id)
      setFocusKey((value) => value + 1)
      setSuccess('')
    })
  }

  function prepare(slot?: Slot) {
    guard(() => {
      resetEditor(
        slot
          ? {
              ...emptyDraft(week),
              date: slot.date,
              start: slot.start,
              end: slot.end,
              user_ref: slot.user_ref,
            }
          : emptyDraft(week),
      )
      setFocusKey((value) => value + 1)
      setSuccess('')
    })
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const validation = validateDraft(draft, week, page === 'admin')
    if (Object.keys(validation).length) {
      setErrors(validation)
      setErrorFocusKey((value) => value + 1)
      return
    }
    if (!data || (page === 'admin' && !data.planning)) return
    const path =
      page === 'availability'
        ? `availabilities/${editing ? `${editing}/` : ''}`
        : `weeks/${data.planning!.id}/assignments/${editing ? `${editing}/` : ''}`
    const payload =
      page === 'availability'
        ? {
            date: draft.date,
            start: draft.start,
            end: draft.end,
            details: draft.details,
          }
        : {
            date: draft.date,
            start: draft.start,
            end: draft.end,
            user_ref: draft.user_ref,
            note: draft.note,
          }
    const saved = await run(
      async () => {
        await api(path, { method: editing ? 'PUT' : 'POST', data: payload })
      },
      page === 'availability'
        ? 'Disponibilité enregistrée.'
        : 'Affectation enregistrée.',
      true,
    )
    if (saved) {
      resetEditor()
      setRevision((value) => value + 1)
    }
  }

  function remove(slot: Slot) {
    const itemName = page === 'availability' ? 'disponibilité' : 'affectation'
    setConfirmation({
      title: `Supprimer cette ${itemName} ?`,
      description: `${dateLabel(slot.date)}, de ${slot.start} à ${slot.end}${slot.name ? ` · ${slot.name}` : ''}. Cette action est définitive.`,
      label: 'Supprimer',
      destructive: true,
      confirm: async () => {
        const removed = await run(
          async () => {
            await api(
              page === 'availability'
                ? `availabilities/${slot.id}/`
                : `weeks/${data!.planning!.id}/assignments/${slot.id}/`,
              { method: 'DELETE' },
            )
          },
          page === 'availability'
            ? 'Disponibilité supprimée.'
            : 'Affectation supprimée.',
        )
        setConfirmation(null)
        if (removed) {
          if (editing === slot.id) resetEditor()
          setRevision((value) => value + 1)
        }
      },
    })
  }

  async function publish() {
    if (!data) return
    const planning = data.planning
    const updated = await run(
      async () => {
        await api(planning ? `weeks/${planning.id}/publication/` : 'weeks/', {
          method: 'POST',
          data: planning ? { published: !planning.published } : { week },
        })
      },
      planning
        ? planning.published
          ? 'Planning dépublié. Il est maintenant masqué aux bénévoles.'
          : 'Planning publié. Toute l’équipe peut le consulter.'
        : 'Brouillon créé. Vous pouvez ajouter des affectations.',
    )
    if (updated) setRevision((value) => value + 1)
  }

  function publicationAction() {
    if (dirty) {
      guard(() => {
        resetEditor()
        void publish()
      })
      return
    }
    if (!data?.planning?.published) {
      void publish()
      return
    }
    setConfirmation({
      title: 'Dépublier le planning ?',
      description:
        'Les bénévoles ne pourront plus consulter ce planning jusqu’à sa prochaine publication.',
      label: 'Dépublier',
      confirm: async () => {
        await publish()
        setConfirmation(null)
      },
    })
  }

  function logout() {
    guard(() => {
      void run(async () => {
        await api('logout/', { method: 'POST' })
        onLogout()
      }, '')
    })
  }

  const assignments = data?.planning?.assignments ?? []
  const ownAssignments = assignments.filter((slot) => slot.user_ref === user.id)
  const availableDays = new Set(data?.slots.map((slot) => slot.date)).size
  const availablePeople = new Set(data?.slots.map((slot) => slot.user_ref)).size
  const plannedPeople = new Set(assignments.map((slot) => slot.user_ref)).size
  const stats =
    page === 'availability'
      ? [
          {
            value: data?.slots.length ?? 0,
            label:
              data?.slots.length === 1 ? 'plage déclarée' : 'plages déclarées',
            icon: 'calendar' as const,
          },
          {
            value: `${totalHours(data?.slots ?? [])} h`,
            label: 'de disponibilité',
            icon: 'clock' as const,
          },
          {
            value: availableDays,
            label:
              availableDays === 1 ? 'jour disponible' : 'jours disponibles',
            icon: 'check' as const,
          },
        ]
      : page === 'admin'
        ? [
            {
              value: availablePeople,
              label:
                availablePeople === 1
                  ? 'bénévole disponible'
                  : 'bénévoles disponibles',
              icon: 'users' as const,
            },
            {
              value: `${totalHours(data?.slots ?? [])} h`,
              label: 'proposées par l’équipe',
              icon: 'clock' as const,
            },
            {
              value: assignments.length,
              label:
                assignments.length === 1
                  ? 'affectation au planning'
                  : 'affectations au planning',
              icon: 'calendar' as const,
            },
          ]
        : [
            {
              value: assignments.length,
              label:
                assignments.length === 1
                  ? 'affectation cette semaine'
                  : 'affectations cette semaine',
              icon: 'calendar' as const,
            },
            {
              value: `${totalHours(assignments)} h`,
              label: 'de présence planifiée',
              icon: 'clock' as const,
            },
            {
              value: plannedPeople,
              label:
                plannedPeople === 1
                  ? 'bénévole mobilisé'
                  : 'bénévoles mobilisés',
              icon: 'users' as const,
            },
          ]

  return (
    <>
      <a href="#main-content" className="skip-link">
        Aller au contenu
      </a>
      <header className="app-header">
        <div className="header-inner">
          <Brand />
          <div className="account">
            <span className="avatar" aria-hidden="true">
              {user.name.slice(0, 1).toLocaleUpperCase('fr')}
            </span>
            <span className="account-name">
              {user.name}
              <small>{admin ? 'Administration' : 'Bénévole'}</small>
            </span>
            <button
              type="button"
              className="icon-button secondary"
              disabled={busy}
              onClick={logout}
              aria-label="Déconnexion"
              title="Déconnexion"
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" className="workspace-main" tabIndex={-1}>
        <div className={`page-heading ${volunteer && !admin ? 'with-team-photo' : ''}`}>
          <div>
            <p className="eyebrow">LE COIN DES BÉNÉVOLES</p>
            <h1>
              <span className="title-paper">{pages[page].title}</span>
            </h1>
            <p className="page-description">{pages[page].description}</p>
          </div>
          {volunteer && !admin && (
            <img
              className="page-team-photo"
              src={equipeBenevoles}
              alt="Portrait de l’équipe des bénévoles solidaires"
            />
          )}
          <div className="hero-collage" aria-hidden="true">
            <BrandEmblem />
            <span className="community-label">
              Chaque présence
              <br />
              <strong>compte !</strong>
            </span>
          </div>
        </div>
        <nav className="page-nav" aria-label="Espace planning">
          {volunteer && (
            <button
              type="button"
              aria-current={page === 'availability' ? 'page' : undefined}
              disabled={busy}
              onClick={() => navigate('availability')}
            >
              <Icon name="clock" />
              Mes disponibilités
            </button>
          )}
          <button
            type="button"
            aria-current={page === 'planning' ? 'page' : undefined}
            disabled={busy}
            onClick={() => navigate('planning')}
          >
            <Icon name="calendar" />
            Planning
          </button>
          {admin && (
            <button
              type="button"
              aria-current={page === 'admin' ? 'page' : undefined}
              disabled={busy}
              onClick={() => navigate('admin')}
            >
              <Icon name="users" />
              Gestion du planning
            </button>
          )}
        </nav>
        {!hasAccess ? (
          <Notice>
            Votre compte ne possède pas de rôle planning actif. Contactez un
            administrateur.
          </Notice>
        ) : (
          <>
            <WeekNavigation
              week={week}
              disabled={locked}
              onChange={(next) => navigate(page, next)}
              onRefresh={() => {
                setActionError('')
                setRevision((value) => value + 1)
              }}
            />
            <div className="feedback-stack">
              {success && <Notice tone="success">{success}</Notice>}
              {actionError && <Notice>{actionError}</Notice>}
            </div>
            {loading ? (
              <Loading />
            ) : state.status === 'error' ? (
              <Notice
                action={
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => setRevision((value) => value + 1)}
                  >
                    Réessayer le chargement
                  </button>
                }
              >
                {state.error} Les données de cette semaine n’ont pas pu être
                chargées.
              </Notice>
            ) : (
              data && (
                <>
                  <div className="stats-grid" aria-label="Résumé de la semaine">
                    {stats.map((stat) => (
                      <div className="stat" key={stat.label}>
                        <span className="stat-icon">
                          <Icon name={stat.icon} size={20} />
                        </span>
                        <div>
                          <strong>{stat.value}</strong>
                          <span>{stat.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {page === 'planning' &&
                    volunteer &&
                    data.planning &&
                    ownAssignments.length > 0 && (
                      <Notice tone="info">
                        Vous avez {ownAssignments.length} affectation
                        {ownAssignments.length > 1 ? 's' : ''} cette semaine.
                        Vos plages sont repérées par la mention « Vous ».
                      </Notice>
                    )}
                  {page !== 'availability' && (
                    <section
                      className="panel planning-panel"
                      aria-labelledby="planning-title"
                    >
                      <div className="panel-heading">
                        <div>
                          <h2 id="planning-title">
                            {page === 'admin'
                              ? 'Planning de la semaine'
                              : 'Les présences de la semaine'}
                          </h2>
                          <p className="muted">
                            {data.planning?.published
                              ? 'Visible par tous les bénévoles.'
                              : 'Les brouillons sont visibles uniquement par les administrateurs.'}
                          </p>
                        </div>
                        <div className="actions">
                          <span
                            className={`status-badge ${data.planning?.published ? 'published' : ''}`}
                          >
                            <span />
                            {data.planning
                              ? data.planning.published
                                ? 'Publié'
                                : 'Brouillon'
                              : 'Non publié'}
                          </span>
                          {page === 'admin' && (
                            <button
                              type="button"
                              className={
                                data.planning?.published ? 'secondary' : ''
                              }
                              disabled={locked}
                              onClick={publicationAction}
                            >
                              <Icon name={data.planning ? 'check' : 'plus'} />
                              {data.planning
                                ? data.planning.published
                                  ? 'Dépublier'
                                  : 'Publier le planning'
                                : 'Créer le planning'}
                            </button>
                          )}
                        </div>
                      </div>
                      {!data.planning ? (
                        <EmptyState
                          title={
                            page === 'admin'
                              ? 'Une nouvelle semaine à organiser'
                              : 'Le planning arrive bientôt'
                          }
                        >
                          {page === 'admin'
                            ? 'Créez un brouillon, puis ajoutez les affectations à partir des disponibilités de l’équipe.'
                            : 'Aucun planning n’a encore été publié pour cette semaine. Vous pouvez consulter une autre semaine.'}
                        </EmptyState>
                      ) : (
                        <SlotList
                          week={week}
                          slots={assignments}
                          assignment
                          ownRef={user.id}
                          editable={page === 'admin'}
                          busy={locked}
                          onEdit={edit}
                          onDelete={remove}
                        />
                      )}
                    </section>
                  )}
                  {(page === 'availability' || page === 'admin') && (
                    <div className="editor-layout">
                      <section
                        className="panel"
                        aria-labelledby="availability-title"
                      >
                        <div className="panel-heading">
                          <div>
                            <h2 id="availability-title">
                              {page === 'availability'
                                ? 'Mes plages de disponibilité'
                                : 'Disponibilités de l’équipe'}
                            </h2>
                            <p className="muted">
                              {page === 'availability'
                                ? 'Vous pouvez déclarer plusieurs plages par jour.'
                                : 'Sélectionnez une plage pour préparer une affectation.'}
                            </p>
                          </div>
                          {page === 'availability' && (
                            <button
                              type="button"
                              className="icon-button secondary"
                              disabled={locked}
                              onClick={() => prepare()}
                              aria-label="Ajouter une disponibilité"
                            >
                              <Icon name="plus" />
                            </button>
                          )}
                        </div>
                        <SlotList
                          week={week}
                          slots={data.slots}
                          people={page === 'admin' ? data.people : undefined}
                          editable={page === 'availability'}
                          busy={locked}
                          onEdit={edit}
                          onDelete={remove}
                          onPrepare={
                            page === 'admin' && data.planning
                              ? prepare
                              : undefined
                          }
                        />
                      </section>
                      {page === 'availability' || data.planning ? (
                        <SlotEditor
                          week={week}
                          assignment={page === 'admin'}
                          editing={editing !== null}
                          value={draft}
                          people={data.people}
                          busy={locked}
                          errors={errors}
                          focusKey={focusKey}
                          errorFocusKey={errorFocusKey}
                          onChange={changeField}
                          onSubmit={(event) => void save(event)}
                          onCancel={() => resetEditor()}
                        />
                      ) : (
                        <aside className="setup-hint">
                          <Icon name="calendar" size={30} />
                          <h3>Prêt à organiser la semaine ?</h3>
                          <p>
                            Créez d’abord le planning pour commencer à affecter
                            les bénévoles.
                          </p>
                        </aside>
                      )}
                    </div>
                  )}
                </>
              )
            )}
          </>
        )}
        <footer className="workspace-footer">
          <Icon name="leaf" size={15} />
          Du temps partagé, un quartier qui avance.
        </footer>
      </main>
      <ConfirmDialog
        value={confirmation}
        busy={busy}
        onClose={() => setConfirmation(null)}
      />
    </>
  )
}
