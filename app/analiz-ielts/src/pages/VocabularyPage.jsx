import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthProvider'

// ─── FlashCard (modern animated) ─────────────────────────────────────────────

const FlashCard = ({ word, definition, example, flipped, onFlip, animate }) => (
  <div
    onClick={onFlip}
    className={`w-full max-w-lg mx-auto cursor-pointer transform transition-all duration-300 
    ${animate === 'right' ? 'translate-x-10 opacity-0 scale-95' : ''}
    ${animate === 'left' ? '-translate-x-10 opacity-0 scale-95' : ''}
    ${animate === 'idle' ? 'translate-x-0 opacity-100 scale-100' : ''}`}
  >
    {!flipped ? (
      <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition">
        <div className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
          Word
        </div>
        <div className="text-4xl font-extrabold text-gray-900 text-center break-words">
          {word}
        </div>
        <div className="mt-6 text-xs text-gray-400">
          Tap to reveal definition
        </div>
      </div>
    ) : (
      <div className="flex h-72 flex-col rounded-2xl border border-purple-100 bg-purple-50 p-6 shadow-sm">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-purple-400 text-center">
          Definition
        </div>

        <div className="flex-1 overflow-y-auto text-center">
          <div className="text-base font-semibold text-gray-900 leading-snug">
            {definition}
          </div>

          {example && (
            <div className="mt-4 rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm italic text-gray-500">
              "{example}"
            </div>
          )}
        </div>
      </div>
    )}
  </div>
)

// ─── Progress Ring ───────────────────────────────────────────────────────────

const ProgressRing = ({ known, total }) => {
  const pct = total > 0 ? Math.round((known / total) * 100) : 0
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="flex flex-col items-center">
      <svg width="72" height="72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#eee" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="#a855f7"
          strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
        <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="700">
          {pct}%
        </text>
      </svg>
      <div className="text-xs text-gray-500">{known}/{total} known</div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const VocabularyPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [allWords, setAllWords] = useState([])
  const [progressMap, setProgressMap] = useState({})
  const [deck, setDeck] = useState([])
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [animate, setAnimate] = useState('idle')

  useEffect(() => {
    const fetchData = async () => {
      const { data: words } = await supabase.from('vocabulary_words').select('*')

      let progMap = {}
      if (user) {
        const { data: prog } = await supabase
          .from('vocabulary_progress')
          .select('*')
          .eq('user_id', user.id)

        prog?.forEach(p => (progMap[p.word_id] = p))
      }

      setAllWords(words || [])
      setProgressMap(progMap)

      const unknown = (words || []).filter(w => !progMap[w.id]?.known)
      setDeck(unknown)

      setLoading(false)
    }

    fetchData()
  }, [user])

  const currentCard = deck[0]

  const knownCount = Object.values(progressMap).filter(p => p.known).length
  const remainingCount = allWords.length - knownCount

  const advance = (direction, wasKnown) => {
    setAnimate(direction)

    setTimeout(() => {
      setFlipped(false)

      setDeck(prev => {
        let next = [...prev]
        const card = next.shift()

        if (!wasKnown) next.push(card)

        return next
      })

      setAnimate('idle')
    }, 250)
  }

  const handleKnown = (e) => {
    e.stopPropagation()

    setProgressMap(prev => ({
      ...prev,
      [currentCard.id]: { known: true }
    }))

    advance('right', true)
  }

  const handleUnknown = (e) => {
    e.stopPropagation()
    advance('left', false)
  }

  if (loading) return <div className="p-10 text-center">Loading...</div>

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-gray-900">
      <div className="mx-auto max-w-2xl px-6 py-8">

        {/* Header */}
        <div className="mb-8 flex justify-between">
          <div>
            <h1 className="text-xl font-extrabold">Vocabulary Flashcards</h1>
            <p className="text-sm text-gray-500">Master high-frequency IELTS words</p>
          </div>
          <button onClick={() => navigate('/exercises')}>
            ← Back
          </button>
        </div>

        {/* Stats */}
        <div className="mb-8 flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm">
          <ProgressRing known={knownCount} total={allWords.length} />

          <div className="flex gap-6 text-center">
            <div>
              <div className="text-2xl font-extrabold">{allWords.length}</div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-green-600">{knownCount}</div>
              <div className="text-xs text-gray-400">Mastered</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-amber-600">{remainingCount}</div>
              <div className="text-xs text-gray-400">Remaining</div>
            </div>
          </div>
        </div>

        {/* Card */}
        {currentCard && (
          <>
            <FlashCard
              word={currentCard.word}
              definition={currentCard.definition}
              example={currentCard.example_sentence}
              flipped={flipped}
              onFlip={() => setFlipped(f => !f)}
              animate={animate}
            />

            {flipped && (
              <div className="mt-6 flex gap-4">
                <button
                  onClick={handleUnknown}
                  className="flex-1 border-2 border-red-300 py-4 rounded-xl font-bold hover:bg-red-50 transition"
                >
                  Didn't Know
                </button>
                <button
                  onClick={handleKnown}
                  className="flex-1 bg-green-500 text-white py-4 rounded-xl font-bold hover:bg-green-600 transition"
                >
                  I Knew It
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}

export default VocabularyPage