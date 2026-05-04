import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthProvider'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatTime = (s) => {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const DIFFICULTY_STYLE = {
  Easy:   'text-green-600 bg-green-50 ring-1 ring-green-200',
  Medium: 'text-amber-600 bg-amber-50 ring-1 ring-amber-200',
  Hard:   'text-red-600   bg-red-50   ring-1 ring-red-200',
}

// ─── MCQ helpers ──────────────────────────────────────────────────────────────
// q.answer can be:
//   "C"        → single answer
//   "A,E"      → two answers comma-separated
//   "A & C"    → two answers ampersand-separated
//   ["A","C"]  → already an array (future-proof)
//
// answers[q.id] is always stored as an array of selected letters e.g. ["A","C"]

const normalizeCorrect = (answer) => {
  if (!answer) return []
  if (Array.isArray(answer)) return answer.map(a => a.trim().toUpperCase())
  // Split on comma or "&" (with optional whitespace around them)
  return answer
    .split(/[,&]/)
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)
}

const isMultiSelect = (q) => normalizeCorrect(q.answer).length > 1

const mcqIsCorrect = (selected = [], correct) => {
  const c = normalizeCorrect(correct).slice().sort().join(',')
  const s = [...selected].map(l => l.toUpperCase()).sort().join(',')
  return c.length > 0 && s === c
}

const toggleLetter = (prev = [], letter) =>
  prev.includes(letter) ? prev.filter(l => l !== letter) : [...prev, letter]

// ─── Phase banner ─────────────────────────────────────────────────────────────

const PhaseBanner = ({ phase, previewLeft, answerLeft }) => {
  if (phase === 'preview') return (
    <div className="mb-5 flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-extrabold text-blue-600">{previewLeft}</span>
        <div>
          <div className="text-xs font-extrabold uppercase tracking-wide text-blue-600">Preview Time</div>
          <div className="text-xs text-blue-500">Read the questions carefully before audio starts</div>
        </div>
      </div>
      <div className="text-2xl font-extrabold text-blue-600">{previewLeft}s</div>
    </div>
  )
  if (phase === 'audio') return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-purple-200 bg-purple-50 px-5 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M9 18V5l12-2v13" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="6" cy="18" r="3" stroke="#7c3aed" strokeWidth="2"/>
          <circle cx="18" cy="16" r="3" stroke="#7c3aed" strokeWidth="2"/>
        </svg>
      </span>
      <div>
        <div className="text-xs font-extrabold uppercase tracking-wide text-purple-600">Now Listening</div>
        <div className="text-xs text-purple-500">You can start answering while the audio plays</div>
      </div>
    </div>
  )
  if (phase === 'answer') return (
    <div className="mb-5 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3">
      <div className="flex items-center gap-3">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${answerLeft < 15 ? 'bg-red-100' : 'bg-amber-100'}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke={answerLeft < 15 ? '#dc2626' : '#d97706'} strokeWidth="2"/>
            <path d="M12 7v5l3 2" stroke={answerLeft < 15 ? '#dc2626' : '#d97706'} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </span>
        <div>
          <div className={`text-xs font-extrabold uppercase tracking-wide ${answerLeft < 15 ? 'text-red-600' : 'text-amber-600'}`}>Answer Time</div>
          <div className="text-xs text-amber-500">Finalize your answers before time runs out</div>
        </div>
      </div>
      <div className={`text-2xl font-extrabold ${answerLeft < 15 ? 'text-red-600' : 'text-amber-600'}`}>{formatTime(answerLeft)}</div>
    </div>
  )
  return null
}

// ─── Instructions card ────────────────────────────────────────────────────────

const InstructionsCard = ({ text }) => (
  <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M4 19V5a2 2 0 012-2h10a2 2 0 012 2v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M8 7h8M8 11h8M8 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
    <div>
      <div className="text-xs font-bold text-blue-700 mb-0.5">Instructions</div>
      <div className="text-sm text-blue-800 leading-relaxed">{text}</div>
    </div>
  </div>
)

