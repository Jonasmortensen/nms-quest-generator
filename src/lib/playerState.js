/**
 * Framework-agnostic helpers built around the player state schema (see
 * src/data/playerStateSchema.json): a list of
 * { id, default, formQuestion? } entries describing each piece of
 * player state.
 *
 * The persisted player state itself is the canonical, typed
 * representation (e.g. { hasFreighter: false, currentLocation:
 * "Unknown" }) — the same shape a task's `prerequisites` and `effects`
 * are expressed in, so the quest engine needs no translation at all.
 * The only place a labelled, readable form (e.g. "Yes"/"No") exists is
 * at the UI boundary, for entries that declare a `formQuestion`. An
 * entry without one is hidden from the form entirely and can only be
 * changed by a task's `effects`.
 */

export const PLAYER_STATE_STORAGE_KEY = 'nms-quest-generator:player-state'

function isBooleanEntry(entry) {
  return typeof entry.default === 'boolean'
}

/**
 * Renders the schema entries that have a formQuestion into the
 * { id, question, options } shape QuestionForm expects. Entries without
 * a formQuestion are omitted, i.e. hidden from the form.
 */
export function schemaToFormQuestions(schema) {
  return schema
    .filter((entry) => entry.formQuestion)
    .map((entry) => ({
      id: entry.id,
      question: entry.formQuestion.label,
      options: entry.formQuestion.options,
    }))
}

/**
 * Converts one entry's typed value into the label shown in its form
 * (matched case-insensitively against its options, so it round-trips
 * regardless of how the options were capitalized). Boolean entries are
 * assumed to have a Yes/No-style formQuestion. An entry with no
 * formQuestion has no label representation, so the value is returned
 * as-is.
 */
export function valueToLabel(entry, value) {
  if (!entry.formQuestion) return value
  if (!isBooleanEntry(entry)) return value

  const target = value ? 'yes' : 'no'
  const match = entry.formQuestion.options.find((option) => option.toLowerCase() === target)
  return match ?? entry.formQuestion.options[0]
}

/**
 * The inverse of valueToLabel: converts a form label back into the
 * entry's typed value.
 */
export function labelToValue(entry, label) {
  if (!isBooleanEntry(entry)) return label
  return label.toLowerCase() === 'yes'
}

/**
 * Converts the full typed player state into labelled form answers,
 * keyed by id, for every schema entry that has a formQuestion. Entries
 * without one are omitted, same as schemaToFormQuestions.
 */
export function stateToFormAnswers(schema, state) {
  const answers = {}
  for (const entry of schema) {
    if (entry.formQuestion) {
      answers[entry.id] = valueToLabel(entry, state[entry.id])
    }
  }
  return answers
}

/**
 * Looks up a schema entry by id and converts a form label back into its
 * typed value. Falls back to the label itself if the id isn't in the
 * schema.
 */
export function formAnswerToValue(schema, id, label) {
  const entry = schema.find((candidate) => candidate.id === id)
  return entry ? labelToValue(entry, label) : label
}
