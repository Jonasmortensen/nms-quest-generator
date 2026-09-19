import { QuestionForm } from '../components/QuestionForm.jsx'
import { usePersistedAnswers } from '../hooks/usePersistedAnswers.js'
import { SAVE_INFO_STORAGE_KEY } from '../lib/saveInfo.js'
import saveInfoQuestions from '../data/saveInfoQuestions.json'

export function SaveInfoPage() {
  const { answers, setAnswer } = usePersistedAnswers(saveInfoQuestions, SAVE_INFO_STORAGE_KEY)

  return (
    <section className="save-info">
      <h2 className="section-heading">Save Info</h2>
      <p className="save-info__hint">
        Saved on this device and remembered between visits.
      </p>
      <QuestionForm
        questions={saveInfoQuestions}
        answers={answers}
        onAnswerChange={setAnswer}
      />
    </section>
  )
}
