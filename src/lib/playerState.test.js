import { describe, it, expect } from 'vitest'
import {
  schemaToFormQuestions,
  valueToLabel,
  labelToValue,
  stateToFormAnswers,
  formAnswerToValue,
} from './playerState.js'

const schema = [
  {
    id: 'hasFreighter',
    default: false,
    formQuestion: { label: 'Do you own a freighter?', options: ['Yes', 'No'] },
  },
  { id: 'currentLocation', default: 'Unknown' },
]

describe('schemaToFormQuestions', () => {
  it('includes only entries with a formQuestion', () => {
    const questions = schemaToFormQuestions(schema)
    expect(questions).toEqual([
      { id: 'hasFreighter', question: 'Do you own a freighter?', options: ['Yes', 'No'] },
    ])
  })
})

describe('valueToLabel', () => {
  const hasFreighter = schema[0]
  const currentLocation = schema[1]

  it('converts true to the Yes-like option label', () => {
    expect(valueToLabel(hasFreighter, true)).toBe('Yes')
  })

  it('converts false to the No-like option label', () => {
    expect(valueToLabel(hasFreighter, false)).toBe('No')
  })

  it('matches option casing regardless of the JSON casing used', () => {
    const shoutyEntry = {
      id: 'x',
      default: false,
      formQuestion: { label: 'X?', options: ['YES', 'NO'] },
    }
    expect(valueToLabel(shoutyEntry, true)).toBe('YES')
    expect(valueToLabel(shoutyEntry, false)).toBe('NO')
  })

  it('returns the raw value for an entry with no formQuestion', () => {
    expect(valueToLabel(currentLocation, 'Base')).toBe('Base')
  })
})

describe('labelToValue', () => {
  const hasFreighter = schema[0]

  it('converts a Yes-like label to true', () => {
    expect(labelToValue(hasFreighter, 'Yes')).toBe(true)
  })

  it('converts a No-like label to false', () => {
    expect(labelToValue(hasFreighter, 'No')).toBe(false)
  })

  it('passes non boolean entries through as-is', () => {
    const factionEntry = { id: 'faction', default: 'Gek', formQuestion: { label: 'Faction?', options: ['Gek', 'Korvax'] } }
    expect(labelToValue(factionEntry, 'Korvax')).toBe('Korvax')
  })
})

describe('stateToFormAnswers', () => {
  it('converts only the state for entries with a formQuestion', () => {
    const answers = stateToFormAnswers(schema, { hasFreighter: true, currentLocation: 'Base' })
    expect(answers).toEqual({ hasFreighter: 'Yes' })
  })

  it('round-trips through formAnswerToValue', () => {
    const state = { hasFreighter: false, currentLocation: 'Unknown' }
    const answers = stateToFormAnswers(schema, state)
    const roundTripped = formAnswerToValue(schema, 'hasFreighter', answers.hasFreighter)
    expect(roundTripped).toBe(state.hasFreighter)
  })
})

describe('formAnswerToValue', () => {
  it('looks up the entry by id and converts the label', () => {
    expect(formAnswerToValue(schema, 'hasFreighter', 'Yes')).toBe(true)
  })

  it('falls back to the raw label for an unknown id', () => {
    expect(formAnswerToValue(schema, 'unknownId', 'whatever')).toBe('whatever')
  })
})
