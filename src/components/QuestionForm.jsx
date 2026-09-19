export function QuestionForm({ questions, answers, onAnswerChange }) {
  return (
    <form className="question-form" onSubmit={(event) => event.preventDefault()}>
      {questions.map((question) => (
        <fieldset className="question-form__question" key={question.id}>
          <legend>{question.question}</legend>
          <div className="question-form__options">
            {question.options.map((option) => (
              <label className="question-form__option" key={option}>
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
