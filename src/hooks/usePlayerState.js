import { useCallback, useEffect, useState } from 'react'
import { readJSON, writeJSON } from '../lib/storage.js'

function defaultState(schema) {
  return schema.reduce((state, entry) => {
    state[entry.id] = entry.default
    return state
  }, {})
}

/**
 * Persists the player's typed state (see src/lib/playerState.js) to
 * localStorage under `storageKey`, so it survives reloads and future
 * visits. Values are stored already-typed (booleans, strings, ...) —
 * this hook has no notion of the labelled form representation; that
 * translation happens at the UI boundary, not here.
 */
export function usePlayerState(schema, storageKey) {
  const [state, setState] = useState(() => ({
    ...defaultState(schema),
    ...readJSON(storageKey, {}),
  }))

  useEffect(() => {
    writeJSON(storageKey, state)
  }, [state, storageKey])

  const setValue = useCallback((id, value) => {
    setState((prev) => ({ ...prev, [id]: value }))
  }, [])

  return { state, setValue }
}
