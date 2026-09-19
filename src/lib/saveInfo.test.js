import { describe, it, expect } from 'vitest'
import { answersToFacts, valueToAnswer, factsToAnswers, applyEffects } from './saveInfo.js'

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

describe('valueToAnswer', () => {
  const hasFreighter = questions[0]
  const faction = questions[1]

  it('converts true to the Yes-like option label', () => {
    expect(valueToAnswer(hasFreighter, true)).toBe('Yes')
  })

  it('converts false to the No-like option label', () => {
    expect(valueToAnswer(hasFreighter, false)).toBe('No')
  })

  it('matches option casing regardless of the JSON casing used', () => {
    const shoutyQuestion = { id: 'x', question: 'X?', options: ['YES', 'NO'] }
    expect(valueToAnswer(shoutyQuestion, true)).toBe('YES')
    expect(valueToAnswer(shoutyQuestion, false)).toBe('NO')
  })

  it('passes non Yes/No values through as-is', () => {
    expect(valueToAnswer(faction, 'Korvax')).toBe('Korvax')
  })
})

describe('factsToAnswers', () => {
  it('converts only the facts present, keyed by question id', () => {
    const answers = factsToAnswers(questions, { hasFreighter: true })
    expect(answers).toEqual({ hasFreighter: 'Yes' })
  })

  it('ignores facts that do not match a known question', () => {
    const answers = factsToAnswers(questions, { unknownFact: true })
    expect(answers).toEqual({})
  })

  it('round-trips through answersToFacts', () => {
    const originalAnswers = { hasFreighter: 'No', faction: 'Vy\'keen' }
    const facts = answersToFacts(questions, originalAnswers)
    const roundTripped = factsToAnswers(questions, facts)
    expect(roundTripped).toEqual(originalAnswers)
  })
})

describe('applyEffects', () => {
  it('merges effects onto existing facts, effects winning', () => {
    const facts = { hasFreighter: false, faction: 'Gek' }
    const result = applyEffects(facts, { hasFreighter: true })
    expect(result).toEqual({ hasFreighter: true, faction: 'Gek' })
  })

  it('leaves facts unchanged when effects is empty', () => {
    const facts = { hasFreighter: false }
    expect(applyEffects(facts, {})).toEqual(facts)
  })
})
