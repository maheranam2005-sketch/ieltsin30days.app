import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthProvider'

const MockTestPlayerPage = () => {
  const { testId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // State Management
  const [testData, setTestData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [activeTab, setActiveTab] = useState('reading') // 'reading' or 'listening'
  const [userAnswers, setUserAnswers] = useState({}) // { questionId: "A"|"B"|"C"|"D" }
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null) // { score, total }
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // 1. Fetch Mock Test Data
  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true)
        setFetchError(null)

        const { data, error } = await supabase
          .from('mock_tests')
          .select('*')
          .eq('id', testId)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            throw new Error('Mock test not found')
          }
          throw error
        }

        setTestData(data)
      } catch (err) {
        setFetchError(err.message || 'Failed to load test')
      } finally {
        setLoading(false)
      }
    }

    if (testId) {
      fetchTest()
    } else {
      setFetchError('No test ID provided')
      setLoading(false)
    }
  }, [testId])

  // Helper: Extract Letter from option or index
  const getOptionLetter = (option, index) => {
    if (typeof option === 'string' && /^[A-D]\)/.test(option)) {
      return option[0].toUpperCase()
    }
    return String.fromCharCode(65 + index)
  }

  // 2. Interaction Handlers
  const handleOptionChange = (questionId, letter) => {
    if (submitted) return
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: letter,
    }))
  }

  const calculateScore = () => {
    let score = 0
    let totalCount = 0

    const readingQuestions = testData.sections?.reading?.questions || []
    const listeningQuestions = testData.sections?.listening?.questions || []

    const allQuestions = [...readingQuestions, ...listeningQuestions]

    allQuestions.forEach((q) => {
      totalCount++
      if (userAnswers[q.id] === q.answer) {
        score++
      }
    })

    return { score, total: totalCount }
  }

  const handleSubmit = async () => {
    if (!user || submitting) return
    setSubmitting(true)
    setSaveError(null)

    const finalResult = calculateScore()

    try {
      const { error: insertError } = await supabase.from('mock_attempts').insert({
        user_id: user.id,
        mock_test_id: testId,
        answers: userAnswers,
        score: finalResult.score,
        total: finalResult.total,
      })

      if (insertError) throw insertError

      setResult(finalResult)
      setSubmitted(true)
    } catch (err) {
      setSaveError(err.message || 'Failed to save your results. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // 3. UI Components
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] text-red-500">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-current border-t-transparent" />
          <p className="text-sm font-semibold text-gray-600">Loading Exam...</p>
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h2 className="mb-2 text-2xl font-extrabold text-gray-900">Mock test not found</h2>
          <p className="mb-8 text-gray-500">{fetchError}</p>
          <button
            onClick={() => navigate('/mock-tests')}
            className="w-full rounded-xl bg-gray-900 py-3 text-sm font-extrabold text-white hover:bg-black"
          >
            Back to Mock Tests
          </button>
        </div>
      </div>
    )
  }

  const currentPassage = testData.sections?.reading?.passage
  const audioUrl = testData.sections?.listening?.audio_url
  const currentQuestions =
    activeTab === 'reading'
      ? testData.sections?.reading?.questions || []
      : testData.sections?.listening?.questions || []

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-base font-extrabold text-gray-900">{testData.title}</h1>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              IELTS Mock Player
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!submitted && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl bg-red-500 px-5 py-2 text-sm font-extrabold text-white shadow-sm hover:bg-red-600 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Test'}
              </button>
            )}

            <button
              onClick={() => navigate('/mock-tests')}
              className="rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {submitted ? (
          /* Result View */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-10 flex h-48 w-48 flex-col items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200">
              <div className="text-6xl font-black text-gray-900">{result.score}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-400">
                Score out of {result.total}
              </div>
            </div>

            <h2 className="mb-8 text-3xl font-extrabold text-gray-900">Test Completed!</h2>

            <button
              onClick={() => navigate('/mock-tests')}
              className="rounded-2xl bg-red-500 px-10 py-4 text-base font-extrabold text-white shadow-sm hover:bg-red-600"
            >
              Back to Mock Tests
            </button>
          </div>
        ) : (
          /* Player View */
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
              <button
                onClick={() => setActiveTab('reading')}
                className={[
                  'flex-1 rounded-xl py-3 text-sm font-extrabold transition',
                  activeTab === 'reading'
                    ? 'bg-red-500 text-white'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
                ].join(' ')}
              >
                Reading Section
              </button>

              <button
                onClick={() => setActiveTab('listening')}
                className={[
                  'flex-1 rounded-xl py-3 text-sm font-extrabold transition',
                  activeTab === 'listening'
                    ? 'bg-red-500 text-white'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
                ].join(' ')}
              >
                Listening Section
              </button>
            </div>

            {saveError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm font-semibold text-red-600">
                {saveError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Content Panel */}
              <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm lg:h-[calc(100vh-220px)] lg:overflow-y-auto custom-scrollbar">
                <h3 className="mb-6 text-xl font-extrabold text-gray-900">
                  {activeTab === 'reading' ? 'Reading Passage' : 'Listening Material'}
                </h3>

                {activeTab === 'reading' ? (
                  <div className="prose max-w-none text-gray-700 leading-relaxed">
                    {currentPassage?.split('\n').map((para, i) => (
                      <p key={i} className="mb-4">
                        {para}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full space-y-6">
                    <div className="text-6xl">🎧</div>
                    {audioUrl ? (
                      <audio controls className="w-full max-w-md">
                        <source src={audioUrl} type="audio/mpeg" />
                      </audio>
                    ) : (
                      <p className="text-gray-400 italic">No audio track available.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Questions Panel */}
              <div className="space-y-6 lg:h-[calc(100vh-220px)] lg:overflow-y-auto lg:pr-2 custom-scrollbar">
                <h3 className="mb-2 px-2 text-lg font-extrabold text-gray-900">
                  Multiple Choice Questions
                </h3>

                {currentQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                  >
                    <div className="mb-4 flex items-start gap-4">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50 text-xs font-extrabold text-red-600">
                        {idx + 1}
                      </span>
                      <p className="font-semibold text-gray-900">{q.question}</p>
                    </div>

                    <div className="grid gap-2">
                      {q.options?.map((option, oIdx) => {
                        const letter = getOptionLetter(option, oIdx)
                        const isSelected = userAnswers[q.id] === letter

                        return (
                          <label
                            key={oIdx}
                            className={[
                              'flex cursor-pointer items-start gap-4 rounded-xl border px-4 py-3 transition',
                              isSelected
                                ? 'border-red-200 bg-red-50 ring-1 ring-red-200'
                                : 'border-gray-200 bg-white hover:bg-gray-50',
                            ].join(' ')}
                          >
                            <span
                              className={[
                                'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold',
                                isSelected ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600',
                              ].join(' ')}
                            >
                              {letter}
                            </span>

                            <span
                              className={[
                                'text-sm',
                                isSelected ? 'text-gray-900 font-semibold' : 'text-gray-600',
                              ].join(' ')}
                            >
                              {option}
                            </span>

                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              className="hidden"
                              onChange={() => handleOptionChange(q.id, letter)}
                              checked={isSelected}
                            />
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
      `}</style>
    </div>
  )
}

export default MockTestPlayerPage