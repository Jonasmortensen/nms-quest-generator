import { describe, it, expect, vi } from 'vitest'
import { resolveTemplate, generateQuestBatch, prerequisitesMet } from './questEngine.js'

const data = {
  items: [
    { name: 'Carbon', rarity: 'common', type: 'mineral', tags: [] },
    { name: 'Gold', rarity: 'rare', type: 'mineral', tags: [] },
    { name: 'Living Glass', rarity: 'rare', type: 'product', tags: ['craftable'] },
  ],
  locations: [
    { name: 'Trade Post', allowsTrade: true, hasNpcPilots: false },
    { name: 'Ruins', allowsTrade: false, hasNpcPilots: false },
  ],
}

describe('resolveTemplate', () => {
  it('resolves an unfiltered item placeholder to a known name', () => {
    const result = resolveTemplate('Sell [item]', data)
    expect(['Sell Carbon', 'Sell Gold', 'Sell Living Glass']).toContain(result)
  })

  it('applies field filters case insensitively', () => {
    const result = resolveTemplate('Sell [item?TYPE=mineral&Rarity=rare]', data)
    expect(result).toBe('Sell Gold')
  })

  it('applies boolean filters', () => {
    const result = resolveTemplate('Visit [location?allowsTrade=true]', data)
    expect(result).toBe('Visit Trade Post')
  })

  it('matches an array-valued field by membership (tags)', () => {
    const result = resolveTemplate('Craft [item?tags=craftable]', data)
    expect(result).toBe('Craft Living Glass')
  })

  it('does not match a tag the row does not have', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = resolveTemplate('Craft [item?tags=legendary]', data)
    expect(result).toBe('Craft {no matching item found}')
    warnSpy.mockRestore()
  })

  it('resolves numeric ranges within bounds', () => {
    const result = resolveTemplate('Collect [10-10] units', data)
    expect(result).toBe('Collect 10 units')
  })

  it('falls back and warns when no row matches', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = resolveTemplate('Sell [item?type=technology]', data)
    expect(result).toBe('Sell {no matching item found}')
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('resolves repeated placeholders independently', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0) // first [item] -> Carbon
      .mockReturnValueOnce(0.99) // second [item] -> Living Glass
    const result = resolveTemplate('[item] and [item]', data)
    expect(result).toBe('Carbon and Living Glass')
    vi.restoreAllMocks()
  })

  it('records resolved placeholders when given a record option', () => {
    const resolutions = {}
    resolveTemplate('Go to [location]', data, { record: resolutions })
    expect(['Trade Post', 'Ruins']).toContain(resolutions['[location]'])
  })

  it('reuses a recorded resolution via the cache option instead of resolving fresh', () => {
    const resolutions = { '[location]': 'Trade Post' }
    const result = resolveTemplate('Head to [location]', data, { cache: resolutions })
    expect(result).toBe('Head to Trade Post')
  })

  it('still resolves repeated placeholders independently within one call even with a cache', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0) // first [item] -> Carbon
      .mockReturnValueOnce(0.99) // second [item] -> Living Glass
    const resolutions = {}
    const result = resolveTemplate('[item] and [item]', data, { cache: resolutions, record: resolutions })
    expect(result).toBe('Carbon and Living Glass')
    vi.restoreAllMocks()
  })
})

