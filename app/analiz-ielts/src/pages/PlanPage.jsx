import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthProvider'

const PlanPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [lessons, setLessons] = useState([])
  const [completedDayIds, setCompletedDayIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // UI-only (does NOT change any functionality)
  const [activeTab, setActiveTab] = useState('inprogress')

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        setLoading(true)

        // Fetch lessons ordered by day_number
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .order('day_number', { ascending: true })

        if (lessonsError) throw lessonsError

        // Fetch user progress for current user
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('day_number, is_completed')
          .eq('user_id', user.id)
          .eq('is_completed', true)

        if (progressError) throw progressError

        setLessons(lessonsData || [])
        setCompletedDayIds(new Set((progressData || []).map((p) => p.day_number)))
      } catch (err) {
        setError(err.message || 'Something went wrong.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // Generate 30 days grid (SAME logic)
  const days = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const dayNum = i + 1
      const lesson = lessons.find((l) => l.day_number === dayNum)
      return {
        dayNumber: dayNum,
        title: lesson?.title || `Day ${dayNum} Lesson`,
        lesson,
      }
    })
  }, [lessons])

  const completedCount = completedDayIds.size
  const progressPercent = Math.round((completedCount / 30) * 100)

  // UI-only: streak derived from consecutive completion from Day 1
  const currentStreak = useMemo(() => {
    let streak = 0
    for (let d = 1; d <= 30; d++) {
      if (completedDayIds.has(d)) streak++
      else break
    }
    return streak
  }, [completedDayIds])

  const inferModule = (title) => {
    const t = (title || '').toLowerCase()
    if (t.includes('listening')) return 'Listening'
    if (t.includes('reading')) return 'Reading'
    if (t.includes('writing')) return 'Writing'
    if (t.includes('speaking')) return 'Speaking'
    if (t.includes('vocab')) return 'Vocab'
    if (t.includes('review') || t.includes('practice')) return 'Full Test'
    return 'Lesson'
  }

  const inferMinutes = (lesson, title) => {
    const possible =
      lesson?.duration_minutes ??
      lesson?.duration ??
      lesson?.minutes ??
      lesson?.estimated_minutes ??
      null

    if (typeof possible === 'number' && Number.isFinite(possible)) {
      return Math.max(5, Math.round(possible))
    }

    const mod = inferModule(title)
    if (mod === 'Full Test') return 120
    if (mod === 'Writing') return 90
    return 40
  }

  const IconCheck = ({ muted = false }) => (
    <div
      className={[
        'flex h-9 w-9 items-center justify-center rounded-full',
        muted ? 'bg-gray-100' : 'bg-green-50',
      ].join(' ')}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 6L9 17l-5-5"
          stroke={muted ? '#9CA3AF' : '#22C55E'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )

  const IconLock = () => (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M7 11V8a5 5 0 0110 0v3"
          stroke="#9CA3AF"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M7 11h10v9H7z"
          stroke="#9CA3AF"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )

  const IconProgress = () => (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 7v5l3 2"
          stroke="#EF4444"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M21 12a9 9 0 11-9-9"
          stroke="#EF4444"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] text-blue-600">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-current border-t-transparent" />
          <p className="font-semibold text-gray-700">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] p-4 text-gray-900">
        <div className="text-center">
          <p className="mb-4 text-red-600">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-gray-900">
      <div className="mx-auto max-w-6xl px-6 py-7 pb-20">
        {/* Top Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                30-Day Study Plan
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Master all IELTS modules with a structured daily routine.
              </p>
            </div>

            {/* Streak badge (UI-only) */}
            <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              CURRENT STREAK: {currentStreak} DAYS 🔥
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  ▦
                </span>
                Overall Progress
              </div>
              <div className="text-sm font-semibold text-gray-700">
                {completedCount} / 30 Days Completed
              </div>
            </div>

            <div className="mt-3">
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-red-500 transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                <span>Day 1</span>
                <span className="text-red-500">{progressPercent}% through your journey</span>
                <span>Day 30</span>
              </div>
            </div>
          </div>
        </div>

        {/* Curriculum Header */}
        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Your Curriculum</h2>

          <div className="flex items-center gap-2 rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                activeTab === 'all'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-800',
              ].join(' ')}
            >
              All Days
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inprogress')}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                activeTab === 'inprogress'
                  ? 'bg-red-500 text-white'
                  : 'text-gray-500 hover:text-gray-800',
              ].join(' ')}
            >
              In Progress
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {days
            .filter((day, idx) => {
              // Optional UI filtering, no navigation logic changes:
              if (activeTab === 'all') return true
              // inprogress view: show first 8 tiles like screenshot feel
              return idx < 8
            })
            .map((day, idx) => {
              const isCompleted = completedDayIds.has(day.dayNumber)
              const isUnlocked =
                day.dayNumber === 1 || completedDayIds.has(day.dayNumber - 1)

              // "In progress" = first unlocked but not completed day
              const isInProgress =
                isUnlocked &&
                !isCompleted &&
                !days.slice(0, idx).some((d2) => {
                  const done2 = completedDayIds.has(d2.dayNumber)
                  const unlocked2 = d2.dayNumber === 1 || completedDayIds.has(d2.dayNumber - 1)
                  return unlocked2 && !done2
                })

              const status = isCompleted ? 'COMPLETED' : isInProgress ? 'IN PROGRESS' : 'UPCOMING'
              const module = inferModule(day.title)
              const minutes = inferMinutes(day.lesson, day.title)

              // UI-only: plus tile after 8 cards (like screenshot)
              const remaining = Math.max(0, 30 - completedCount)
              const isPlusTile = activeTab === 'inprogress' && idx === 7

              if (isPlusTile) {
                return (
                  <div
                    key="plus-tile"
                    className="flex min-h-[138px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/60 text-center"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                      +
                    </div>
                    <div className="mt-3 text-xs font-semibold text-gray-500">
                      View remaining {remaining} days
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={day.dayNumber}
                  onClick={() => isUnlocked && navigate(`/lesson/${day.dayNumber}`)}
                  className={[
                    'group relative min-h-[138px] rounded-2xl border bg-white p-4 shadow-sm transition',
                    isUnlocked ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed opacity-60',
                    isInProgress ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-200',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      {isCompleted ? <IconCheck /> : !isUnlocked ? <IconLock /> : isInProgress ? <IconProgress /> : <IconCheck muted />}
                    </div>

                    <div
                      className={[
                        'text-[10px] font-bold tracking-wide',
                        isCompleted ? 'text-gray-300' : isInProgress ? 'text-red-500' : 'text-gray-300',
                      ].join(' ')}
                    >
                      {status}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs font-bold text-red-500">
                      DAY {String(day.dayNumber).padStart(2, '0')}
                    </div>

                    <div
                      className={[
                        'mt-1 text-sm font-bold leading-snug',
                        isUnlocked ? 'text-gray-900' : 'text-gray-400',
                      ].join(' ')}
                    >
                      {day.title}
                    </div>

                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M12 7v5l3 2" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M21 12a9 9 0 11-9-9" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span>{minutes}m</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M4 19V5a2 2 0 012-2h10a2 2 0 012 2v14" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
                          <path d="M8 7h8M8 11h8M8 15h6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span>{module}</span>
                      </div>
                    </div>

                    {isInProgress && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/lesson/${day.dayNumber}`)
                        }}
                        className="mt-4 w-full rounded-xl bg-red-500 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-600"
                      >
                        Continue Lesson
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
        </div>

        {/* Bottom CTA banner (visual only) */}
        <div className="mt-8 overflow-hidden rounded-2xl bg-gradient-to-r from-[#2b1337] via-[#1a1d3a] to-[#0b1b3b] p-6 text-white shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-extrabold">Need help with your Writing task?</h3>
              <p className="mt-1 max-w-xl text-sm text-white/70">
                Get personalized feedback on your essays from our IELTS experts in less than 24 hours.
              </p>

              <button
                type="button"
                className="mt-4 rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600"
              >
                Get Feedback Now
              </button>
            </div>

            <div className="hidden sm:block">
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-sm font-extrabold">
                    7.5
                  </div>
                  <div>
                    <div className="text-xs text-white/70">Estimated Score</div>
                    <div className="text-sm font-bold">Writing Task 2</div>
                  </div>
                </div>
                <div className="mt-3 h-2 w-56 rounded-full bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlanPage