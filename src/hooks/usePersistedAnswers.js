import { useCallback, useEffect, useState } from 'react'

function defaultAnswers(questions) {
  return questions.reduce((acc, question) => {
    acc[question.id] = question.options[0]
    return acc
  }, {})
}

function loadAnswers(storageKey, questions) {
  const defaults = defaultAnswers(questions)
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return defaults
    return { ...defaults, ...JSON.parse(raw) }
  } catch (error) {
    console.warn(`usePersistedAnswers: failed to read "${storageKey}" from storage`, error)
    return defaults
  }
}

/**
 * Like usePromptAnswers, but persists answers to localStorage under
 * `storageKey` so they survive reloads and future visits, not just the
 * current session.
 */
export function usePersistedAnswers(questions, storageKey) {
  const [answers, setAnswers] = useState(() => loadAnswers(storageKey, questions))

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(answers))
    } catch (error) {
      console.warn(`usePersistedAnswers: failed to save "${storageKey}" to storage`, error)
    }
  }, [answers, storageKey])

  const setAnswer = useCallback((questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }, [])

  return { answers, setAnswer }
}
