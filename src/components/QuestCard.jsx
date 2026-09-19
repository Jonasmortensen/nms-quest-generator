export function QuestCard({ quest }) {
  return (
    <article className="quest-card">
      <p className="quest-card__objective">{quest.text}</p>
    </article>
  )
}
