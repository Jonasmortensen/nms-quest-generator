import { describe, it, expect } from 'vitest'
import { answersToFacts } from './saveInfo.js'

const questions = [
  { id: 'hasFreighter', question: 'Do you own a freighter?', options: ['Yes', 'No'] },
  { id: 'faction', question: 'Preferred faction?', options: ['Gek', 'Korvax', 'Vy\'keen'] },
]

describe('answersToFacts', () => {
  it('converts a Yes/No answer to a boolean', () => {
    const facts = answersToFacts(questions, { hasFreighter: 'Yes', faction: 'Gek' })
    expect(facts.hasFreighter).toBe(true)
  })

  it('converts "No" to false', () => {
    const facts = answersToFacts(questions, { hasFreighter: 'No', faction: 'Gek' })
    expect(facts.hasFreighter).toBe(false)
  })

  it('passes non Yes/No answers through as-is', () => {
    const facts = answersToFacts(questions, { hasFreighter: 'Yes', faction: 'Korvax' })
    expect(facts.faction).toBe('Korvax')
  })

  it('falls back to the first option for unanswered questions', () => {
    const facts = answersToFacts(questions, {})
    expect(facts.hasFreighter).toBe(true)
    expect(facts.faction).toBe('Gek')
  })
})
