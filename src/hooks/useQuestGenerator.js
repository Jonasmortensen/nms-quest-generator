import { useCallback, useState } from 'react'
import { generateQuestBatch } from '../lib/questEngine.js'
import items from '../data/items.json'
import locations from '../data/locations.json'
import tasks from '../data/tasks.json'

const data = { items, locations }
const BATCH_SIZE = 5

/**
 * Wraps the quest engine in a small hook: holds the current batch of
 * quests in state and exposes a regenerate() function to refresh it.
 */
export function useQuestGenerator() {
  const [quests, setQuests] = useState(() => generateQuestBatch(tasks, data, BATCH_SIZE))

  const regenerate = useCallback(() => {
    setQuests(generateQuestBatch(tasks, data, BATCH_SIZE))
  }, [])

  return { quests, regenerate }
}
