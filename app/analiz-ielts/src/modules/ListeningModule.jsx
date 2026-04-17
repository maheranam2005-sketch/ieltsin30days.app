import { useState, useEffect } from 'react'

const ListeningModule = ({ module, onCompleteModule }) => {
  const [timeLeft, setTimeLeft] = useState(20 * 60) // 20 minutes in seconds
  const [userAnswers, setUserAnswers] = useState({}) // Stores index of selected option
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  // Timer Effect
  useEffect(() => {
    if (submitted || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit(true) // Auto-submit when time runs out
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [submitted, timeLeft])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleOptionChange = (questionIndex, optionIndex) => {
    if (submitted) return
    setUserAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }))
  }

  const handleSubmit = (auto = false) => {
    if (submitted) return

    let currentScore = 0
    module.questions.forEach((q, idx) => {
      const correctIndex = typeof q.answerIndex === 'number' ? q.answerIndex : Number(q.answer)
      if (userAnswers[idx] === correctIndex) {
        currentScore += 1
      }
    })

    setScore(currentScore)
    setSubmitted(true)
  }

  const getOptionLabel = (index) => String.fromCharCode(65 + index) // 0 -> A, 1 -> B...

  // Check if content exists
  const hasContent = module && module.questions && module.questions.length > 0

  if (!hasContent) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <p className="text-lg font-extrabold text-gray-900">Content coming soon</p>
          <p className="mt-1 text-sm text-gray-500">
            This listening exercise is not yet available.
          </p>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onCompleteModule}
            className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-red-600"
          >
            Mark Module Completed
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Timer */}
      <div className="sticky top-0 z-20 rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-wide text-gray-400">
              LISTENING EXERCISE
            </div>
            <div className="text-sm font-extrabold text-gray-900">Answer while you listen</div>
          </div>

          <div
            className={[
              'rounded-xl px-3 py-2 text-base font-extrabold',
              timeLeft < 60 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-700',
            ].join(' ')}
          >
            <span className="font-mono">{formatTime(timeLeft)}</span>
          </div>
        </div>

        {submitted && (
          <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
            Submitted. Review the answers below.
          </div>
        )}
      </div>

      {/* Audio Player */}
      <div className="sticky top-20 z-10 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 text-[11px] font-bold tracking-wide text-gray-400">
          AUDIO TRACK
        </div>

        {module.audioUrl ? (
          <audio controls className="w-full">
            <source src={module.audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm font-semibold text-red-600">
            Audio source missing
          </div>
        )}
      </div>

      {/* Questions Area */}
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <h4 className="text-lg font-extrabold text-gray-900">Questions</h4>
          <div className="text-xs font-semibold text-gray-500">
            {Object.keys(userAnswers).length}/{module.questions.length} answered
          </div>
        </div>

        {module.questions.map((q, qIdx) => {
          const correctIndex = typeof q.answerIndex === 'number' ? q.answerIndex : Number(q.answer)
          const isCorrect = userAnswers[qIdx] === correctIndex

          return (
            <div
              key={q.id || qIdx}
              className={[
                'rounded-2xl border p-5 shadow-sm',
                submitted
                  ? isCorrect
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-white',
              ].join(' ')}
            >
              <p className="mb-4 text-sm font-semibold text-gray-900">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-red-50 text-xs font-extrabold text-red-600">
                  {qIdx + 1}
                </span>
                {q.question}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {q.options.map((option, oIdx) => {
                  const isSelected = userAnswers[qIdx] === oIdx

                  let optionClass =
                    'border-gray-200 bg-white hover:bg-gray-50'
                  let badgeClass = 'bg-gray-100 text-gray-600'

                  if (submitted) {
                    if (oIdx === correctIndex) {
                      optionClass = 'border-green-200 bg-green-50 ring-1 ring-green-200'
                      badgeClass = 'bg-green-600 text-white'
                    } else if (isSelected && oIdx !== correctIndex) {
                      optionClass = 'border-red-200 bg-red-50 ring-1 ring-red-200'
                      badgeClass = 'bg-red-600 text-white'
                    } else {
                      optionClass = 'border-gray-200 bg-white opacity-60'
                      badgeClass = 'bg-gray-100 text-gray-500'
                    }
                  } else if (isSelected) {
                    optionClass = 'border-red-200 bg-red-50 ring-1 ring-red-200'
                    badgeClass = 'bg-red-600 text-white'
                  }

                  return (
                    <label
                      key={oIdx}
                      className={[
                        'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition',
                        optionClass,
                        submitted ? 'cursor-default' : '',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name={`question-${qIdx}`}
                        value={oIdx}
                        checked={isSelected}
                        onChange={() => handleOptionChange(qIdx, oIdx)}
                        disabled={submitted}
                        className="hidden"
                      />

                      <span
                        className={[
                          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold',
                          badgeClass,
                        ].join(' ')}
                      >
                        {getOptionLabel(oIdx)}
                      </span>

                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  )
                })}
              </div>

              {submitted && !isCorrect && (
                <p className="mt-3 text-sm text-red-700">
                  Correct Answer:{' '}
                  <span className="font-extrabold">{q.options[correctIndex]}</span>
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer Actions */}
      <div className="sticky bottom-4 rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm backdrop-blur">
        {!submitted ? (
          <button
            onClick={() => handleSubmit(false)}
            className="w-full rounded-xl bg-red-500 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-red-600"
          >
            Submit Answers
          </button>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center sm:text-left">
              <div className="text-xs font-semibold text-gray-500">Your Score</div>
              <div className="text-2xl font-extrabold text-gray-900">
                {score}
                <span className="text-gray-400"> / </span>
                {module.questions.length}
              </div>
            </div>

            <button
              onClick={onCompleteModule}
              className="rounded-xl bg-green-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-green-700"
            >
              Mark Module Completed
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ListeningModule