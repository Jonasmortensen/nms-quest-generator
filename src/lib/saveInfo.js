/**
 * Framework-agnostic helpers for turning persisted Save Info answers
 * into a flat "facts" object the quest engine can check task
 * prerequisites against (see prerequisitesMet in questEngine.js).
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