describe('prerequisitesMet', () => {
  it('is true for missing or empty prerequisites', () => {
    expect(prerequisitesMet(undefined, {})).toBe(true)
    expect(prerequisitesMet({}, { hasFreighter: false })).toBe(true)
  })

  it('is true only when every fact matches', () => {
    expect(prerequisitesMet({ hasFreighter: true }, { hasFreighter: true })).toBe(true)
    expect(prerequisitesMet({ hasFreighter: true }, { hasFreighter: false })).toBe(false)
    expect(prerequisitesMet({ hasFreighter: true }, {})).toBe(false)
  })

  it('requires all keys to match when there are several', () => {
    const prerequisites = { hasFreighter: true, hasShip: true }
    expect(prerequisitesMet(prerequisites, { hasFreighter: true, hasShip: true })).toBe(true)
    expect(prerequisitesMet(prerequisites, { hasFreighter: true, hasShip: false })).toBe(false)
  })

  it('checks a property on the row identified by a fact, for a dotted key', () => {
    const prerequisites = { 'currentLocation.allowsTrade': true }
    expect(prerequisitesMet(prerequisites, { currentLocation: 'Trade Post' }, data)).toBe(true)
    expect(prerequisitesMet(prerequisites, { currentLocation: 'Ruins' }, data)).toBe(false)
  })

  it('matches the location name case insensitively for a dotted key', () => {
    const prerequisites = { 'currentLocation.allowsTrade': true }
    expect(prerequisitesMet(prerequisites, { currentLocation: 'trade post' }, data)).toBe(true)
  })

  it('is false for a dotted key when the fact is unset, unknown, or data is missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const prerequisites = { 'currentLocation.allowsTrade': true }
    expect(prerequisitesMet(prerequisites, {}, data)).toBe(false)
    expect(prerequisitesMet(prerequisites, { currentLocation: 'Unknown' }, data)).toBe(false)
    expect(prerequisitesMet(prerequisites, { currentLocation: 'Trade Post' })).toBe(false)
    warnSpy.mockRestore()
  })

  it('warns and is false for a dotted key whose table does not exist', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = prerequisitesMet({ 'currentWidget.enabled': true }, { currentWidget: 'gizmo' }, data)
    expect(result).toBe(false)
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

describe('generateQuestBatch', () => {
  const tasks = [
    { task: 'Visit [location]', prerequisites: {} },
    { task: 'Sell [item]', prerequisites: {} },
  ]

  it('generates the requested number of quests', () => {
    const batch = generateQuestBatch(tasks, data, 5)
    expect(batch).toHaveLength(5)
    batch.forEach((quest) => {
      expect(typeof quest.text).toBe('string')
      expect(quest.text.length).toBeGreaterThan(0)
      expect(quest.id).toBeDefined()
      expect(quest.effects).toEqual({})
    })
  })

  it('carries a task\'s effects through onto each resolved quest', () => {
    const tasksWithEffects = [
      { task: 'Requisition a freighter', prerequisites: {}, effects: { hasFreighter: true } },
    ]
    const batch = generateQuestBatch(tasksWithEffects, data, 3)
    batch.forEach((quest) => {
      expect(quest.effects).toEqual({ hasFreighter: true })
    })
  })

  it('defaults effects to an empty object when a task has none', () => {
    const tasksWithoutEffects = [{ task: 'Visit [location]', prerequisites: {} }]
    const batch = generateQuestBatch(tasksWithoutEffects, data, 1)
    expect(batch[0].effects).toEqual({})
  })

  it('only picks tasks whose prerequisites match the given facts', () => {
    const gatedTasks = [
      { task: 'Visit [location]', prerequisites: {} },
      { task: 'Sell [item]', prerequisites: { hasFreighter: true } },
    ]
    const batch = generateQuestBatch(gatedTasks, data, 10, { hasFreighter: false })
    batch.forEach((quest) => {
      expect(quest.text.startsWith('Visit')).toBe(true)
    })
  })

  it('returns an empty batch and warns when no tasks are eligible', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const gatedTasks = [{ task: 'Sell [item]', prerequisites: { hasFreighter: true } }]
    const batch = generateQuestBatch(gatedTasks, data, 5, { hasFreighter: false })
    expect(batch).toEqual([])
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('resolves an effect placeholder to the same value used in the task text', () => {
    const tasksWithLocationEffect = [
      { task: 'Go to [location]', prerequisites: {}, effects: { currentLocation: '[location]' } },
    ]
    const batch = generateQuestBatch(tasksWithLocationEffect, data, 10)
    batch.forEach((quest) => {
      const resolvedLocation = quest.text.replace('Go to ', '')
      expect(quest.effects.currentLocation).toBe(resolvedLocation)
    })
  })

  it('leaves non-placeholder effect strings untouched', () => {
    const tasksWithLiteralEffect = [
      { task: 'Go to your freighter', prerequisites: {}, effects: { currentLocation: 'freighter' } },
    ]
    const batch = generateQuestBatch(tasksWithLiteralEffect, data, 1)
    expect(batch[0].effects.currentLocation).toBe('freighter')
  })

  it("reflects an earlier objective's effects in a later objective's eligibility within the same batch", () => {
    // Task A is only eligible before it's ever been picked, and its own
    // effect disqualifies it from being picked again; task B is only
    // eligible after task A's effect has fired. The only way this exact
    // two-step sequence can come out is if step 2's eligibility check
    // sees step 1's effect, not the facts the batch started with.
    const sequentialTasks = [
      {
        task: 'Requisition a starter freighter',
        prerequisites: { hasFreighter: false },
        effects: { hasFreighter: true },
      },
      {
        task: 'Fly to your freighter',
        prerequisites: { hasFreighter: true },
        effects: {},
      },
    ]
    const batch = generateQuestBatch(sequentialTasks, data, 2, { hasFreighter: false })
    expect(batch).toHaveLength(2)
    expect(batch[0].text).toBe('Requisition a starter freighter')
    expect(batch[1].text).toBe('Fly to your freighter')
  })

  it('lets a location-changing effect gate which objective can come next', () => {
    const locationTasks = [
      {
        task: 'Travel to the mining outpost',
        prerequisites: { currentLocation: 'base' },
        effects: { currentLocation: 'mining_outpost' },
      },
      {
        task: 'Mine ore at the outpost',
        prerequisites: { currentLocation: 'mining_outpost' },
        effects: {},
      },
    ]
    const batch = generateQuestBatch(locationTasks, data, 2, { currentLocation: 'base' })
    expect(batch).toHaveLength(2)
    expect(batch[0].text).toBe('Travel to the mining outpost')
    expect(batch[1].text).toBe('Mine ore at the outpost')
  })

  it('gates a task on a property of the current location, not just an exact location match', () => {
    const tradeGatedTasks = [
      {
        task: 'Negotiate a bulk discount',
        prerequisites: { 'currentLocation.allowsTrade': true },
        effects: {},
      },
    ]
    const tradingBatch = generateQuestBatch(tradeGatedTasks, data, 3, { currentLocation: 'Trade Post' })
    expect(tradingBatch).toHaveLength(3)

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const noTradeBatch = generateQuestBatch(tradeGatedTasks, data, 3, { currentLocation: 'Ruins' })
    expect(noTradeBatch).toEqual([])
    warnSpy.mockRestore()
  })

  it('prefers a task that has the preceding effect as a prerequisite over other eligible tasks', () => {
    const tasksWithChoice = [
      { task: 'Buy a settlement chart', prerequisites: {}, effects: { hasSettlementChart: true } },
      { task: 'Use the settlement chart', prerequisites: { hasSettlementChart: true }, effects: {} },
      { task: 'Do something unrelated', prerequisites: {}, effects: {} },
    ]
    // Step 1 has two equally-eligible, effect-free tasks to choose
    // between ("Buy a settlement chart" and "Do something unrelated");
    // force that pick so the test is deterministic. Step 2 needs no
    // mocking: once "Buy a settlement chart"'s effect has fired, only
    // "Use the settlement chart" has a prerequisite referencing it, so
    // preference narrows the pool to just that one task regardless of
    // the random value drawn.
    vi.spyOn(Math, 'random').mockReturnValueOnce(0)
    const batch = generateQuestBatch(tasksWithChoice, data, 2)
    expect(batch[0].text).toBe('Buy a settlement chart')
    expect(batch[1].text).toBe('Use the settlement chart')
    vi.restoreAllMocks()
  })

  it('prefers a task with a dotted prerequisite that is about the fact an effect just set', () => {
    // A single location keeps "[location]" deterministic once step 1's
    // task-pick is forced, so the whole sequence needs no further mocking.
    const singleLocationData = {
      items: [],
      locations: [{ name: 'space_station', allowsTrade: true, hasNpcPilots: true }],
    }
    const tasksWithDottedFollowUp = [
      { task: 'Go to [location]', prerequisites: {}, effects: { currentLocation: '[location]' } },
      { task: 'Negotiate a bulk discount', prerequisites: { 'currentLocation.allowsTrade': true }, effects: {} },
      { task: 'Do something unrelated', prerequisites: {}, effects: {} },
    ]
    vi.spyOn(Math, 'random').mockReturnValueOnce(0) // step 1: pick "Go to [location]" over "Do something unrelated"
    const batch = generateQuestBatch(tasksWithDottedFollowUp, singleLocationData, 2)
    expect(batch[0].text).toBe('Go to space_station')
    // "Negotiate a bulk discount"'s prerequisite is the dotted key
    // "currentLocation.allowsTrade", not a plain "currentLocation" key —
    // it should still be recognized as being about the `currentLocation`
    // fact that step 1's effect just set, and preferred over "Do
    // something unrelated" (also eligible, but unrelated).
    expect(batch[1].text).toBe('Negotiate a bulk discount')
    vi.restoreAllMocks()
  })

  it('falls back to the full eligible pool when no task prefers the preceding effect', () => {
    const tasksWithNoFollowUp = [
      { task: 'Requisition a freighter', prerequisites: {}, effects: { hasFreighter: true } },
      { task: 'Scan a curiosity', prerequisites: {}, effects: {} },
    ]
    const batch = generateQuestBatch(tasksWithNoFollowUp, data, 5)
    expect(batch).toHaveLength(5)
    batch.forEach((quest) => {
      expect(['Requisition a freighter', 'Scan a curiosity']).toContain(quest.text)
    })
  })

  it('stops early and returns a partial batch when a later step has no eligible tasks', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const deadEndTasks = [
      { task: 'Go somewhere unrepeatable', prerequisites: { visited: false }, effects: { visited: true } },
    ]
    const batch = generateQuestBatch(deadEndTasks, data, 5, { visited: false })
    expect(batch).toHaveLength(1)
    expect(batch[0].text).toBe('Go somewhere unrepeatable')
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})
