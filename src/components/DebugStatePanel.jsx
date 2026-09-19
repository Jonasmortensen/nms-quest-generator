export function DebugStatePanel({ state }) {
  const entries = Object.entries(state)

  return (
    <div className="debug-panel">
      {entries.length === 0 ? (
        <p className="debug-panel__empty">No state to show.</p>
      ) : (
        <dl className="debug-panel__list">
          {entries.map(([key, value]) => (
            <div className="debug-panel__row" key={key}>
              <dt>{key}</dt>
              <dd>{JSON.stringify(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
