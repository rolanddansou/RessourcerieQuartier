import { useEffect, useRef, type FormEvent } from 'react'
import { dateLabel, shift } from '../dates'
import type { Draft, FieldErrors, User } from '../types'
import { Icon, Notice } from './Ui'

export function SlotEditor({
  week,
  assignment,
  editing,
  value,
  people,
  busy,
  errors,
  focusKey,
  errorFocusKey,
  onChange,
  onSubmit,
  onCancel,
}: {
  week: string
  assignment: boolean
  editing: boolean
  value: Draft
  people: User[]
  busy: boolean
  errors: FieldErrors
  focusKey: number
  errorFocusKey: number
  onChange: (key: keyof Draft, value: string) => void
  onSubmit: (event: FormEvent) => void
  onCancel: () => void
}) {
  const panel = useRef<HTMLElement>(null)
  const date = useRef<HTMLInputElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const lastFocusedError = useRef(-1)
  useEffect(() => {
    if (!focusKey) return
    panel.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    date.current?.focus({ preventScroll: true })
  }, [focusKey])
  useEffect(() => {
    if (lastFocusedError.current === errorFocusKey) return
    lastFocusedError.current = errorFocusKey
    if (!Object.keys(errors).length) return
    const field = form.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    )
    if (field) field.focus()
    else panel.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [errors, errorFocusKey])

  const textKey = assignment ? 'note' : 'details'
  const generalErrors = Object.entries(errors)
    .filter(
      ([key]) => !['date', 'start', 'end', 'user_ref', textKey].includes(key),
    )
    .flatMap(([, messages]) => messages)
  const attributes = (key: keyof Draft) => ({
    'aria-invalid': !!errors[key]?.length,
    'aria-describedby': errors[key]?.length ? `error-${key}` : undefined,
  })
  const fieldError = (key: keyof Draft) =>
    errors[key]?.length ? (
      <span className="field-error" id={`error-${key}`}>
        {errors[key].join(' ')}
      </span>
    ) : null

  return (
    <section
      ref={panel}
      className="panel editor"
      aria-labelledby="editor-title"
    >
      <div className="editor-heading">
        <span className="icon-tile">
          <Icon name={editing ? 'edit' : 'plus'} />
        </span>
        <div>
          <p className="eyebrow">
            {editing ? 'MODIFICATION' : 'NOUVELLE PLAGE'}
          </p>
          <h2 id="editor-title">
            {editing ? 'Modifier' : 'Ajouter'}{' '}
            {assignment ? 'une affectation' : 'une disponibilité'}
          </h2>
        </div>
      </div>
      <p className="muted editor-intro">
        {assignment
          ? 'Choisissez un bénévole et des horaires couverts par ses disponibilités.'
          : 'Indiquez quand vous pouvez venir prêter main-forte à l’équipe.'}
      </p>
      {generalErrors.length > 0 && <Notice>{generalErrors.join(' ')}</Notice>}
      <form ref={form} onSubmit={onSubmit} noValidate>
        <fieldset disabled={busy}>
          <label htmlFor="slot-date">Date</label>
          <input
            ref={date}
            id="slot-date"
            type="date"
            min={week}
            max={shift(week, 6)}
            required
            value={value.date}
            {...attributes('date')}
            onChange={(event) => onChange('date', event.target.value)}
          />
          {fieldError('date')}
          {assignment && (
            <>
              <label htmlFor="slot-person">Bénévole</label>
              <select
                id="slot-person"
                required
                value={value.user_ref}
                {...attributes('user_ref')}
                onChange={(event) => onChange('user_ref', event.target.value)}
              >
                <option value="">Choisir un bénévole</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              {fieldError('user_ref')}
            </>
          )}
          <div className="hours">
            <div>
              <label htmlFor="slot-start">Début</label>
              <input
                id="slot-start"
                type="time"
                required
                value={value.start}
                {...attributes('start')}
                onChange={(event) => onChange('start', event.target.value)}
              />
              {fieldError('start')}
            </div>
            <div>
              <label htmlFor="slot-end">Fin</label>
              <input
                id="slot-end"
                type="time"
                required
                value={value.end}
                {...attributes('end')}
                onChange={(event) => onChange('end', event.target.value)}
              />
              {fieldError('end')}
            </div>
          </div>
          <label htmlFor="slot-note">
            {assignment ? 'Note (facultative)' : 'Détails (facultatif)'}
          </label>
          <textarea
            id="slot-note"
            maxLength={2000}
            rows={4}
            value={value[textKey]}
            {...attributes(textKey)}
            onChange={(event) => onChange(textKey, event.target.value)}
            placeholder={
              assignment
                ? 'Une précision utile pour l’équipe…'
                : 'Une précision sur votre disponibilité…'
            }
          />
          {fieldError(textKey)}
          <div className="field-hint">
            <span>Horaires dans la même journée.</span>
            <span>{value[textKey].length} / 2 000</span>
          </div>
          {assignment && (
            <p className="form-context">
              <Icon name="calendar" size={15} />
              {value.date ? dateLabel(value.date) : 'Choisissez une date'}
            </p>
          )}
          <div className="actions form-actions">
            <button type="submit">
              {busy
                ? 'Enregistrement…'
                : editing
                  ? 'Enregistrer les modifications'
                  : 'Enregistrer'}
            </button>
            <button type="button" className="secondary" onClick={onCancel}>
              {editing ? 'Annuler' : 'Réinitialiser'}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  )
}
