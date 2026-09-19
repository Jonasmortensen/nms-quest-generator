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
 * Fills a prompt template's {{count}} and {{objectives}} placeholders
 * using the given batch of quests.
 */
export function buildNarrativePrompt(quests, template) {
  const objectives = formatObjectivesList(quests)
  return template
    .replace(/{{\s*count\s*}}/g, String(quests.length))
    .replace(/{{\s*objectives\s*}}/g, objectives)
}
