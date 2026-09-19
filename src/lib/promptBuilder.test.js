import { describe, it, expect } from 'vitest'
import {
  formatObjectivesList,
  formatAnswers,
  buildNarrativePrompt,
} from './promptBuilder.js'

const quests = [
  { id: '1', text: 'Sell 20 units of Carbon at Trade Post' },
  { id: '2', text: 'Scan 3 Vortex Cube found in the wild' },
]

const questions = [
  { id: 'location', question: 'Where are you?', options: ['Base', 'Planet'] },
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

  it('substitutes the context placeholder when provided', () => {
    const template = 'Context:\n{{context}}\nObjectives:\n{{objectives}}'
    const result = buildNarrativePrompt(quests, template, '- Where are you? Planet')
    expect(result).toContain('- Where are you? Planet')
  })

  it('leaves the context placeholder empty when no context is given', () => {
    const template = 'Context:\n{{context}}\nEnd'
    expect(buildNarrativePrompt(quests, template)).toBe('Context:\n\nEnd')
  })
})

describe('formatAnswers', () => {
  it('formats each answered question as a bullet line', () => {
    const result = formatAnswers(questions, { location: 'Planet' })
    expect(result).toBe('- Where are you? Planet')
  })

  it('falls back to the first option when a question is unanswered', () => {
    const result = formatAnswers(questions, {})
    expect(result).toBe('- Where are you? Base')
  })
})
