import { QuestionForm } from '../components/QuestionForm.jsx'
import { usePlayerState } from '../hooks/usePlayerState.js'
import {
  schemaToFormQuestions,
  stateToFormAnswers,
  formAnswerToValue,
  PLAYER_STATE_STORAGE_KEY,
} from '../lib/playerState.js'
import playerStateSchema from '../data/playerStateSchema.json'

export function SaveInfoPage() {
  const { state, setValue } = usePlayerState(playerStateSchema, PLAYER_STATE_STORAGE_KEY)
  const formQuestions = schemaToFormQuestions(playerStateSchema)
  const answers = stateToFormAnswers(playerStateSchema, state)

  function handleAnswerChange(id, label) {
    setValue(id, formAnswerToValue(playerStateSchema, id, label))
  }

  return (
    <section className="save-info">
      <h2 className="section-heading">Save Info</h2>
      <p className="save-info__hint">
        Saved on this device and remembered between visits.
      </p>
      <QuestionForm questions={formQuestions} answers={answers} onAnswerChange={handleAnswerChange} />
    </section>
  )
}
