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
 * Returns true if `actual` matches `expected`: when `actual` is an
 * array (e.g. a "tags" list), checks membership case insensitively, so
 * an expected value of "craftable" reads as "includes craftable";
 * booleans compare strictly; anything else compares as strings, case
 * insensitively.
 */
function valuesMatch(actual, expected) {
  if (Array.isArray(actual)) {
    return actual.some((item) => String(item).toLowerCase() === String(expected).toLowerCase())
  }
  if (typeof expected === 'boolean' || typeof actual === 'boolean') {
    return actual === expected
  }
  return String(actual).toLowerCase() === String(expected).toLowerCase()
}

/**
 * Returns true if `row` matches every field/value pair in `filters`,
 * comparing field names case insensitively (see valuesMatch for how
 * each field's value is compared).
 */
function rowMatchesFilters(row, filters) {
  return Object.entries(filters).every(([field, expected]) => {
    const actualEntry = Object.entries(row).find(
      ([key]) => key.toLowerCase() === field
    )
    if (!actualEntry) return false
    return valuesMatch(actualEntry[1], expected)
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
 * Derives the data table a fact's value should be looked up in, by
 * convention: strip a leading "current" (so "currentLocation" ->
 * "Location"), lowercase the first letter, and pluralize — matching
 * how placeholders already map a table name to `data` (see
 * resolvePlaceholder). "currentLocation" therefore looks in
 * `data.locations`, same as the `[location]` placeholder does.
 */
function tableNameForStateKey(stateKey) {
  const withoutPrefix = stateKey.replace(/^current/, '') || stateKey
  return `${withoutPrefix[0].toLowerCase()}${withoutPrefix.slice(1)}s`
}

/**
 * Resolves a dotted prerequisite key like "currentLocation.allowsTrade":
 * looks up the row in the table for `stateKey` (see tableNameForStateKey)
 * whose `name` matches `facts[stateKey]`, then returns that row's
 * `property`. Returns undefined (rather than throwing or warning) when
 * the fact isn't set, the row can't be found, or the property is
 * missing — a location the player is at that isn't in `data.locations`,
 * or a still-default value like "Unknown", are expected, not errors;
 * an unknown *table* is warned about since that usually means a typo in
 * the prerequisite key itself.
 */
function resolveIndirectFact(stateKey, property, facts, data) {
  const identifier = facts[stateKey]
  if (identifier === undefined) return undefined

  const tableName = tableNameForStateKey(stateKey)
  const table = data[tableName]
  if (!table) {
    console.warn(`questEngine: unknown table "${tableName}" for prerequisite key "${stateKey}.${property}"`)
    return undefined
  }

  const row = table.find((candidate) => String(candidate.name).toLowerCase() === String(identifier).toLowerCase())
  if (!row) return undefined

  const propertyEntry = Object.entries(row).find(([rowKey]) => rowKey.toLowerCase() === property.toLowerCase())
  return propertyEntry ? propertyEntry[1] : undefined
}

/**
 * Returns the fact a prerequisite key is actually about: itself for a
 * plain key ("hasFreighter"), or the part before the dot for a dotted
 * key ("currentLocation.allowsTrade" is about the `currentLocation`
 * fact, even though it checks a property on the row that fact points
 * to, not the fact's own value). Shared by prerequisitesMet and
 * preferTasksConsumingEffects so both agree on what a prerequisite key
 * is "about", which matters because an effect only ever sets a plain
 * fact key (e.g. `currentLocation`), never a dotted one.
 */
function factKeyFor(prerequisiteKey) {
  const dotIndex = prerequisiteKey.indexOf('.')
  return dotIndex === -1 ? prerequisiteKey : prerequisiteKey.slice(0, dotIndex)
}

/**
 * Returns true if every key/value pair in `prerequisites` matches.
 * A plain key (e.g. "hasFreighter") compares directly against `facts`.
 * A dotted key (e.g. "currentLocation.allowsTrade") instead checks a
 * property on the row identified by that fact — see
 * resolveIndirectFact — which is how a prerequisite can depend on data
 * about the player's current location (or anything else named the same
 * way as a table) rather than just an exact value already in `facts`.
 * `data` is only needed when a prerequisite uses a dotted key. A task
 * with no prerequisites, or an empty prerequisites object, is always
 * eligible.
 */
export function prerequisitesMet(prerequisites, facts = {}, data = {}) {
  if (!prerequisites) return true
  return Object.entries(prerequisites).every(([key, expected]) => {
    const dotIndex = key.indexOf('.')
    if (dotIndex === -1) {
      return facts[key] === expected
    }

    const property = key.slice(dotIndex + 1)
    const actual = resolveIndirectFact(factKeyFor(key), property, facts, data)
    return actual !== undefined && valuesMatch(actual, expected)
  })
}

/**
 * Narrows `eligibleTasks` to whichever of them have a `prerequisites`
 * key *about* one of `precedingEffectKeys` (via factKeyFor — so a
 * dotted prerequisite like "currentLocation.allowsTrade" counts as
 * being about `currentLocation`, matching an effect that set
 * `currentLocation`, even though the two strings aren't equal), so a
 * task that specifically reacts to what the previous objective just
 * changed is preferred over one that's merely still eligible. Every
 * task here is already known to satisfy its prerequisites (see
 * generateQuestBatch), so checking key membership is enough — no need
 * to re-check values. Falls back to the full `eligibleTasks` when
 * nothing matches, or when there were no preceding effect keys to
 * prefer (e.g. the first pick in a batch), so this never shrinks the
 * pool to nothing.
 */
function preferTasksConsumingEffects(eligibleTasks, precedingEffectKeys) {
  if (precedingEffectKeys.length === 0) return eligibleTasks

  const preferred = eligibleTasks.filter((taskDef) => {
    const prerequisiteKeys = taskDef.prerequisites ? Object.keys(taskDef.prerequisites) : []
    return prerequisiteKeys.some((key) => precedingEffectKeys.includes(factKeyFor(key)))
  })

  return preferred.length > 0 ? preferred : eligibleTasks
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
 * locally-consistent sequence rather than five independent picks.
 * Beyond just being eligible, a task whose own `prerequisites` key on
 * one of the keys the previous objective's `effects` just set is
 * preferred over one that doesn't (see preferTasksConsumingEffects) —
 * so "Buy a settlement chart" (effects: hasSettlementChart) is
 * followed by "Use the settlement chart..." (prerequisites:
 * hasSettlementChart) whenever that task is eligible, rather than some
 * unrelated task that merely happens to also be eligible. If a step
 * finds no eligible tasks (including the very first), generation stops
 * there with a console warning and whatever was already generated is
 * returned, so the batch can come back shorter than `count` rather than
 * crashing or discarding valid earlier objectives.
 */
export function generateQuestBatch(tasks, data, count = 5, facts = {}) {
  let currentFacts = facts
  let precedingEffectKeys = []
  const batch = []

  for (let i = 0; i < count; i++) {
    const eligibleTasks = tasks.filter((taskDef) => prerequisitesMet(taskDef.prerequisites, currentFacts, data))
    if (eligibleTasks.length === 0) {
      console.warn('questEngine: no tasks match the current prerequisites/facts')
      break
    }

    const candidateTasks = preferTasksConsumingEffects(eligibleTasks, precedingEffectKeys)
    const taskDef = candidateTasks[Math.floor(Math.random() * candidateTasks.length)]
    const resolutions = {}
    const text = resolveTemplate(taskDef.task, data, { record: resolutions })
    const effects = resolveEffects(taskDef.effects, data, resolutions)

    batch.push({
      id: `${Date.now()}-${i}-${Math.floor(Math.random() * 1e6)}`,
      text,
      effects,
    })
    currentFacts = { ...currentFacts, ...effects }
    precedingEffectKeys = Object.keys(effects)
  }

  return batch
}
