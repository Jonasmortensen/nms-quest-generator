export function QuestCard({ quest, status, onComplete, onPlayFromHere }) {
  return (
    <article className={`quest-card quest-card--${status}`}>
      {status === 'completed' && (
        <button type="button" className="quest-card__replay" onClick={onPlayFromHere}>
          Play From Here
        </button>
      )}
      <p className="quest-card__objective">{quest.text}</p>
      {status === 'active' && (
        <button type="button" className="quest-card__action" onClick={onComplete}>
          Complete
        </button>
      )}
    </article>
  )
}
