import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthProvider'

const SpeakingModule = ({ module, dayNumber, onCompleteModule }) => {
  const { user } = useAuth()
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isSupported, setIsSupported] = useState(true)

  const [evaluating, setEvaluating] = useState(false)
  const [evaluationResult, setEvaluationResult] = useState(null)

  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' '
          }
        }
        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript)
        }
      }

      recognition.onerror = (event) => {
        setIsListening(false)
        if (event.error === 'not-allowed') {
          setError(
            'Microphone access denied. Please enable permission or type your answer.'
          )
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    } else {
      setIsSupported(false)
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const handleSpeakQuestion = () => {
    const utterance = new SpeechSynthesisUtterance(
      module.question || module.title
    )
    utterance.lang = 'en-US'
    window.speechSynthesis.speak(utterance)
  }

  const toggleRecording = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
    } else {
      setError(null)
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const handleManualInput = (e) => {
    setTranscript(e.target.value)
    setIsSaved(false)
    setSaveSuccess(false)
  }

  const handleSaveAttempt = async () => {
    if (!user || !transcript.trim()) return
    setSaving(true)
    setError(null)
    setSaveSuccess(false)

    try {
      const { error: insertError } = await supabase
        .from('speaking_attempts')
        .insert({
          user_id: user.id,
          day_number: dayNumber,
          module_key: module.key,
          question: module.question || module.title,
          transcript: transcript.trim(),
        })

      if (insertError) throw insertError

      setIsSaved(true)
      setSaveSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to save attempt')
    } finally {
      setSaving(false)
    }
  }

  const handleEvaluate = async () => {
    if (!user || !transcript.trim()) return
    setEvaluating(true)
    setError(null)
    setEvaluationResult(null)

    try {
      const { data, error: invokeError } =
        await supabase.functions.invoke('evaluate-speaking', {
          body: {
            transcript,
            question: module.question || module.title,
          },
        })

      if (invokeError) throw invokeError

      setEvaluationResult(data)

      await supabase.from('speaking_evaluations').insert({
        user_id: user.id,
        day_number: dayNumber,
        module_key: module.key,
        band_score: data.band_score,
        fluency_score: data.fluency_score,
        vocab_score: data.vocab_score,
        feedback_summary_bn: data.feedback_summary_bn,
        improved_answer: data.improved_answer,
      })
    } catch (err) {
      setError(err.message || 'Failed to evaluate speaking attempt')
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Question Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:justify-between">
          <div className="space-y-3">
            <div className="text-[11px] font-bold tracking-wide text-gray-400">
              SPEAKING TASK
            </div>

            <h2 className="text-lg font-extrabold text-gray-900">
              {module.title}
            </h2>

            <div className="text-xl font-semibold leading-relaxed text-gray-700">
              {module.question}
            </div>
          </div>

          <button
            onClick={handleSpeakQuestion}
            className="h-fit rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200"
          >
            🔊 Check Pronunciation
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">

        <div className="flex flex-wrap items-center gap-4">

          {isSupported ? (
            <button
              onClick={toggleRecording}
              className={[
                'rounded-xl px-6 py-3 text-sm font-extrabold transition',
                isListening
                  ? 'bg-red-50 text-red-600 ring-2 ring-red-200 animate-pulse'
                  : 'bg-red-500 text-white hover:bg-red-600',
              ].join(' ')}
            >
              {isListening ? '⏹ Stop Recording' : '🎙 Start Recording'}
            </button>
          ) : (
            <div className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-600">
              Speech recognition not supported. Please type your answer.
            </div>
          )}

          {isListening && (
            <span className="text-sm font-semibold text-red-500 animate-pulse">
              Listening...
            </span>
          )}
        </div>

        {/* Transcript */}
        <div className="relative rounded-2xl border border-gray-200 bg-white shadow-sm focus-within:ring-1 focus-within:ring-red-200">
          <textarea
            value={transcript}
            onChange={handleManualInput}
            placeholder={
              isSupported
                ? 'Your transcript will appear here...'
                : 'Type your answer here...'
            }
            className="min-h-[200px] w-full resize-y rounded-2xl p-6 text-base leading-relaxed text-gray-800 placeholder-gray-400 focus:outline-none"
            spellCheck="false"
          />

          <div className="absolute bottom-4 right-6 text-xs font-semibold text-gray-400">
            {transcript.length > 0
              ? `${transcript.split(/\s+/).filter(Boolean).length} words`
              : ''}
          </div>
        </div>

        {/* Status + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>
            {error && (
              <span className="text-sm font-semibold text-red-600">
                {error}
              </span>
            )}
            {saveSuccess && (
              <span className="text-sm font-bold text-green-600">
                Saved Successfully ✅
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3">

            <button
              onClick={handleEvaluate}
              disabled={evaluating || !transcript.trim()}
              className={[
                'rounded-xl px-6 py-2 text-sm font-extrabold transition',
                evaluating
                  ? 'bg-purple-200 text-purple-700 animate-pulse'
                  : 'bg-purple-600 text-white hover:bg-purple-700',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              ].join(' ')}
            >
              {evaluating ? 'Evaluating...' : '✨ Evaluate with AI'}
            </button>

            <button
              onClick={handleSaveAttempt}
              disabled={saving || !transcript.trim()}
              className="rounded-xl bg-gray-900 px-6 py-2 text-sm font-extrabold text-white hover:bg-black disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Attempt'}
            </button>

            <button
              onClick={onCompleteModule}
              disabled={!isSaved || saving}
              className={[
                'rounded-xl px-6 py-2 text-sm font-extrabold transition',
                !isSaved
                  ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                  : 'bg-green-600 text-white hover:bg-green-700',
              ].join(' ')}
            >
              Mark Module Completed
            </button>
          </div>
        </div>
      </div>

      {/* Evaluation Result */}
      {evaluationResult && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-lg font-extrabold text-purple-700">
              AI Speaking Evaluation
            </h3>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl bg-white px-4 py-2 shadow-sm">
                <div className="text-xs text-gray-500">Band</div>
                <div className="text-xl font-extrabold text-gray-900">
                  {evaluationResult.band_score}
                </div>
              </div>

              <div className="rounded-xl bg-white px-4 py-2 shadow-sm">
                <div className="text-xs text-gray-500">Fluency</div>
                <div className="text-xl font-extrabold text-gray-900">
                  {evaluationResult.fluency_score}
                </div>
              </div>

              <div className="rounded-xl bg-white px-4 py-2 shadow-sm">
                <div className="text-xs text-gray-500">Vocab</div>
                <div className="text-xl font-extrabold text-gray-900">
                  {evaluationResult.vocab_score}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 text-sm text-gray-700">
            <div>
              <h4 className="mb-2 font-bold text-gray-900">
                Feedback (Bangla)
              </h4>
              <p className="italic">
                {evaluationResult.feedback_summary_bn}
              </p>
            </div>

            {evaluationResult.improved_answer && (
              <div>
                <h4 className="mb-2 font-bold text-green-600">
                  Improved Answer
                </h4>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  {evaluationResult.improved_answer}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SpeakingModule