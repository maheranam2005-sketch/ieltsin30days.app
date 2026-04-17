import { useState, useEffect } from 'react'
import { SpeakerWaveIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'

const VocabularyModule = ({ module, onCompleteModule }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Reset index when module changes
  useEffect(() => {
    setCurrentIndex(0)
  }, [module])

  const speak = (text) => {
    if (!text || isSpeaking) return

    setIsSpeaking(true)
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.onend = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  const handleNext = () => {
    if (currentIndex < (module?.cards?.length || 0) - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const hasContent = module && module.cards && module.cards.length > 0
  const currentCard = hasContent ? module.cards[currentIndex] : null

  if (!hasContent) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <p className="text-lg font-extrabold text-gray-900">Content coming soon</p>
          <p className="mt-1 text-sm text-gray-500">No vocabulary cards added yet.</p>
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
      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold tracking-wide text-gray-600">
          FLASHCARD
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-extrabold text-gray-700 shadow-sm">
          <span className="font-mono">
            {currentIndex + 1} / {module.cards.length}
          </span>
        </div>
      </div>

      {/* Card */}
      <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-7 text-center shadow-sm">
        {/* subtle top glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-red-50 to-transparent" />

        {/* Word & Pronunciation */}
        <div className="relative flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              {currentCard.word}
            </h2>

            <button
              onClick={() => speak(currentCard.word)}
              disabled={isSpeaking}
              className={[
                'rounded-full border p-2 transition active:scale-95',
                isSpeaking
                  ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                  : 'border-red-100 bg-red-50 text-red-600 hover:bg-red-100',
              ].join(' ')}
              title="Listen to pronunciation"
            >
              <SpeakerWaveIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Meaning */}
          <div className="mt-4 w-full max-w-md">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="text-[11px] font-bold tracking-wide text-gray-400">
                MEANING (BN)
              </div>
              <p className="mt-1 text-2xl font-extrabold text-gray-900">
                {currentCard.meaning_bn}
              </p>
            </div>
          </div>

          {/* Example */}
          {currentCard.example && (
            <div className="mt-4 max-w-xl">
              <div className="text-[11px] font-bold tracking-wide text-gray-400">
                EXAMPLE
              </div>
              <p className="mt-1 text-sm font-semibold italic text-gray-600">
                “{currentCard.example}”
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={[
            'group inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold shadow-sm ring-1 transition',
            currentIndex === 0
              ? 'cursor-not-allowed bg-white text-gray-300 ring-gray-200'
              : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50',
          ].join(' ')}
        >
          <ChevronLeftIcon className="h-5 w-5 transition group-hover:-translate-x-0.5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <button
          onClick={handleNext}
          disabled={currentIndex === module.cards.length - 1}
          className={[
            'group inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold shadow-sm ring-1 transition',
            currentIndex === module.cards.length - 1
              ? 'cursor-not-allowed bg-white text-gray-300 ring-gray-200'
              : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50',
          ].join(' ')}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRightIcon className="h-5 w-5 transition group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Completion */}
      <div className="sticky bottom-4 rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-end">
          <button
            onClick={onCompleteModule}
            className="rounded-xl bg-green-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-green-700"
          >
            Mark Module Completed
          </button>
        </div>
      </div>
    </div>
  )
}

export default VocabularyModule