import { QuestList } from './components/QuestList.jsx'
import { CopyPromptButton } from './components/CopyPromptButton.jsx'
import { useQuestGenerator } from './hooks/useQuestGenerator.js'
import { buildNarrativePrompt } from './lib/promptBuilder.js'
import promptTemplate from './data/promptTemplate.json'

export default function App() {
  const { quests, regenerate } = useQuestGenerator()

  return (
    <div className="app">
      <header className="app__header">
        <h1>No Man's Sky Quest Generator</h1>
        <div className="app__actions">
          <button type="button" className="app__regenerate" onClick={regenerate}>
            Generate 5 New
          </button>
          <CopyPromptButton
            getText={() => buildNarrativePrompt(quests, promptTemplate.template)}
          />
        </div>
      </header>
      <main>
        <QuestList quests={quests} />
      </main>
    </div>
  )
}
