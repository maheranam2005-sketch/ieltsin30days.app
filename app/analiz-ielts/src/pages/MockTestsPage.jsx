import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthProvider'

const MockTestsPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tests, setTests] = useState([])
  const [attempts, setAttempts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        setLoading(true)

        const { data: testsData, error: testsError } = await supabase
          .from('mock_tests')
          .select('id, title, description, created_at')
          .order('created_at', { ascending: false })

        if (testsError) throw testsError

        const { data: attemptsData, error: attemptsError } = await supabase
          .from('mock_attempts')
          .select('mock_test_id, score, total, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (attemptsError) throw attemptsError

        const attemptsMap = (attemptsData || []).reduce((acc, attempt) => {
          if (!acc[attempt.mock_test_id]) acc[attempt.mock_test_id] = []
          acc[attempt.mock_test_id].push(attempt)
          return acc
        }, {})

        setTests(testsData || [])
        setAttempts(attemptsMap)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] text-red-500">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-current border-t-transparent" />
          <p className="text-sm font-semibold text-gray-600">Loading tests...</p>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen bg-[#f6f7fb] px-6 py-12 text-gray-900">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
            Mock Tests
          </h1>
          <p className="mt-2 text-lg text-gray-500">
            Challenge yourself with full-length IELTS practice exams.
          </p>
        </header>

        {error && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600 shadow-sm">
            {error}
          </div>
        )}

        {tests.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white shadow-sm">
            <p className="text-lg italic text-gray-500">
              No mock tests available yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {tests.map((test) => {
              const testAttempts = attempts[test.id] || []

              const bestScore =
                testAttempts.length > 0
                  ? Math.max(
                      ...testAttempts.map(
                        (a) => (a.score / (a.total || 1)) * 100
                      )
                    )
                  : null

              return (
                <div
                  key={test.id}
                  onClick={() => navigate(`/mock-tests/${test.id}`)}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl border border-gray-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  {/* Top Row */}
                  <div className="mb-4 flex items-center justify-between">
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-600">
                      IELTS Exam
                    </span>

                    {bestScore !== null && (
                      <div className="text-xs font-bold text-green-600">
                        Best: {Math.round(bestScore)}%
                      </div>
                    )}
                  </div>

                  <h2 className="mb-3 text-2xl font-extrabold text-gray-900 transition group-hover:text-red-600">
                    {test.title}
                  </h2>

                  <p className="mb-6 line-clamp-2 text-sm leading-relaxed text-gray-500">
                    {test.description}
                  </p>

                  {/* Attempt History */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      Attempt History
                    </h3>

                    {testAttempts.length > 0 ? (
                      <div className="space-y-2">
                        {testAttempts.slice(0, 3).map((attempt, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                          >
                            <span className="text-gray-500">
                              {new Date(
                                attempt.created_at
                              ).toLocaleDateString()}
                            </span>

                            <span className="font-extrabold text-gray-900">
                              {attempt.score} / {attempt.total}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs italic text-gray-400">
                        No attempts yet.
                      </p>
                    )}
                  </div>

                  {/* Subtle hover glow */}
                  <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-transparent transition group-hover:ring-red-200" />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default MockTestsPage