import { shift } from './dates'
import type { Draft, FieldErrors } from './types'

export function validateDraft(
  draft: Draft,
  week: string,
  assignment: boolean,
): FieldErrors {
  const errors: FieldErrors = {}
  if (!draft.date || draft.date < week || draft.date > shift(week, 6)) {
    errors.date = ['Choisissez une date dans la semaine sélectionnée.']
  }
  if (!draft.start) errors.start = ['Indiquez une heure de début.']
  if (!draft.end) errors.end = ['Indiquez une heure de fin.']
  else if (draft.start && draft.start >= draft.end)
    errors.end = ['La fin doit être après le début, le même jour.']
  if (assignment && !draft.user_ref)
    errors.user_ref = ['Choisissez un bénévole.']
  const textKey = assignment ? 'note' : 'details'
  if (draft[textKey].length > 2000)
    errors[textKey] = ['Le texte est limité à 2 000 caractères.']
  return errors
}
