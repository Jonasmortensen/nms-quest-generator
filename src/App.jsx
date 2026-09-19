import { QuestList } from './components/QuestList.jsx'
import { useQuestGenerator } from './hooks/useQuestGenerator.js'

export default function App() {
  const { quests, regenerate } = useQuestGenerator()

  return (
    <div className="app">
      <header className="app__header">
        <h1>No Man's Sky Quest Generator</h1>
        <button type="button" className="app__regenerate" onClick={regenerate}>
          Generate 5 New
        </button>
      </header>
      <main>
        <QuestList quests={quests} />
      </main>
    </div>
  )
}
