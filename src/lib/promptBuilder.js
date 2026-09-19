/**
 * Framework-agnostic helpers for turning a batch of resolved quest
 * objectives into a copyable prompt for an external LLM. Pure functions,
 * no React dependency, mirroring questEngine.js.
 */

/**
 * Formats resolved quests as a numbered list, one per line, preserving
 * their current order.
 */
export function formatObjectivesList(quests) {
  return quests.map((quest, index) => `${index + 1}. ${quest.text}`).join('\n')
}

/**
 * Formats answers to the pooled setup questions (see
 * src/data/promptQuestions.json) as a bullet list, in question order,
 * for inclusion in the prompt. Falls back to a question's first option
 * when it hasn't been answered yet.
 */
export function formatAnswers(questions, answers) {
  return questions
    .map((question) => `- ${question.question} ${answers[question.id] ?? question.options[0]}`)
    .join('\n')
}

/**
 * Fills a prompt template's {{count}}, {{context}}, and {{objectives}}
 * placeholders using the given batch of quests and a pre-formatted
 * context string (see formatAnswers).
 */
export function buildNarrativePrompt(quests, template, context = '') {
  const objectives = formatObjectivesList(quests)
  return template
    .replace(/{{\s*count\s*}}/g, String(quests.length))
    .replace(/{{\s*context\s*}}/g, context)
    .replace(/{{\s*objectives\s*}}/g, objectives)
}
