import { useCallback, useState } from 'react'

function defaultAnswers(questions) {
  return questions.reduce((acc, question) => {
    acc[question.id] = question.options[0]
    return acc
  }, {})
}

/**
 * Holds the current answer to each pooled setup question (see
 * src/data/promptQuestions.json), defaulting every question to its
 * first option so the prompt always has a value to work with.
 */
export function usePromptAnswers(questions) {
  const [answers, setAnswers] = useState(() => defaultAnswers(questions))

  const setAnswer = useCallback((questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }, [])

  return { answers, setAnswer }
}
