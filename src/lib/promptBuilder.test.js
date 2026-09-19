import { describe, it, expect } from 'vitest'
import { formatObjectivesList, buildNarrativePrompt } from './promptBuilder.js'

const quests = [
  { id: '1', text: 'Sell 20 units of Carbon at Trade Post' },
  { id: '2', text: 'Scan 3 Vortex Cube found in the wild' },
]

describe('formatObjectivesList', () => {
  it('numbers objectives in their given order', () => {
    const result = formatObjectivesList(quests)
    expect(result).toBe(
      '1. Sell 20 units of Carbon at Trade Post\n' +
        '2. Scan 3 Vortex Cube found in the wild'
    )
  })

  it('returns an empty string for an empty batch', () => {
    expect(formatObjectivesList([])).toBe('')
  })
})

describe('buildNarrativePrompt', () => {
  it('substitutes count and objectives into the template', () => {
    const template = 'There are {{count}} objectives:\n{{objectives}}\nThe end.'
    const result = buildNarrativePrompt(quests, template)
    expect(result).toContain('There are 2 objectives:')
    expect(result).toContain('1. Sell 20 units of Carbon at Trade Post')
    expect(result).toContain('2. Scan 3 Vortex Cube found in the wild')
    expect(result).toContain('The end.')
  })

  it('supports repeated placeholders', () => {
    const template = '{{count}} then {{count}} again'
    expect(buildNarrativePrompt(quests, template)).toBe('2 then 2 again')
  })
})
