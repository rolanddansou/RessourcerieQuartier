import { dateLabel, monday, shift } from '../dates'
import { Icon } from './Ui'

export function WeekNavigation({
  week,
  disabled,
  onChange,
  onRefresh,
}: {
  week: string
  disabled: boolean
  onChange: (week: string) => void
  onRefresh: () => void
}) {
  return (
    <section className="week-navigation" aria-label="Choix de la semaine">
      <div className="week-controls">
        <button
          type="button"
          className="icon-button secondary"
          disabled={disabled}
          onClick={() => onChange(shift(week, -7))}
          aria-label="Semaine précédente"
        >
          <Icon name="left" />
        </button>
        <div className="week-picker">
          <label htmlFor="week-date">Semaine du lundi</label>
          <input
            id="week-date"
            type="date"
            value={week}
            disabled={disabled}
            onChange={(event) => {
              if (event.target.value) onChange(monday(event.target.value))
            }}
          />
        </div>
        <button
          type="button"
          className="icon-button secondary"
          disabled={disabled}
          onClick={() => onChange(shift(week, 7))}
          aria-label="Semaine suivante"
        >
          <Icon name="right" />
        </button>
      </div>
      <div className="week-context">
        <span>
          Jusqu’au {dateLabel(shift(week, 6), { weekday: undefined })}
        </span>
        <small>Horaires de Paris</small>
      </div>
      <div className="week-shortcuts">
        <button
          type="button"
          className="secondary"
          disabled={disabled || week === monday()}
          onClick={() => onChange(monday())}
        >
          Cette semaine
        </button>
        <button
          type="button"
          className="icon-button secondary"
          disabled={disabled}
          onClick={onRefresh}
          aria-label="Actualiser la semaine"
          title="Actualiser"
        >
          <Icon name="refresh" />
        </button>
      </div>
    </section>
  )
}
