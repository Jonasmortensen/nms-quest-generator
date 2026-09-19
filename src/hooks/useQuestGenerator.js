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
 * `facts` (see src/lib/saveInfo.js) gates which tasks are eligible via
 * their prerequisites.
 *
 * Also tracks progress through the batch as a single `activeIndex`:
 * objectives before it are completed, the one at it is active, and
 * everything after it is upcoming. Objectives are completed strictly
 * in order, so this one number is enough to derive every card's status.
 */
export function useQuestGenerator(facts = {}) {
  const [quests, setQuests] = useState(() => generateQuestBatch(tasks, data, BATCH_SIZE, facts))
  const [activeIndex, setActiveIndex] = useState(0)

  const regenerate = useCallback(() => {
    setQuests(generateQuestBatch(tasks, data, BATCH_SIZE, facts))
    setActiveIndex(0)
  }, [facts])

  const completeActive = useCallback(() => {
    setActiveIndex((index) => Math.min(index + 1, quests.length))
  }, [quests.length])

  const playFromHere = useCallback((index) => {
    setActiveIndex(index)
  }, [])

  return { quests, activeIndex, regenerate, completeActive, playFromHere }
}
