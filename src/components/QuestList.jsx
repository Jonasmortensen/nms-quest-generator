import { QuestCard } from './QuestCard.jsx'

function statusFor(index, activeIndex) {
  if (index < activeIndex) return 'completed'
  if (index === activeIndex) return 'active'
  return 'upcoming'
}

export function QuestList({ quests, activeIndex, onComplete, onPlayFromHere }) {
  return (
    <div className="quest-list">
      {quests.map((quest, index) => (
        <QuestCard
          key={quest.id}
          quest={quest}
          status={statusFor(index, activeIndex)}
          onComplete={onComplete}
          onPlayFromHere={() => onPlayFromHere(index)}
        />
      ))}
    </div>
  )
}
