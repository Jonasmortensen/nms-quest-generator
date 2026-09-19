/**
 * Small safe wrappers around localStorage: JSON parse/stringify with a
 * try/catch and a console warning instead of throwing, so callers don't
 * need to repeat this for every piece of persisted state.
 */

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch (error) {
    console.warn(`storage: failed to read "${key}"`, error)
    return fallback
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`storage: failed to write "${key}"`, error)
  }
}
