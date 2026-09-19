export function PromptQuestionForm({ questions, answers, onAnswerChange }) {
  return (
    <form className="prompt-form" onSubmit={(event) => event.preventDefault()}>
      {questions.map((question) => (
        <fieldset className="prompt-form__question" key={question.id}>
          <legend>{question.question}</legend>
          <div className="prompt-form__options">
            {question.options.map((option) => (
              <label className="prompt-form__option" key={option}>
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={answers[question.id] === option}
                  onChange={() => onAnswerChange(question.id, option)}
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </form>
  )
}
