import { describe, it, expect, vi } from 'vitest'
import { resolveTemplate, generateQuestBatch } from './questEngine.js'

const data = {
  items: [
    { name: 'Carbon', rarity: 'common', type: 'mineral', craftable: false },
    { name: 'Gold', rarity: 'rare', type: 'mineral', craftable: false },
    { name: 'Living Glass', rarity: 'rare', type: 'product', craftable: true },
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
})

describe('generateQuestBatch', () => {
  const tasks = ['Visit [location]', 'Sell [item]']

  it('generates the requested number of quests', () => {
    const batch = generateQuestBatch(tasks, data, 5)
    expect(batch).toHaveLength(5)
    batch.forEach((quest) => {
      expect(typeof quest.text).toBe('string')
      expect(quest.text.length).toBeGreaterThan(0)
      expect(quest.id).toBeDefined()
    })
  })
})
