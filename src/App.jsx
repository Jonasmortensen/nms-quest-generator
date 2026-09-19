import { QuestList } from './components/QuestList.jsx'
import { PromptQuestionForm } from './components/PromptQuestionForm.jsx'
import { CopyPromptButton } from './components/CopyPromptButton.jsx'
import { useQuestGenerator } from './hooks/useQuestGenerator.js'
import { usePromptAnswers } from './hooks/usePromptAnswers.js'
import { buildNarrativePrompt, formatAnswers } from './lib/promptBuilder.js'
import promptTemplate from './data/promptTemplate.json'
import promptQuestions from './data/promptQuestions.json'

export default function App() {
  const { quests, regenerate } = useQuestGenerator()
  const { answers, setAnswer } = usePromptAnswers(promptQuestions)

  return (
    <div className="app">
      <header className="app__header">
        <h1>No Man's Sky Quest Generator</h1>
        <div className="app__actions">
          <button type="button" className="app__regenerate" onClick={regenerate}>
            Generate 5 New
          </button>
        </div>
      </header>
      <main>
        <QuestList quests={quests} />

        <section className="prompt-section">
          <h2>Narrate this questline</h2>
          <PromptQuestionForm
            questions={promptQuestions}
            answers={answers}
            onAnswerChange={setAnswer}
          />
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
      </main>
    </div>
  )
}
