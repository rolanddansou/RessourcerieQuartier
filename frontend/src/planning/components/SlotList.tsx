import { dateLabel, parisToday, weekDays } from '../dates'
import type { Slot, User } from '../types'
import { EmptyState, Icon } from './Ui'

export function SlotList({
  week,
  slots,
  people,
  assignment = false,
  editable = false,
  busy,
  ownRef,
  onEdit,
  onDelete,
  onPrepare,
}: {
  week: string
  slots: Slot[]
  people?: User[]
  assignment?: boolean
  editable?: boolean
  busy: boolean
  ownRef?: string
  onEdit?: (slot: Slot) => void
  onDelete?: (slot: Slot) => void
  onPrepare?: (slot: Slot) => void
}) {
  if (!slots.length)
    return (
      <EmptyState
        title={
          assignment
            ? 'Aucune affectation pour le moment'
            : 'La semaine est encore libre'
        }
      >
        {assignment
          ? 'Les affectations apparaîtront ici une fois ajoutées au planning.'
          : people
            ? 'Les disponibilités des bénévoles apparaîtront ici dès leur saisie.'
            : 'Ajoutez votre première disponibilité avec le formulaire.'}
      </EmptyState>
    )

  return (
    <div className={assignment ? 'week-grid' : 'availability-list'}>
      {weekDays(week).map((day) => {
        const entries = slots
          .filter((slot) => slot.date === day)
          .sort((a, b) => a.start.localeCompare(b.start))
        return (
          <section
            key={day}
            className={`day-group ${day === parisToday() ? 'is-today' : ''}`}
            aria-label={dateLabel(day)}
          >
            <div className="day-heading">
              <h3>
                <span>
                  {dateLabel(day, { day: undefined, month: undefined })}
                </span>
                <strong>
                  {dateLabel(day, { weekday: undefined, month: 'short' })}
                </strong>
              </h3>
              {day === parisToday() && (
                <span className="today-label">Aujourd’hui</span>
              )}
              <span
                className="day-count"
                aria-label={`${entries.length} plage(s)`}
              >
                {entries.length}
              </span>
            </div>
            {!entries.length && (
              <p className="day-empty">
                {assignment ? 'Aucune affectation' : 'Aucune disponibilité'}
              </p>
            )}
            {entries.map((slot) => (
              <article
                key={slot.id}
                className={`slot-card ${slot.user_ref === ownRef && assignment ? 'own-slot' : ''}`}
              >
                <div className="slot-time">
                  <Icon name="clock" size={15} />
                  <strong>
                    {slot.start} – {slot.end}
                  </strong>
                </div>
                {assignment && (
                  <p className="slot-person">
                    {slot.name}
                    {slot.user_ref === ownRef && (
                      <span className="you-badge">Vous</span>
                    )}
                  </p>
                )}
                {!assignment && people && (
                  <p className="slot-person">
                    {people.find((person) => person.id === slot.user_ref)
                      ?.name ?? 'Bénévole indisponible'}
                  </p>
                )}
                {(assignment ? slot.note : slot.details) && (
                  <p className="slot-note">
                    {assignment ? slot.note : slot.details}
                  </p>
                )}
                {editable && (
                  <div className="slot-actions">
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      onClick={() => onEdit?.(slot)}
                    >
                      <Icon name="edit" size={15} />
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="text-button danger"
                      disabled={busy}
                      aria-label={`Supprimer la plage du ${dateLabel(slot.date)} de ${slot.start} à ${slot.end}`}
                      onClick={() => onDelete?.(slot)}
                    >
                      <Icon name="trash" size={15} />
                      Supprimer
                    </button>
                  </div>
                )}
                {onPrepare &&
                  people?.some((person) => person.id === slot.user_ref) && (
                    <button
                      type="button"
                      className="prepare-button secondary"
                      disabled={busy}
                      onClick={() => onPrepare(slot)}
                    >
                      <Icon name="plus" size={15} />
                      Préparer une affectation
                    </button>
                  )}
              </article>
            ))}
          </section>
        )
      })}
    </div>
  )
}
