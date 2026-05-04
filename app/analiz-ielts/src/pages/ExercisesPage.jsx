import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthProvider'

const SKILL_CONFIG = {
  listening: {
    label: 'Listening Practice',
    description: 'Build your listening skills with focused drills per question type.',
    icon: '🎧',
    color: 'blue',
    drill_types: [
      { key: 'form_completion', label: 'Form Completion', description: 'Fill in missing details from a form.' },
      { key: 'multiple_choice', label: 'Multiple Choice', description: 'Choose the correct answer from options.' },
      { key: 'map_labelling', label: 'Map Labelling', description: 'Label locations on a map or plan.' },
      { key: 'matching', label: 'Matching', description: 'Match items with their descriptions.' },
    ],
  },
  reading: {
    label: 'Reading Practice',
    description: 'Master skimming & scanning across 6 main question types.',
    icon: '📖',
    color: 'teal',
    drill_types: [
      { key: 'multiple_choice', label: 'Multiple Choice', description: 'Choose the correct answer.' },
      { key: 'true_false_ng', label: 'True / False / Not Given', description: 'Identify the writer\'s views.' },
      { key: 'matching_headings', label: 'Matching Headings', description: 'Match headings to paragraphs.' },
      { key: 'short_answer', label: 'Short Answer', description: 'Answer questions briefly.' },
      { key: 'sentence_completion', label: 'Sentence Completion', description: 'Complete sentences from the passage.' },
      { key: 'summary_completion', label: 'Summary Completion', description: 'Fill in a summary of the passage.' },
    ],
  },
  writing: {
    label: 'Writing Practice',
    description: 'Practice essay structure and data interpretation.',
    icon: '✍️',
    color: 'amber',
    drill_types: [
      { key: 'task1_academic', label: 'Task 1: Academic', description: 'Describe a chart, map, or process.' },
      { key: 'task2_essay', label: 'Task 2: Essay', description: 'Write an academic essay.' },
    ],
  },
  vocabulary: {
    label: 'Vocabulary Flashcards',
    description: 'Master high-frequency IELTS words with spaced repetition.',
    icon: '🔤',
    color: 'purple',
    drill_types: [],
  },
}

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-100',  badge: 'bg-blue-100 text-blue-700' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-100',  badge: 'bg-teal-100 text-teal-700' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-100', badge: 'bg-amber-100 text-amber-700' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100',badge: 'bg-purple-100 text-purple-700' },
}

const DIFFICULTY_STYLE = {
  Easy:   'text-green-600 bg-green-50 ring-1 ring-green-200',
  Medium: 'text-amber-600 bg-amber-50 ring-1 ring-amber-200',
  Hard:   'text-red-600 bg-red-50 ring-1 ring-red-200',
}

const ExercisesPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [exercises, setExercises] = useState([])
  const [attempts, setAttempts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedSkill, setExpandedSkill] = useState('listening')
  const [selectedDrillType, setSelectedDrillType] = useState({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        const { data: exData, error: exError } = await supabase
          .from('exercises')
          .select('*')
          .order('set_number', { ascending: true })

        if (exError) throw exError

        let attemptsMap = {}
        if (user) {
          const { data: attData } = await supabase
            .from('exercise_attempts')
            .select('exercise_id, score, total')
            .eq('user_id', user.id)

          if (attData) {
            attData.forEach((a) => {
              attemptsMap[a.exercise_id] = a
            })
          }
        }

        setExercises(exData || [])
        setAttempts(attemptsMap)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // Group exercises by skill → drill_type
  const grouped = {}
  exercises.forEach((ex) => {
    if (!grouped[ex.skill]) grouped[ex.skill] = {}
    if (!grouped[ex.skill][ex.drill_type]) grouped[ex.skill][ex.drill_type] = []
    grouped[ex.skill][ex.drill_type].push(ex)
  })

  const handleDrillTypeSelect = (skill, drillTypeKey) => {
    setSelectedDrillType((prev) => ({
      ...prev,
      [skill]: prev[skill] === drillTypeKey ? null : drillTypeKey,
    }))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
          <p className="font-semibold text-gray-600">Loading exercises...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] p-4">
        <div className="text-center">
          <p className="mb-4 text-red-600">Error: {error}</p>
          <button onClick={() => window.location.reload()} className="rounded-xl bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-gray-900">
      <div className="mx-auto max-w-5xl px-6 py-8 pb-20">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">IELTS Exercises</h1>
            <p className="mt-1 text-sm text-gray-500">
              Targeted practice drills to build your skills outside the 30-day plan.
            </p>
          </div>
          <button
            onClick={() => navigate('/home')}
            className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            ← Home
          </button>
        </div>

        {/* Skill sections */}
        <div className="space-y-4">
          {Object.entries(SKILL_CONFIG).map(([skillKey, config]) => {
            const colors = COLOR_MAP[config.color]
            const isExpanded = expandedSkill === skillKey
            const skillExercises = grouped[skillKey] || {}
            const totalSets = Object.values(skillExercises).flat().length

            return (
              <div
                key={skillKey}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                {/* Skill header — clickable to expand */}
                <button
                  type="button"
                  onClick={() => setExpandedSkill(isExpanded ? null : skillKey)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left transition hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${colors.bg}`}>
                      {config.icon}
                    </div>
                    <div>
                      <div className="font-extrabold text-gray-900">{config.label}</div>
                      <div className="mt-0.5 text-xs text-gray-500">{config.description}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {totalSets > 0 && (
                      <span className={`rounded-lg px-2 py-1 text-xs font-bold ${colors.badge}`}>
                        {totalSets} set{totalSets !== 1 ? 's' : ''}
                      </span>
                    )}
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-6 pb-6 pt-5">

                    {/* Vocabulary — special case, just one CTA */}
                    {skillKey === 'vocabulary' && (
                      <div className="flex flex-col items-center gap-4 py-4 text-center">
                        <p className="text-sm text-gray-500">
                          Swipe through IELTS vocabulary cards. Mark words you know — unknowns repeat until mastered.
                        </p>
                        <button
                          onClick={() => navigate('/vocabulary')}
                          className="rounded-xl bg-purple-600 px-8 py-3 text-sm font-extrabold text-white hover:bg-purple-700"
                        >
                          Start Flashcards →
                        </button>
                      </div>
                    )}

                    {/* Drill type grid */}
                    {skillKey !== 'vocabulary' && config.drill_types.length > 0 && (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {config.drill_types.map((dt) => {
                            const setsForType = skillExercises[dt.key] || []
                            const isSelected = selectedDrillType[skillKey] === dt.key
                            const hasContent = setsForType.length > 0

                            return (
                              <button
                                key={dt.key}
                                type="button"
                                onClick={() => hasContent && handleDrillTypeSelect(skillKey, dt.key)}
                                className={[
                                  'flex items-start justify-between rounded-xl border p-4 text-left transition',
                                  isSelected
                                    ? `${colors.border} ${colors.bg}`
                                    : 'border-gray-200 bg-gray-50 hover:border-gray-300',
                                  !hasContent ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                                ].join(' ')}
                              >
                                <div>
                                  <div className={`text-sm font-bold ${isSelected ? colors.text : 'text-gray-800'}`}>
                                    {dt.label}
                                  </div>
                                  <div className="mt-0.5 text-xs text-gray-500">{dt.description}</div>
                                  {!hasContent && (
                                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                                      Coming soon
                                    </div>
                                  )}
                                </div>
                                {hasContent && (
                                  <span className={`ml-3 mt-0.5 shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${colors.badge}`}>
                                    {setsForType.length}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>

                        {/* Sets list — shown when a drill type is selected */}
                        {selectedDrillType[skillKey] && (
                          <div className="mt-5">
                            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                              Select a set
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {(skillExercises[selectedDrillType[skillKey]] || []).map((ex) => {
                                const attempt = attempts[ex.id]
                                const isDone = !!attempt
                                const scorePercent = attempt?.total
                                  ? Math.round((attempt.score / attempt.total) * 100)
                                  : null

                                return (
                                  <div
                                    key={ex.id}
                                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                                  >
                                    <div className="mb-3 flex items-center justify-between">
                                      <span className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600">
                                        SET {ex.set_number}
                                      </span>
                                      {isDone && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-600">
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                          Done
                                        </span>
                                      )}
                                    </div>

                                    <div className="mb-1 text-sm font-bold text-gray-900">{ex.title}</div>

                                    <div className="mb-4 flex items-center gap-2">
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${DIFFICULTY_STYLE[ex.difficulty]}`}>
                                        {ex.difficulty}
                                      </span>
                                      {scorePercent !== null && (
                                        <span className="text-xs text-gray-500">Score: {scorePercent}%</span>
                                      )}
                                    </div>

                                    <button
                                      onClick={() => navigate(`/exercises/${ex.id}`)}
                                      className={[
                                        'w-full rounded-xl py-2.5 text-sm font-extrabold transition',
                                        isDone
                                          ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                          : 'bg-red-500 text-white hover:bg-red-600',
                                      ].join(' ')}
                                    >
                                      {isDone ? '↺ Retry' : '▶ Start'}
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Skill has no drill types configured */}
                    {skillKey !== 'vocabulary' && config.drill_types.length === 0 && (
                      <p className="py-4 text-center text-sm text-gray-400 italic">Coming soon.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ExercisesPage