export function QuestCard({ quest, status, onComplete, onPlayFromHere }) {
  return (
    <article className={`quest-card quest-card--${status}`}>
      <p className="quest-card__objective">{quest.text}</p>
      {status === 'active' && (
        <button type="button" className="quest-card__action" onClick={onComplete}>
          Complete
        </button>
      )}
      {status === 'completed' && (
        <button type="button" className="quest-card__action" onClick={onPlayFromHere}>
          Play From Here
        </button>
      )}
    </article>
  )
}
