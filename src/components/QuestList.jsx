import { QuestCard } from './QuestCard.jsx'

export function QuestList({ quests }) {
  return (
    <div className="quest-list">
      {quests.map((quest) => (
        <QuestCard key={quest.id} quest={quest} />
      ))}
    </div>
  )
}
