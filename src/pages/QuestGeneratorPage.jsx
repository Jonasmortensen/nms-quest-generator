import { useState } from 'react'
import { QuestList } from '../components/QuestList.jsx'
import { QuestionForm } from '../components/QuestionForm.jsx'
import { CopyPromptButton } from '../components/CopyPromptButton.jsx'
import { DebugStatePanel } from '../components/DebugStatePanel.jsx'
import { useQuestGenerator } from '../hooks/useQuestGenerator.js'
import { usePromptAnswers } from '../hooks/usePromptAnswers.js'
import { usePlayerState } from '../hooks/usePlayerState.js'
import { buildNarrativePrompt, formatAnswers } from '../lib/promptBuilder.js'
import { PLAYER_STATE_STORAGE_KEY } from '../lib/playerState.js'
import promptTemplate from '../data/promptTemplate.json'
import promptQuestions from '../data/promptQuestions.json'
import playerStateSchema from '../data/playerStateSchema.json'

export function QuestGeneratorPage() {
  const { state: playerState, setValue: setPlayerStateValue } = usePlayerState(
    playerStateSchema,
    PLAYER_STATE_STORAGE_KEY
  )
  const { quests, activeIndex, regenerate, completeActive, playFromHere } = useQuestGenerator(playerState)
  const { answers, setAnswer } = usePromptAnswers(promptQuestions)
  const [showDebug, setShowDebug] = useState(false)

  function handleComplete() {
    const activeQuest = quests[activeIndex]
    if (activeQuest) {
      Object.entries(activeQuest.effects).forEach(([id, value]) => {
        setPlayerStateValue(id, value)
      })
    }
    completeActive()
  }

  function handleRegenerate() {
    // The "Where are you?" prompt answer doubles as where the player is
    // starting this new questline from, so a fresh batch's objectives
    // are generated with player state reflecting that. Pass the updated
    // state straight to regenerate rather than relying on this render's
    // (still stale) `playerState`, since setPlayerStateValue's update
    // won't be visible here until the next render.
    const updatedPlayerState = { ...playerState, currentLocation: answers.location }
    setPlayerStateValue('currentLocation', answers.location)
    regenerate(updatedPlayerState)
  }

  return (
    <>
      <div className="debug-toggle-row">
        <button
          type="button"
          className="debug-toggle"
          onClick={() => setShowDebug((prev) => !prev)}
        >
          {showDebug ? 'Hide Debug State' : 'Show Debug State'}
        </button>
      </div>

      {showDebug && <DebugStatePanel state={playerState} />}

      <div className="app__actions">
        <button type="button" className="app__regenerate" onClick={handleRegenerate}>
          Generate 5 New
        </button>
      </div>

      <QuestList
        quests={quests}
        activeIndex={activeIndex}
        onComplete={handleComplete}
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
