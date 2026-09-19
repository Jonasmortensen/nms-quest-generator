import { useCallback, useEffect, useState } from 'react'
import { generateQuestBatch } from '../lib/questEngine.js'
import { readJSON, writeJSON } from '../lib/storage.js'
import items from '../data/items.json'
import locations from '../data/locations.json'
import tasks from '../data/tasks.json'

const data = { items, locations }
const BATCH_SIZE = 5
const STORAGE_KEY = 'nms-quest-generator:current-batch'

function isValidBatch(value) {
  return Boolean(value) && Array.isArray(value.quests) && typeof value.activeIndex === 'number'
}

function freshBatch(playerState) {
  return { quests: generateQuestBatch(tasks, data, BATCH_SIZE, playerState), activeIndex: 0 }
}

/**
 * Wraps the quest engine in a small hook: holds the current batch of
 * quests and progress through it in state, persisted to localStorage so
 * a page reload (or navigating away and back) keeps the same batch and
 * progress. Only regenerate() replaces the batch. `playerState` (see
 * src/lib/playerState.js) gates which tasks are eligible via their
 * prerequisites, and is only consulted when a new batch is generated.
 *
 * Progress is tracked as a single `activeIndex`: objectives before it
 * are completed, the one at it is active, and everything after it is
 * upcoming. Objectives are completed strictly in order, so this one
 * number is enough to derive every card's status.
 */
export function useQuestGenerator(playerState = {}) {
  const [batch, setBatch] = useState(() => {
    const persisted = readJSON(STORAGE_KEY, null)
    return isValidBatch(persisted) ? persisted : freshBatch(playerState)
  })

  useEffect(() => {
    writeJSON(STORAGE_KEY, batch)
  }, [batch])

  // Accepts an optional override so a caller that just updated player
  // state (e.g. setting currentLocation from a prompt answer) can pass
  // the up-to-date value straight through, rather than this regenerate
  // seeing the stale `playerState` still closed over from this render.
  const regenerate = useCallback(
    (overridePlayerState) => {
      setBatch(freshBatch(overridePlayerState ?? playerState))
    },
    [playerState]
  )

  const completeActive = useCallback(() => {
    setBatch((prev) => ({
      ...prev,
      activeIndex: Math.min(prev.activeIndex + 1, prev.quests.length),
    }))
  }, [])

  // TODO: rewinding does not undo player state changes made by completed
  // objectives' `effects` (see QuestGeneratorPage.handleComplete). To
  // support that, we'd need to snapshot the player state (or just the
  // prior value of each overwritten key) alongside each quest when it's
  // completed, then replay the inverse for every completed objective
  // from the end of the batch back down to `index` here.
  const playFromHere = useCallback((index) => {
    setBatch((prev) => ({ ...prev, activeIndex: index }))
  }, [])

  return {
    quests: batch.quests,
    activeIndex: batch.activeIndex,
    regenerate,
    completeActive,
    playFromHere,
  }
}
