import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthProvider'

const WritingModule = ({ module, dayNumber, onCompleteModule }) => {
  const { user } = useAuth()
  const [essayText, setEssayText] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState((module.timeMinutes || 20) * 60)
  const [saving, setSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [evaluating, setEvaluating] = useState(false)
  const [evaluationResult, setEvaluationResult] = useState(null)

  const minWords = module.minWords || 150

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleTextChange = (e) => {
    const text = e.target.value
    setEssayText(text)
    setWordCount(text.trim().split(/\s+/).filter(Boolean).length)
    setIsSaved(false)
    setSaveSuccess(false)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSaveDraft = async () => {
    if (!user) return
    setSaving(true)
    setError(null)
    setSaveSuccess(false)

    try {
      const { error: upsertError } = await supabase
        .from('writing_attempts')
        .upsert(
          {
            user_id: user.id,
            day_number: dayNumber,
            module_key: module.key,
            prompt: module.prompt || module.content || module.title,
            essay_text: essayText,
            word_count: wordCount,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id, module_key' }
        )

      if (upsertError) throw upsertError

      setIsSaved(true)
      setSaveSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  const handleEvaluate = async () => {
    if (!user || !essayText.trim()) return
    setEvaluating(true)
    setError(null)
    setEvaluationResult(null)

    try {
      const { data, error: invokeError } =
        await supabase.functions.invoke('evaluate-writing', {
          body: { essay_text: essayText },
        })

      if (invokeError) throw invokeError

      setEvaluationResult(data)

      await supabase.from('writing_evaluations').insert({
        user_id: user.id,
        day_number: dayNumber,
        module_key: module.key,
        essay_text: essayText,
        band_score: data.band_score,
        feedback_summary_bn: data.feedback_summary_bn,
        grammar_errors: data.grammar_errors,
        improved_version: data.improved_version,
      })
    } catch (err) {
      setError(err.message || 'Failed to evaluate essay')
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between">
          <div className="space-y-3">
            <div className="text-[11px] font-bold tracking-wide text-gray-400">
              WRITING TASK
            </div>

            <h2 className="text-lg font-extrabold text-gray-900">
              {module.title}
            </h2>

            <div className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
              {module.prompt || module.content}
            </div>

            {module.task && (
              <div className="text-xs italic text-gray-500">
                {module.task}
              </div>
            )}
          </div>

          <div>
            <div
              className={[
                'rounded-xl px-4 py-2 text-lg font-mono font-extrabold shadow-sm',
                timeLeft < 300
                  ? 'bg-red-50 text-red-600'
                  : 'bg-gray-100 text-gray-700',
              ].join(' ')}
            >
              ⏱ {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm focus-within:ring-1 focus-within:ring-red-200">
        <textarea
          value={essayText}
          onChange={handleTextChange}
          placeholder="Start typing your essay here..."
          className="min-h-[420px] w-full resize-y rounded-t-2xl p-6 text-base leading-relaxed text-gray-800 placeholder-gray-400 focus:outline-none"
          spellCheck="false"
        />

        {/* Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 bg-gray-50 px-6 py-4 text-sm">
          <div className="flex items-center gap-4">
            <div
              className={[
                'font-bold',
                wordCount < minWords
                  ? 'text-amber-500'
                  : 'text-green-600',
              ].join(' ')}
            >
              {wordCount} words
            </div>
            <div className="text-gray-500">
              Target: {minWords}+
            </div>
          </div>

          <div className="flex items-center gap-3">
            {error && (
              <span className="text-red-600 font-semibold">
                {error}
              </span>
            )}
            {saveSuccess && (
              <span className="text-green-600 font-bold">
                Saved ✅
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-end gap-3">

        <button
          onClick={handleEvaluate}
          disabled={evaluating || !essayText.trim()}
          className={[
            'rounded-xl px-6 py-3 text-sm font-extrabold transition',
            evaluating
              ? 'bg-purple-200 text-purple-700 animate-pulse'
              : 'bg-purple-600 text-white hover:bg-purple-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          {evaluating ? 'Evaluating...' : '✨ Evaluate with AI'}
        </button>

        <button
          onClick={handleSaveDraft}
          disabled={saving}
          className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-extrabold text-white hover:bg-black disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>

        <button
          onClick={onCompleteModule}
          disabled={!isSaved || saving}
          className={[
            'rounded-xl px-8 py-3 text-sm font-extrabold transition',
            !isSaved
              ? 'cursor-not-allowed bg-gray-200 text-gray-400'
              : 'bg-green-600 text-white hover:bg-green-700',
          ].join(' ')}
          title={!isSaved ? 'Please save your draft first' : ''}
        >
          Mark Module Completed
        </button>
      </div>

      {/* Evaluation Result */}
      {evaluationResult && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-purple-700">
              AI Evaluation Result
            </h3>

            <div className="rounded-xl bg-white px-4 py-2 shadow-sm">
              <span className="text-xs text-gray-500">
                Band Score
              </span>
              <div className="text-2xl font-extrabold text-gray-900">
                {evaluationResult.band_score}
              </div>
            </div>
          </div>

          <div className="space-y-6 text-sm text-gray-700">

            <div>
              <h4 className="mb-2 font-bold text-gray-900">
                Feedback (Bangla)
              </h4>
              <p>{evaluationResult.feedback_summary_bn}</p>
            </div>

            {evaluationResult.grammar_errors &&
              evaluationResult.grammar_errors.length > 0 && (
                <div>
                  <h4 className="mb-2 font-bold text-red-600">
                    Grammar & Errors
                  </h4>
                  <ul className="list-disc space-y-1 pl-5">
                    {evaluationResult.grammar_errors.map((err, idx) => (
                      <li key={idx}>
                        <span className="text-red-600">
                          {err.error}
                        </span>{' '}
                        →{' '}
                        <span className="text-green-600">
                          {err.correction}
                        </span>{' '}
                        ({err.explanation})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {evaluationResult.improved_version && (
              <div>
                <h4 className="mb-2 font-bold text-green-600">
                  Improved Version
                </h4>
                <div className="rounded-xl border border-gray-200 bg-white p-4 italic">
                  {evaluationResult.improved_version}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

export default WritingModule