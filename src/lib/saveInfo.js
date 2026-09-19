/**
 * Framework-agnostic helpers for converting Save Info between the two
 * representations it needs:
 *  - "answers": the readable, labelled form persisted from the UI form
 *    (e.g. { hasFreighter: "Yes" }), keyed by question id.
 *  - "facts": the flat, typed form the quest engine checks a task's
 *    `prerequisites` against and a task's `effects` are expressed in
 *    (e.g. { hasFreighter: true }), also keyed by question id.
 * answersToFacts/valueToAnswer/factsToAnswers convert between the two in
 * both directions so a task's effects (typed) can update persisted
 * answers (labelled) without losing round-trip fidelity.
 */

export const SAVE_INFO_STORAGE_KEY = 'nms-quest-generator:save-info'

function isYesNoQuestion(question) {
  const normalized = question.options.map((option) => option.toLowerCase())
  return normalized.length === 2 && normalized.includes('yes') && normalized.includes('no')
}

/**
 * Converts answers keyed by question id into facts keyed the same way.
 * Yes/No questions become booleans (true for "Yes"); every other
 * question is passed through as its raw string answer. Unanswered
 * questions fall back to their first option, same as the form's default.
 */
export function answersToFacts(questions, answers) {
  const facts = {}
  for (const question of questions) {
    const value = answers[question.id] ?? question.options[0]
    facts[question.id] = isYesNoQuestion(question) ? value.toLowerCase() === 'yes' : value
  }
  return facts
}

/**
 * The inverse of a single answersToFacts conversion: turns a typed fact
 * value for one question back into the exact label string used in its
 * `options` (so it round-trips through the UI form, whatever casing the
 * options were written in). Non Yes/No questions already store their
 * label as the fact value, so they pass straight through.
 */
export function valueToAnswer(question, value) {
  if (!isYesNoQuestion(question)) return value

  const target = value ? 'yes' : 'no'
  const match = question.options.find((option) => option.toLowerCase() === target)
  return match ?? question.options[0]
}

/**
 * Converts a partial facts object (as produced by a task's `effects`,
 * see questEngine.js) back into answers keyed by question id, using
 * valueToAnswer for each fact present. Only includes facts that match a
 * known question, so unrelated facts are ignored rather than corrupting
 * unrelated answers.
 */
export function factsToAnswers(questions, facts) {
  const answers = {}
  for (const question of questions) {
    if (Object.prototype.hasOwnProperty.call(facts, question.id)) {
      answers[question.id] = valueToAnswer(question, facts[question.id])
    }
  }
  return answers
}

/**
 * Merges a task's `effects` onto an existing facts object. Effects
 * always win over the prior value for a given fact.
 */
export function applyEffects(facts, effects) {
  return { ...facts, ...effects }
}
