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
 * Parses a query string like "type=mineral&tags=craftable" into a plain
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
 * comparing field names case insensitively. A string filter value
 * matches a string field's value case insensitively; when the field's
 * actual value is an array (e.g. a "tags" list), the filter instead
 * checks that the array contains a matching entry, so
 * "tags=craftable" reads as "tags includes craftable".
 */
function rowMatchesFilters(row, filters) {
  return Object.entries(filters).every(([field, expected]) => {
    const actualEntry = Object.entries(row).find(
      ([key]) => key.toLowerCase() === field
    )
    if (!actualEntry) return false
    const actual = actualEntry[1]

    if (Array.isArray(actual)) {
      return actual.some((tag) => String(tag).toLowerCase() === String(expected).toLowerCase())
    }

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
 *
 * `options.cache`, when given, is consulted first for each placeholder
 * match (keyed by its exact literal text, e.g. "[location]"): a hit
 * reuses that value instead of resolving again. `options.record`, when
 * given, has every freshly resolved placeholder written into it keyed
 * the same way, but only once the whole template has been processed —
 * never mid-call — so passing the same object as both `cache` and
 * `record` to one call still resolves repeated placeholders in that
 * call independently; only a *later* call sees what this one recorded.
 * This is how a task's `effects` can refer back to a placeholder
 * already resolved in its own `task` text (see generateQuestBatch)
 * without re-rolling a new one.
 */
export function resolveTemplate(template, data, options = {}) {
  if (typeof template !== 'string') return template
  const { cache, record } = options
  const freshlyResolved = record ? {} : null

  const result = template.replace(PLACEHOLDER_RE, (match, tableName, queryString, rangeMin, rangeMax) => {
    if (cache && Object.prototype.hasOwnProperty.call(cache, match)) {
      return cache[match]
    }
    const resolved = resolvePlaceholder(match, tableName, queryString, rangeMin, rangeMax, data)
    if (freshlyResolved) freshlyResolved[match] = resolved
    return resolved
  })

  if (record) Object.assign(record, freshlyResolved)
  return result
}

/**
 * Resolves a task's `effects` values against `data`, reusing whatever
 * that task's own text already resolved a placeholder to (via
 * `resolutions`) instead of picking a fresh one — e.g. an effect of
 * "[location]" on a "Go to [location]" task lands on the exact location
 * the task sent the player to. A placeholder in an effect that wasn't
 * present in the task's text resolves fresh, and other effects on the
 * same quest can then reuse that value too. Non-string values (e.g.
 * booleans) pass through untouched.
 */
function resolveEffects(effects, data, resolutions) {
  const resolved = {}
  for (const [key, value] of Object.entries(effects || {})) {
    resolved[key] =
      typeof value === 'string' ? resolveTemplate(value, data, { cache: resolutions, record: resolutions }) : value
  }
  return resolved
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
 * random (repeats allowed), resolving each chosen template
 * independently against `data`, and returns them in order. Each
 * resolved quest carries its task's `effects` through, resolved the
 * same way (see resolveEffects) so a placeholder in an effect can refer
 * back to the exact value resolved in that task's own text (see
 * src/lib/playerState.js for what a caller does with the result: apply
 * it to player state once that objective is completed). A task with no
 * effects carries an empty object, never undefined.
 *
 * Eligibility is simulated sequentially rather than decided once up
 * front: it starts from `facts`, and after each objective is picked,
 * that objective's own resolved `effects` are folded into a running
 * copy of the facts before picking the next one. This means an earlier
 * objective changing something (e.g. its `effects` set
 * `currentLocation`) is reflected in which tasks are eligible for the
 * objective that follows it — the batch reads as one continuous,
 * locally-consistent sequence rather than five independent picks. If a
 * step finds no eligible tasks (including the very first), generation
 * stops there with a console warning and whatever was already
 * generated is returned, so the batch can come back shorter than
 * `count` rather than crashing or discarding valid earlier objectives.
 */
export function generateQuestBatch(tasks, data, count = 5, facts = {}) {
  let currentFacts = facts
  const batch = []

  for (let i = 0; i < count; i++) {
    const eligibleTasks = tasks.filter((taskDef) => prerequisitesMet(taskDef.prerequisites, currentFacts))
    if (eligibleTasks.length === 0) {
      console.warn('questEngine: no tasks match the current prerequisites/facts')
      break
    }

    const taskDef = eligibleTasks[Math.floor(Math.random() * eligibleTasks.length)]
    const resolutions = {}
    const text = resolveTemplate(taskDef.task, data, { record: resolutions })
    const effects = resolveEffects(taskDef.effects, data, resolutions)

    batch.push({
      id: `${Date.now()}-${i}-${Math.floor(Math.random() * 1e6)}`,
      text,
      effects,
    })
    currentFacts = { ...currentFacts, ...effects }
  }

  return batch
}
