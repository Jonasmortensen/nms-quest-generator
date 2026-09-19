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
})
