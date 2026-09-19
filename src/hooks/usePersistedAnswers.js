import { useCallback, useEffect, useState } from 'react'
import { readJSON, writeJSON } from '../lib/storage.js'

function defaultAnswers(questions) {
  return questions.reduce((acc, question) => {
    acc[question.id] = question.options[0]
    return acc
  }, {})
}

/**
 * Like usePromptAnswers, but persists answers to localStorage under
 * `storageKey` so they survive reloads and future visits, not just the
 * current session.
 */
export function usePersistedAnswers(questions, storageKey) {
  const [answers, setAnswers] = useState(() => ({
    ...defaultAnswers(questions),
    ...readJSON(storageKey, {}),
  }))

  useEffect(() => {
    writeJSON(storageKey, answers)
  }, [answers, storageKey])

  const setAnswer = useCallback((questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }, [])

  return { answers, setAnswer }
}
