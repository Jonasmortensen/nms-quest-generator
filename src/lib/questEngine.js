/**
 * Framework-agnostic quest templating engine.
 *
 * Pure functions only, no React dependency, so this module can be unit
 * tested or reused (CLI, server, another UI) without pulling in a
 * rendering layer.
 */

const PLACEHOLDER_RE = /\[([a-zA-Z]+)(?:\?([^\]]*))?\]|\[(-?\d+)-(-?\d+)\]/g

const FALLBACK_TEXT = '{no matching item found}'

/**
 * Coerces a raw filter value string ("true", "false", or a plain string)
 * into the type it should be compared against.
 */
function coerceFilterValue(rawValue) {
  if (rawValue === 'true') return true
  if (rawValue === 'false') return false
  return rawValue
}

/**
 * Parses a query string like "type=mineral&craftable=true" into a plain
 * object of { field: value } pairs, lower-casing field names so lookups
 * are case insensitive.
 */
function parseFilters(queryString) {
  if (!queryString) return {}
  const filters = {}
  for (const pair of queryString.split('&')) {
    if (!pair) continue
    const [rawKey, rawValue] = pair.split('=')
    if (!rawKey) continue
    const key = rawKey.trim().toLowerCase()
    filters[key] = coerceFilterValue((rawValue ?? '').trim())
  }
  return filters
}

/**
 * Returns true if `row` matches every field/value pair in `filters`,
 * comparing field names case insensitively and values loosely (a string
 * filter value matches a string field's value case insensitively).
 */
function rowMatchesFilters(row, filters) {
  return Object.entries(filters).every(([field, expected]) => {
    const actualEntry = Object.entries(row).find(
      ([key]) => key.toLowerCase() === field
    )
    if (!actualEntry) return false
    const actual = actualEntry[1]

    if (typeof expected === 'boolean' || typeof actual === 'boolean') {
      return actual === expected
    }
    return String(actual).toLowerCase() === String(expected).toLowerCase()
  })
}

/**
 * Picks a random row from `table` matching `filters`. Returns null when
 * nothing matches, so callers can fall back and warn instead of crashing.
 */
function pickRandomRow(table, filters) {
  const candidates = table.filter((row) => rowMatchesFilters(row, filters))
  if (candidates.length === 0) return null
  const index = Math.floor(Math.random() * candidates.length)
  return candidates[index]
}

function randomIntInclusive(min, max) {
  const low = Math.min(min, max)
  const high = Math.max(min, max)
  return Math.floor(Math.random() * (high - low + 1)) + low
}

/**
 * Resolves a single placeholder match against the given data tables.
 * `tableName` is one of "item" / "location" (case sensitive as written
 * in the template); range placeholders arrive as separate capture groups.
 */
function resolvePlaceholder(match, tableName, queryString, rangeMin, rangeMax, data) {
  if (rangeMin !== undefined && rangeMax !== undefined) {
    return String(randomIntInclusive(Number(rangeMin), Number(rangeMax)))
  }

  const table = data[`${tableName.toLowerCase()}s`]
  if (!table) {
    console.warn(`questEngine: unknown table "${tableName}" in placeholder "${match}"`)
    return FALLBACK_TEXT
  }

  const filters = parseFilters(queryString)
  const row = pickRandomRow(table, filters)
  if (!row) {
    console.warn(`questEngine: no matching row for placeholder "${match}"`)
    return FALLBACK_TEXT
  }

  return row.name
}

/**
 * Resolves every placeholder in `template` independently, so repeated
 * placeholders (e.g. two [item] tags in the same string) can each
 * resolve to a different row.
 *
 * `data` is expected to have the shape { items: [...], locations: [...] }.
 */
export function resolveTemplate(template, data) {
  if (typeof template !== 'string') return template

  return template.replace(
    PLACEHOLDER_RE,
    (match, tableName, queryString, rangeMin, rangeMax) =>
      resolvePlaceholder(match, tableName, queryString, rangeMin, rangeMax, data)
  )
}

/**
 * Returns true if every key/value pair in `prerequisites` matches the
 * given `facts` (e.g. { hasFreighter: true }). A task with no
 * prerequisites, or an empty prerequisites object, is always eligible.
 */
export function prerequisitesMet(prerequisites, facts = {}) {
  if (!prerequisites) return true
  return Object.entries(prerequisites).every(([key, expected]) => facts[key] === expected)
}

/**
 * Picks `count` task definitions ({ task, prerequisites, effects }) at
 * random (repeats allowed) from those whose prerequisites are met by
 * `facts`, and resolves each chosen template independently against
 * `data`. Each resolved quest carries its task's `effects` through
 * unresolved (see src/lib/saveInfo.js): the facts a caller should apply
 * to Save Info once that objective is completed. A task with no effects
 * carries an empty object, never undefined.
 */
export function generateQuestBatch(tasks, data, count = 5, facts = {}) {
  const eligibleTasks = tasks.filter((taskDef) => prerequisitesMet(taskDef.prerequisites, facts))

  if (eligibleTasks.length === 0) {
    console.warn('questEngine: no tasks match the current prerequisites/facts')
    return []
  }

  const batch = []
  for (let i = 0; i < count; i++) {
    const taskDef = eligibleTasks[Math.floor(Math.random() * eligibleTasks.length)]
    batch.push({
      id: `${Date.now()}-${i}-${Math.floor(Math.random() * 1e6)}`,
      text: resolveTemplate(taskDef.task, data),
      effects: taskDef.effects || {},
    })
  }
  return batch
}
