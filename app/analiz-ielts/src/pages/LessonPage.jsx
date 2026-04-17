import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthProvider'
import ReadingModule from '../modules/ReadingModule'
import ListeningModule from '../modules/ListeningModule'
import VocabularyModule from '../modules/VocabularyModule'
import WritingModule from '../modules/WritingModule'
import SpeakingModule from '../modules/SpeakingModule'
import InfoModule from '../modules/InfoModule'

const LessonPage = () => {
  const { dayNumber } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const currentDay = parseInt(dayNumber, 10)

  const [lesson, setLesson] = useState(null)
  const [completedModules, setCompletedModules] = useState([]) // Array of module keys
  const [selectedModuleKey, setSelectedModuleKey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Fetch Data & Check Locks
  useEffect(() => {
    const fetchData = async () => {
      if (!user || isNaN(currentDay)) return

      try {
        setLoading(true)

        // 1. Check Lock Status (if Day > 1)
        if (currentDay > 1) {
          const { data: prevProgress, error: prevError } = await supabase
            .from('user_progress')
            .select('is_completed')
            .eq('user_id', user.id)
            .eq('day_number', currentDay - 1)
            .single()

          // If previous day not found or not completed, redirect
          if (prevError || !prevProgress?.is_completed) {
            navigate('/plan', { replace: true })
            return
          }
        }

        // 2. Fetch Lesson Data
        const { data: lessonData, error: lessonError } = await supabase
          .from('lessons')
          .select('*')
          .eq('day_number', currentDay)
          .single()

        if (lessonError) throw lessonError

        // 3. Fetch Current Day Progress
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('completed_modules, is_completed')
          .eq('user_id', user.id)
          .eq('day_number', currentDay)
          .maybeSingle()

        if (progressError && progressError.code !== 'PGRST116') throw progressError

        setLesson(lessonData)
        setCompletedModules(progressData?.completed_modules || [])

        // Default to first module if available and none selected
        if (lessonData?.modules && lessonData.modules.length > 0) {
          setSelectedModuleKey(lessonData.modules[0].key)
        }
      } catch (err) {
        console.error('Error fetching lesson:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, currentDay, navigate])

  const handleCompleteSelectedModule = async () => {
    if (!selectedModuleKey || saving) return

    try {
      setSaving(true)

      // Add to local state if not present
      const newCompleted = completedModules.includes(selectedModuleKey)
        ? completedModules
        : [...completedModules, selectedModuleKey]

      setCompletedModules(newCompleted)

      const totalModules = lesson?.modules?.length || 0
      const isDayComplete = newCompleted.length === totalModules

      // Upsert to Supabase
      const { error: upsertError } = await supabase
        .from('user_progress')
        .upsert(
          {
            user_id: user.id,
            day_number: currentDay,
            completed_modules: newCompleted,
            is_completed: isDayComplete,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id, day_number' }
        )

      if (upsertError) throw upsertError

      // Navigation Logic
      if (isDayComplete) {
        navigate('/plan')
      } else {
        // Find next uncompleted module
        const nextUncompleted = lesson.modules.find((m) => !newCompleted.includes(m.key))
        if (nextUncompleted) {
          setSelectedModuleKey(nextUncompleted.key)
          window.scrollTo(0, 0)
        }
      }
    } catch (err) {
      console.error('Error saving progress:', err)
      setError('Failed to save progress')
    } finally {
      setSaving(false)
    }
  }

  const selectedModule = useMemo(
    () => lesson?.modules?.find((m) => m.key === selectedModuleKey),
    [lesson, selectedModuleKey]
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] text-red-500">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-current border-t-transparent" />
          <p className="text-sm font-semibold text-gray-600">Loading lesson...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] p-6 text-gray-900">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600">
            Error: {error}
          </div>
          <button
            onClick={() => navigate('/plan')}
            className="mt-4 inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
          >
            ← Return to Plan
          </button>
        </div>
      </div>
    )
  }

  if (!lesson) return null

  const totalModules = lesson.modules?.length || 0
  const progressPercent =
    totalModules > 0 ? Math.round((completedModules.length / totalModules) * 100) : 0

  // Determine module type
  const moduleType = (selectedModule?.type || lesson.skill || '').toLowerCase()

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-gray-900">
      <div className="mx-auto max-w-6xl px-6 py-7">
        {/* Top bar */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => navigate('/plan')}
            className="inline-flex w-fit items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
          >
            ← Back
          </button>

          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm">
              Day {currentDay}
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              {completedModules.length}/{totalModules} modules done
            </div>
          </div>
        </div>

        {/* Shell */}
        <div className="grid gap-6 md:grid-cols-[320px_1fr]">
          {/* Sidebar */}
          <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:sticky md:top-6">
            <div className="mb-5">
              <div className="text-xs font-bold tracking-wide text-red-500">
                DAY {String(currentDay).padStart(2, '0')}
              </div>
              <h1 className="mt-1 text-lg font-extrabold leading-snug text-gray-900">
                {lesson.title}
              </h1>

              <div className="mt-2 inline-flex items-center rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                {lesson.skill}
              </div>
            </div>

            {/* Progress */}
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-600">
                <span>Progress</span>
                <span className="text-gray-700">{progressPercent}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-red-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Module list */}
            <nav className="space-y-2">
              {lesson.modules?.map((module) => {
                const isFinished = completedModules.includes(module.key)
                const isActive = selectedModuleKey === module.key

                return (
                  <button
                    key={module.key}
                    onClick={() => setSelectedModuleKey(module.key)}
                    className={[
                      'flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition',
                      isActive
                        ? 'border border-red-100 bg-red-50 text-gray-900'
                        : 'border border-transparent bg-white text-gray-700 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{module.title}</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-gray-400">
                        {isFinished ? 'COMPLETED' : isActive ? 'IN PROGRESS' : 'UPCOMING'}
                      </div>
                    </div>

                    {isFinished ? (
                      <span className="ml-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-50 text-green-600">
                        ✓
                      </span>
                    ) : (
                      <span className="ml-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                        →
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* Main */}
          <main className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mx-auto max-w-4xl">
              {selectedModule ? (
                <div className="space-y-8">
                  {/* Title */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-xs font-bold tracking-wide text-gray-400">MODULE</div>
                      <h2 className="mt-1 text-xl font-extrabold text-gray-900">
                        {selectedModule.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      {completedModules.includes(selectedModule.key) ? (
                        <span className="inline-flex items-center rounded-xl bg-green-50 px-3 py-2 text-xs font-bold text-green-700">
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="min-h-[300px]">
                    {moduleType === 'reading' ? (
                      <ReadingModule
                        module={selectedModule}
                        onCompleteModule={handleCompleteSelectedModule}
                      />
                    ) : moduleType === 'listening' ? (
                      <ListeningModule
                        module={selectedModule}
                        onCompleteModule={handleCompleteSelectedModule}
                      />
                    ) : moduleType === 'vocabulary' ? (
                      <VocabularyModule
                        module={selectedModule}
                        onCompleteModule={handleCompleteSelectedModule}
                      />
                    ) : moduleType === 'writing' ? (
                      <WritingModule
                        module={selectedModule}
                        dayNumber={lesson.day_number || currentDay}
                        onCompleteModule={handleCompleteSelectedModule}
                      />
                    ) : moduleType === 'speaking' ? (
                      <SpeakingModule
                        module={selectedModule}
                        dayNumber={lesson.day_number || currentDay}
                        onCompleteModule={handleCompleteSelectedModule}
                      />
                    ) : moduleType === 'info' ? (
                      <InfoModule
  key={selectedModule.key}
  module={selectedModule}
  onCompleteModule={handleCompleteSelectedModule}
/>
                    ) : (
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8">
                        <div className="text-lg font-bold text-gray-900">{selectedModule.title}</div>
                        <div className="mt-4 flex h-48 items-center justify-center rounded-xl bg-white text-gray-400 italic ring-1 ring-gray-200">
                          Content coming soon...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Completion Button (kept from your original page) */}
                  <div className="flex justify-end border-t border-gray-200 pt-6">
                    <button
                      onClick={handleCompleteSelectedModule}
                      disabled={saving}
                      className={[
                        'rounded-xl px-6 py-3 text-sm font-extrabold shadow-sm transition',
                        saving ? 'cursor-not-allowed opacity-70' : '',
                        completedModules.includes(selectedModule.key)
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-red-500 text-white hover:bg-red-600',
                      ].join(' ')}
                    >
                      {saving
                        ? 'Saving...'
                        : completedModules.includes(selectedModule.key)
                        ? 'Completed ✅'
                        : 'Mark Module Completed'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex h-[420px] items-center justify-center text-gray-400">
                  Select a module to begin
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default LessonPage