// ─── Result card ──────────────────────────────────────────────────────────────

const ResultCard = ({ score, total, drillType, onRetry, onBack }) => {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const isWriting = drillType === 'task1_academic' || drillType === 'task2_essay'
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Drill Complete</div>
      {isWriting ? (
        <div className="my-6">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-purple-50 ring-4 ring-purple-100">
            <span className="text-3xl font-extrabold text-purple-700">✓</span>
          </div>
          <p className="mt-4 text-sm text-gray-500">Your essay has been saved.</p>
        </div>
      ) : (
        <div className="my-6">
          <div className="mx-auto flex h-24 w-24 flex-col items-center justify-center rounded-full bg-red-50 ring-4 ring-red-100">
            <span className="text-3xl font-extrabold text-gray-900">{score}/{total}</span>
          </div>
          <div className={`mt-4 text-2xl font-extrabold ${pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</div>
          <p className="mt-1 text-sm text-gray-500">{pct >= 70 ? 'Great work! 🎉' : pct >= 40 ? 'Good effort — keep practising.' : "Keep going — you'll improve!"}</p>
        </div>
      )}
      <div className="flex gap-3 justify-center">
        <button onClick={onBack} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">← Back</button>
        <button onClick={onRetry} className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-600">Retry</button>
      </div>
    </div>
  )
}

// ─── Drill renderers ──────────────────────────────────────────────────────────

const MCQDrill = ({ content, answers, setAnswers, submitted, locked }) => {
  const questions = content.questions || []
  return (
    <div className={`space-y-4 transition ${locked ? 'opacity-50 pointer-events-none' : ''}`}>
      {questions.map((q, idx) => {
        const multi = isMultiSelect(q)
        const correctAnswers = normalizeCorrect(q.answer)
        const selected = answers[q.id] || []

        return (
          <div key={q.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3 mb-1">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50 text-xs font-extrabold text-red-600">{idx + 1}</span>
              <p className="text-sm font-semibold text-gray-900 leading-snug">{q.text}</p>
            </div>
            {multi && (
              <div className="mb-3 ml-10">
                <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 ring-1 ring-blue-200">
                  Select all that apply — {correctAnswers.length} correct answers
                </span>
              </div>
            )}
            <div className="space-y-2 mt-3">
              {(q.options || []).map((opt, oIdx) => {
                const letter = String.fromCharCode(65 + oIdx)
                const isSelected = selected.includes(letter)
                const isCorrectOption = submitted && correctAnswers.includes(letter)
                const isWrongOption   = submitted && isSelected && !correctAnswers.includes(letter)
                const isMissed        = submitted && !isSelected && correctAnswers.includes(letter)

                let rowCls = 'border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-pointer'
                if (isSelected && !submitted)  rowCls = 'border-red-200 bg-red-50 ring-1 ring-red-200'
                if (isCorrectOption)            rowCls = 'border-green-200 bg-green-50 ring-1 ring-green-200'
                if (isWrongOption)              rowCls = 'border-red-200 bg-red-50 ring-1 ring-red-200'
                if (isMissed)                   rowCls = 'border-green-200 bg-green-50 ring-1 ring-green-200 opacity-60'

                let indicatorCls = multi
                  ? 'rounded-md border border-gray-300 bg-white text-transparent'
                  : 'rounded-full border border-gray-300 bg-white text-gray-500'
                if (isSelected && !submitted)
                  indicatorCls = multi ? 'rounded-md bg-red-500 text-white' : 'rounded-full bg-red-500 text-white'
                if (isCorrectOption)
                  indicatorCls = multi ? 'rounded-md bg-green-500 text-white' : 'rounded-full bg-green-500 text-white'
                if (isWrongOption)
                  indicatorCls = multi ? 'rounded-md bg-red-500 text-white' : 'rounded-full bg-red-500 text-white'
                if (isMissed)
                  indicatorCls = multi
                    ? 'rounded-md border-2 border-green-500 bg-white text-green-500'
                    : 'rounded-full border-2 border-green-500 bg-white text-green-500'

                const handleToggle = () => {
                  if (submitted) return
                  setAnswers(a => ({ ...a, [q.id]: toggleLetter(a[q.id] || [], letter) }))
                }

                return (
                  <label
                    key={oIdx}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${rowCls} ${submitted ? 'cursor-default' : ''}`}
                  >
                    <input type="checkbox" className="hidden" disabled={submitted} checked={isSelected} onChange={handleToggle} />
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center text-[11px] font-extrabold ${indicatorCls}`}>
                      {multi ? (
                        (isSelected || isCorrectOption) && (
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                            <path d="M1.5 5.5l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )
                      ) : (
                        letter
                      )}
                    </span>
                    <span className="text-sm text-gray-800">{opt}</span>
                    {multi && <span className="ml-2 shrink-0 text-[11px] font-bold text-gray-400">{letter}</span>}
                    {submitted && isCorrectOption && !isMissed && <span className="ml-auto text-xs font-bold text-green-600">✓ Correct</span>}
                    {submitted && isWrongOption  && <span className="ml-auto text-xs font-bold text-red-600">✗ Wrong</span>}
                    {submitted && isMissed       && <span className="ml-auto text-xs font-bold text-green-700">← Missed</span>}
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const FormCompletionDrill = ({ content, answers, setAnswers, submitted, locked }) => {
  const fields = content.fields || []
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden transition ${locked ? 'opacity-50 pointer-events-none' : ''}`}>
      {content.form_title && (
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-3">
          <div className="text-sm font-extrabold text-gray-700">{content.form_title}</div>
        </div>
      )}
      <div className="divide-y divide-gray-100">
        {fields.map((field, idx) => {
          const isCorrect = submitted && answers[field.id]?.trim().toLowerCase() === field.answer?.trim().toLowerCase()
          const isWrong = submitted && answers[field.id] && !isCorrect
          return (
            <div key={field.id} className="flex items-center gap-4 px-6 py-4">
              <div className="w-40 shrink-0 text-sm font-semibold text-gray-600">{field.label}</div>
              <div className="flex flex-1 flex-wrap items-center gap-2 text-sm text-gray-700">
                {field.prefix && <span>{field.prefix}</span>}
                <span className="flex items-center gap-1.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[11px] font-extrabold text-white">{idx + 1}</span>
                  <input type="text" disabled={submitted} value={answers[field.id] || ''} onChange={e => setAnswers(a => ({ ...a, [field.id]: e.target.value }))} placeholder="Answer..."
                    className={`rounded-lg border px-3 py-1.5 text-sm outline-none transition focus:ring-2 focus:ring-red-200 ${isCorrect ? 'border-green-400 bg-green-50 text-green-800' : isWrong ? 'border-red-400 bg-red-50 text-red-800' : 'border-gray-300 bg-white'}`}
                    style={{ width: '160px' }}
                  />
                  {submitted && isCorrect && <span className="text-xs font-bold text-green-600">✓</span>}
                  {submitted && isWrong && <span className="text-xs font-bold text-red-600">✗ {field.answer}</span>}
                </span>
                {field.suffix && <span>{field.suffix}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const MapLabellingDrill = ({ content, answers, setAnswers, submitted, locked }) => {
  const questions = content.questions || []
  return (
    <div className={`space-y-5 transition ${locked ? 'opacity-50 pointer-events-none' : ''}`}>
      {content.image_url && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <img src={content.image_url} alt="Map" className="mx-auto max-w-full rounded-xl" />
        </div>
      )}
      <div className="space-y-3">
        {questions.map((q, idx) => {
          const isCorrect = submitted && answers[q.id]?.trim().toLowerCase() === q.answer?.trim().toLowerCase()
          const isWrong = submitted && answers[q.id] && !isCorrect
          return (
            <div key={q.id} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 text-sm font-extrabold text-white">{idx + 1}</span>
              <div className="flex-1">
                <div className="mb-1.5 text-sm font-semibold text-gray-700">{q.label}</div>
                <input type="text" disabled={submitted} value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} placeholder="Type answer here..."
                  className={`w-full max-w-xs rounded-xl border px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-red-200 ${isCorrect ? 'border-green-400 bg-green-50 text-green-800' : isWrong ? 'border-red-400 bg-red-50 text-red-800' : 'border-gray-300 bg-white'}`}
                />
                {submitted && isWrong && <div className="mt-1 text-xs font-bold text-red-600">Correct: {q.answer}</div>}
                {submitted && isCorrect && <div className="mt-1 text-xs font-bold text-green-600">✓ Correct</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const MatchingDrill = ({ content, answers, setAnswers, submitted, locked }) => {
  const options = content.options || []
  const questions = content.questions || []
  return (
    <div className={`grid gap-5 lg:grid-cols-[220px_1fr] transition ${locked ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="h-fit rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 text-xs font-extrabold uppercase tracking-wide text-gray-500">Options</div>
        <div className="space-y-2">
          {options.map(opt => (
            <div key={opt.letter} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-extrabold text-blue-600">{opt.letter}</span>
              <span className="text-sm text-gray-700">{opt.text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {questions.map((q, idx) => {
          const selected = answers[q.id]
          const isCorrect = submitted && selected === q.answer
          const isWrong = submitted && selected && selected !== q.answer
          return (
            <div key={q.id} className={`flex items-center gap-4 rounded-2xl border bg-white px-5 py-4 shadow-sm ${isCorrect ? 'border-green-200' : isWrong ? 'border-red-200' : 'border-gray-200'}`}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 text-sm font-extrabold text-white">{idx + 1}</span>
              <span className="flex-1 text-sm font-semibold text-gray-800">{q.text}</span>
              <div className="flex items-center gap-2">
                {submitted && isCorrect && <span className="text-xs font-bold text-green-600">✓</span>}
                {submitted && isWrong && <span className="text-xs font-bold text-red-600">→ {q.answer}</span>}
                <select disabled={submitted} value={selected || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-red-200 ${isCorrect ? 'border-green-400 bg-green-50 text-green-800' : isWrong ? 'border-red-400 bg-red-50 text-red-800' : 'border-gray-300 bg-white text-gray-700'}`}
                >
                  <option value="">Select...</option>
                  {options.map(opt => <option key={opt.letter} value={opt.letter}>{opt.letter}</option>)}
                </select>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Locked audio display ─────────────────────────────────────────────────────

const LockedAudioDisplay = ({ label }) => (
  <div className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm opacity-40 select-none">
    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">{label}</div>
    <div className="flex items-center gap-3 rounded-xl bg-gray-100 px-4 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <polygon points="5,3 19,12 5,21" fill="#9ca3af"/>
        </svg>
      </div>
      <div className="flex-1 h-1.5 rounded-full bg-gray-300" />
      <span className="text-xs font-mono text-gray-400">0:00</span>
    </div>
  </div>
)

// ─── Active audio display ─────────────────────────────────────────────────────

const ActiveAudioDisplay = ({ audioUrl, audioRef, onEnded }) => (
  <div className="mb-5 rounded-2xl border border-purple-200 bg-purple-50 p-4 shadow-sm">
    <audio ref={audioRef} src={audioUrl} onEnded={onEnded} preload="auto" />
    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-purple-500">Audio Playing</div>
    <div className="flex items-center gap-3 rounded-xl bg-purple-100 px-4 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-200">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <style>{`
            @keyframes bar1 { 0%,100%{height:4px} 50%{height:12px} }
            @keyframes bar2 { 0%,100%{height:10px} 50%{height:3px} }
            @keyframes bar3 { 0%,100%{height:6px} 50%{height:14px} }
          `}</style>
          <rect x="1" y="6" width="3" height="4" rx="1" fill="#7c3aed" style={{animation:'bar1 0.8s ease-in-out infinite'}}/>
          <rect x="6" y="3" width="3" height="10" rx="1" fill="#7c3aed" style={{animation:'bar2 0.8s ease-in-out infinite 0.15s'}}/>
          <rect x="11" y="5" width="3" height="6" rx="1" fill="#7c3aed" style={{animation:'bar3 0.8s ease-in-out infinite 0.3s'}}/>
        </svg>
      </div>
      <div className="flex-1 h-1.5 rounded-full bg-purple-200 overflow-hidden">
        <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{width: '60%'}} />
      </div>
      <span className="text-xs font-semibold text-purple-500">Playing…</span>
    </div>
  </div>
)

// ─── Listening three-phase wrapper ────────────────────────────────────────────

const ListeningDrillWrapper = ({ exercise, answers, setAnswers, submitted, onSubmit }) => {
  const [phase, setPhase] = useState('preview')
  const [previewLeft, setPreviewLeft] = useState(10)
  const [answerLeft, setAnswerLeft] = useState(60)
  const audioRef = useRef(null)
  const timerRef = useRef(null)
  const content = exercise.content || {}
  const dt = exercise.drill_type

  // Stop audio and all timers immediately when submitted externally
  useEffect(() => {
    if (!submitted) return
    clearInterval(timerRef.current)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [submitted])

  // Phase 1: preview countdown
  useEffect(() => {
    if (phase !== 'preview' || submitted) return
    timerRef.current = setInterval(() => {
      setPreviewLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); setPhase('audio'); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, submitted])

  // Phase 2: play audio
  useEffect(() => {
    if (phase !== 'audio' || submitted) return
    if (audioRef.current) audioRef.current.play().catch(() => {})
  }, [phase, submitted])

  // Phase 3: answer countdown
  useEffect(() => {
    if (phase !== 'answer' || submitted) return
    timerRef.current = setInterval(() => {
      setAnswerLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); onSubmit(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, submitted, onSubmit])

  // Submit handler that also kills audio + timers before calling onSubmit
  const handleSubmitClick = () => {
    clearInterval(timerRef.current)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    onSubmit()
  }

  const locked = phase === 'preview'

  const renderDrill = () => {
    if (dt === 'multiple_choice')  return <MCQDrill content={content} answers={answers} setAnswers={setAnswers} submitted={submitted} locked={locked} />
    if (dt === 'form_completion')  return <FormCompletionDrill content={content} answers={answers} setAnswers={setAnswers} submitted={submitted} locked={locked} />
    if (dt === 'map_labelling')    return <MapLabellingDrill content={content} answers={answers} setAnswers={setAnswers} submitted={submitted} locked={locked} />
    if (dt === 'matching')         return <MatchingDrill content={content} answers={answers} setAnswers={setAnswers} submitted={submitted} locked={locked} />
    return null
  }

  return (
    <div>
      {!submitted && <PhaseBanner phase={phase} previewLeft={previewLeft} answerLeft={answerLeft} />}
      {content.instructions && <InstructionsCard text={content.instructions} />}

      {exercise.audio_url && (
        <>
          {/* Audio element always mounted so audioRef is always valid */}
          <audio ref={audioRef} src={exercise.audio_url} preload="auto"
            onEnded={() => { if (!submitted) setPhase('answer') }}
          />
          {phase === 'preview' && <LockedAudioDisplay label="Audio (unlocks after preview)" />}
          {phase === 'audio'   && (
            <div className="mb-5 rounded-2xl border border-purple-200 bg-purple-50 p-4 shadow-sm">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-purple-500">Audio Playing</div>
              <div className="flex items-center gap-3 rounded-xl bg-purple-100 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-200">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <style>{`
                      @keyframes bar1 { 0%,100%{height:4px} 50%{height:12px} }
                      @keyframes bar2 { 0%,100%{height:10px} 50%{height:3px} }
                      @keyframes bar3 { 0%,100%{height:6px} 50%{height:14px} }
                    `}</style>
                    <rect x="1" y="6" width="3" height="4" rx="1" fill="#7c3aed" style={{animation:'bar1 0.8s ease-in-out infinite'}}/>
                    <rect x="6" y="3" width="3" height="10" rx="1" fill="#7c3aed" style={{animation:'bar2 0.8s ease-in-out infinite 0.15s'}}/>
                    <rect x="11" y="5" width="3" height="6" rx="1" fill="#7c3aed" style={{animation:'bar3 0.8s ease-in-out infinite 0.3s'}}/>
                  </svg>
                </div>
                <div className="flex-1 h-1.5 rounded-full bg-purple-200 overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{width: '60%'}} />
                </div>
                <span className="text-xs font-semibold text-purple-500">Playing…</span>
              </div>
            </div>
          )}
          {(phase === 'answer' || submitted) && <LockedAudioDisplay label="Audio (playback ended)" />}
        </>
      )}

      {!exercise.audio_url && phase === 'audio' && (
        <NoAudioFallback onDone={() => { if (!submitted) setPhase('answer') }} />
      )}

      {renderDrill()}

      {!submitted && phase !== 'preview' && (
        <div className="mt-8 flex justify-end">
          <button onClick={handleSubmitClick} className="rounded-xl bg-red-500 px-8 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-red-600 transition">
            Submit Answers
          </button>
        </div>
      )}
    </div>
  )
}

const NoAudioFallback = ({ onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div className="mb-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-semibold text-yellow-700">
      ⚠️ No audio file attached to this drill. Answer timer starting shortly...
    </div>
  )
}

// ─── Reading drill ────────────────────────────────────────────────────────────

const ReadingDrill = ({ content, answers, setAnswers, submitted, drillType }) => {
  const questions = content.questions || []

  const renderInput = (q) => {
    if (drillType === 'true_false_ng') {
      return (
        <div className="flex gap-2 flex-wrap mt-2">
          {['True', 'False', 'Not Given'].map(opt => {
            const isSelected = answers[q.id] === opt
            const isCorrect = submitted && opt === q.answer
            const isWrong = submitted && isSelected && opt !== q.answer
            return (
              <button key={opt} disabled={submitted} onClick={() => !submitted && setAnswers(a => ({ ...a, [q.id]: opt }))}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border ${isCorrect ? 'bg-green-50 border-green-300 text-green-700' : isWrong ? 'bg-red-50 border-red-300 text-red-700' : isSelected ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-red-300'}`}
              >{opt}</button>
            )
          })}
        </div>
      )
    }
    if (['short_answer', 'sentence_completion', 'summary_completion'].includes(drillType)) {
      const isCorrect = submitted && answers[q.id]?.trim().toLowerCase() === q.answer?.trim().toLowerCase()
      const isWrong = submitted && answers[q.id] && !isCorrect
      return (
        <div className="mt-2">
          <input type="text" disabled={submitted} value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} placeholder="Your answer..."
            className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200 ${isCorrect ? 'border-green-400 bg-green-50' : isWrong ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
          />
          {submitted && isWrong && <div className="mt-1 text-xs font-bold text-red-600">Correct: {q.answer}</div>}
        </div>
      )
    }
    if (drillType === 'matching_headings') {
      const opts = content.options || []
      const selected = answers[q.id]
      const isCorrect = submitted && selected === q.answer
      const isWrong = submitted && selected && selected !== q.answer
      return (
        <select disabled={submitted} value={selected || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
          className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200 ${isCorrect ? 'border-green-400 bg-green-50' : isWrong ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
        >
          <option value="">Select heading...</option>
          {opts.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
        </select>
      )
    }
    return null
  }

  if (drillType === 'matching' || drillType === 'multiple_choice') {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-xs font-bold text-gray-500">Reading Passage</div>
          <div className="prose max-w-none text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: (content.passage || '').replace(/\n/g, '<br/>') }} />
        </div>
        <div>
          {drillType === 'matching'
            ? <MatchingDrill content={content} answers={answers} setAnswers={setAnswers} submitted={submitted} locked={false} />
            : <MCQDrill content={content} answers={answers} setAnswers={setAnswers} submitted={submitted} locked={false} />
          }
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 text-xs font-bold text-gray-500">Reading Passage</div>
        <div className="prose max-w-none text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: (content.passage || '').replace(/\n/g, '<br/>') }} />
      </div>
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50 text-xs font-extrabold text-red-600">{idx + 1}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{q.text}</p>
                {renderInput(q)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Writing drill ────────────────────────────────────────────────────────────

const WritingDrill = ({ content, writingText, setWritingText, submitted }) => {
  const wordCount = writingText.trim().split(/\s+/).filter(Boolean).length
  const minWords = content.min_words || 150
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Task Prompt</div>
        <p className="text-sm leading-relaxed text-gray-700">{content.prompt}</p>
        {content.image_url && <img src={content.image_url} alt="Task" className="mt-4 max-w-full rounded-xl border border-gray-200" />}
      </div>
      <div className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${!submitted ? 'focus-within:ring-1 focus-within:ring-red-200' : ''}`}>
        <textarea value={writingText} onChange={e => setWritingText(e.target.value)} disabled={submitted}
          placeholder="Start writing your response here..."
          className="min-h-[360px] w-full resize-y p-5 text-sm leading-relaxed text-gray-800 outline-none placeholder-gray-400"
          spellCheck="false"
        />
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-5 py-3 text-xs">
          <span className={`font-bold ${wordCount < minWords ? 'text-amber-600' : 'text-green-600'}`}>{wordCount} words</span>
          <span className="text-gray-400">Target: {minWords}+ words</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const DrillPlayerPage = () => {
  const { drillId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [exercise, setExercise] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [answers, setAnswers] = useState({})
  const [writingText, setWritingText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const totalTimeRef = useRef(0)
  const timerRef = useRef(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true)
        const { data, error: err } = await supabase.from('exercises').select('*').eq('id', drillId).single()
        if (err) throw err
        setExercise(data)
        if (data.skill !== 'listening') {
          const mins = data.content?.time_minutes || (data.skill === 'writing' ? 40 : 20)
          totalTimeRef.current = mins * 60
          setTimeLeft(mins * 60)
        }
      } catch (err) { setError(err.message) }
      finally { setLoading(false) }
    }
    fetch()
  }, [drillId])

  useEffect(() => {
    if (!exercise || exercise.skill === 'listening' || submitted) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleSubmit(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [exercise, submitted])

  const calcScore = () => {
    if (!exercise) return { score: 0, total: 0 }
    const dt = exercise.drill_type
    const content = exercise.content || {}
    if (dt === 'task1_academic' || dt === 'task2_essay') return { score: null, total: null }
    if (dt === 'form_completion') {
      const fields = content.fields || []
      return { score: fields.filter(f => answers[f.id]?.trim().toLowerCase() === f.answer?.trim().toLowerCase()).length, total: fields.length }
    }
    if (dt === 'map_labelling') {
      const qs = content.questions || []
      return { score: qs.filter(q => answers[q.id]?.trim().toLowerCase() === q.answer?.trim().toLowerCase()).length, total: qs.length }
    }
    if (dt === 'matching' || dt === 'matching_headings') {
      const qs = content.questions || []
      return { score: qs.filter(q => answers[q.id] === q.answer).length, total: qs.length }
    }
    if (dt === 'multiple_choice') {
      const qs = content.questions || []
      return {
        score: qs.filter(q => mcqIsCorrect(answers[q.id] || [], q.answer)).length,
        total: qs.length
      }
    }
    if (dt === 'true_false_ng') {
      const qs = content.questions || []
      return { score: qs.filter(q => answers[q.id] === q.answer).length, total: qs.length }
    }
    const qs = content.questions || []
    return { score: qs.filter(q => answers[q.id]?.trim().toLowerCase() === q.answer?.trim().toLowerCase()).length, total: qs.length }
  }

  const handleSubmit = async () => {
    if (submitted) return
    clearInterval(timerRef.current)
    setSubmitted(true)
    const { score, total } = calcScore()
    setResult({ score, total })
    if (user) {
      try {
        await supabase.from('exercise_attempts').upsert(
          { user_id: user.id, exercise_id: drillId, score: score ?? 0, total: total ?? 0, answers: exercise.drill_type === 'task1_academic' || exercise.drill_type === 'task2_essay' ? { essay: writingText } : answers, completed_at: new Date().toISOString() },
          { onConflict: 'user_id, exercise_id' }
        )
      } catch (e) { console.error('Failed to save attempt:', e) }
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setWritingText('')
    setSubmitted(false)
    setResult(null)
    if (exercise?.skill !== 'listening') {
      const mins = exercise.content?.time_minutes || (exercise.skill === 'writing' ? 40 : 20)
      totalTimeRef.current = mins * 60
      setTimeLeft(mins * 60)
    }
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
        <p className="font-semibold text-gray-600">Loading drill...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] p-4">
      <div className="text-center">
        <p className="mb-4 text-red-600">Error: {error}</p>
        <button onClick={() => navigate('/exercises')} className="rounded-xl bg-red-500 px-4 py-2 font-semibold text-white">Back</button>
      </div>
    </div>
  )

  if (!exercise) return null

  const content = exercise.content || {}
  const dt = exercise.drill_type
  const isListening = exercise.skill === 'listening'
  const isReading = exercise.skill === 'reading'
  const isWriting = exercise.skill === 'writing'

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-gray-900">
      {!isListening && (
        <div className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <span className="truncate text-sm font-extrabold text-gray-900">{exercise.title}</span>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-sm font-bold ${timeLeft < 60 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                {formatTime(timeLeft)}
              </div>
              {!submitted && <button onClick={handleSubmit} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-extrabold text-white hover:bg-red-600 transition">Submit Answers</button>}
            </div>
          </div>
          <div className="h-1 w-full bg-gray-100">
            <div className={`h-full transition-all duration-1000 ${timeLeft < 60 ? 'bg-red-500' : 'bg-amber-400'}`} style={{ width: `${totalTimeRef.current > 0 ? (timeLeft / totalTimeRef.current) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-6 py-7 pb-20">
        <div className="mb-5 flex items-center gap-2 text-xs text-gray-400">
          <button onClick={() => navigate('/exercises')} className="font-semibold hover:text-red-500 transition">Exercises</button>
          <span>→</span>
          <span className="font-semibold text-gray-600">{exercise.title}</span>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${DIFFICULTY_STYLE[exercise.difficulty]}`}>{exercise.difficulty}</span>
          <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">{exercise.skill}</span>
          <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-500">Set {exercise.set_number}</span>
        </div>

        {submitted && result && (
          <div className="mb-8">
            <ResultCard score={result.score} total={result.total} drillType={dt} onRetry={handleRetry} onBack={() => navigate('/exercises')} />
          </div>
        )}

        {isListening && (
          <ListeningDrillWrapper exercise={exercise} answers={answers} setAnswers={setAnswers} submitted={submitted} onSubmit={handleSubmit} />
        )}

        {isReading && (
          <>
            {content.instructions && <InstructionsCard text={content.instructions} />}
            <ReadingDrill content={content} answers={answers} setAnswers={setAnswers} submitted={submitted} drillType={dt} />
            {!submitted && (
              <div className="mt-8 flex justify-end">
                <button onClick={handleSubmit} className="rounded-xl bg-red-500 px-8 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-red-600 transition">Submit Answers</button>
              </div>
            )}
          </>
        )}

        {isWriting && (
          <>
            {content.instructions && <InstructionsCard text={content.instructions} />}
            <WritingDrill content={content} writingText={writingText} setWritingText={setWritingText} submitted={submitted} />
            {!submitted && (
              <div className="mt-8 flex justify-end">
                <button onClick={handleSubmit} className="rounded-xl bg-red-500 px-8 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-red-600 transition">Submit Answers</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default DrillPlayerPage