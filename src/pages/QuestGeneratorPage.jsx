import { QuestList } from '../components/QuestList.jsx'
import { QuestionForm } from '../components/QuestionForm.jsx'
import { CopyPromptButton } from '../components/CopyPromptButton.jsx'
import { useQuestGenerator } from '../hooks/useQuestGenerator.js'
import { usePromptAnswers } from '../hooks/usePromptAnswers.js'
import { usePersistedAnswers } from '../hooks/usePersistedAnswers.js'
import { buildNarrativePrompt, formatAnswers } from '../lib/promptBuilder.js'
import { answersToFacts, SAVE_INFO_STORAGE_KEY } from '../lib/saveInfo.js'
import promptTemplate from '../data/promptTemplate.json'
import promptQuestions from '../data/promptQuestions.json'
import saveInfoQuestions from '../data/saveInfoQuestions.json'

export function QuestGeneratorPage() {
  const { answers: saveInfoAnswers } = usePersistedAnswers(saveInfoQuestions, SAVE_INFO_STORAGE_KEY)
  const facts = answersToFacts(saveInfoQuestions, saveInfoAnswers)
  const { quests, activeIndex, regenerate, completeActive, playFromHere } = useQuestGenerator(facts)
  const { answers, setAnswer } = usePromptAnswers(promptQuestions)

  return (
    <>
      <div className="app__actions">
        <button type="button" className="app__regenerate" onClick={regenerate}>
          Generate 5 New
        </button>
      </div>

      <QuestList
        quests={quests}
        activeIndex={activeIndex}
        onComplete={completeActive}
        onPlayFromHere={playFromHere}
      />

      <section className="prompt-section">
        <h2 className="section-heading">Narrate this questline</h2>
        <QuestionForm questions={promptQuestions} answers={answers} onAnswerChange={setAnswer} />
        <CopyPromptButton
          getText={() =>
            buildNarrativePrompt(
              quests,
              promptTemplate.template,
              formatAnswers(promptQuestions, answers)
            )
          }
        />
      </section>
    </>
  )
}
