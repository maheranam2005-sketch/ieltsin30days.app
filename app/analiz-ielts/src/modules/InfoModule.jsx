import { useState } from 'react'

const InfoModule = ({ module, onCompleteModule }) => {
  const content = module?.content || {}
  const overview = content.overview || []
  const expand = content.expand || []
  const drills = content.drills || []

  return (
    <div className="space-y-6">
      {/* Overview */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] font-bold tracking-wide text-gray-400">OVERVIEW</div>
        {overview.length ? (
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-800">
            {overview.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 text-sm text-gray-500 italic">No overview yet.</div>
        )}
      </section>

      {/* Expand / Deep learn */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] font-bold tracking-wide text-gray-400">DEEP LEARN</div>
        {expand.length ? (
          <div className="mt-4 space-y-4">
            {expand.map((block, i) => (
              <div key={i} className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
                {block.title ? (
                  <div className="text-sm font-extrabold text-gray-900">{block.title}</div>
                ) : null}

                {block.imageUrl ? (
  <img
    src={block.imageUrl}
    alt={block.imageAlt || 'reference'}
    className="mt-3 w-full rounded-xl border border-gray-200 bg-white"
  />
) : null}

                {block.points?.length ? (
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-gray-800">
                    {block.points.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-2 text-sm text-gray-500 italic">No points.</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-gray-500 italic">No deep learn section yet.</div>
        )}
      </section>

      {/* Drills */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] font-bold tracking-wide text-gray-400">DRILLS</div>

        {drills.length ? (
          <div className="mt-4 space-y-4">
          {drills.map((d, i) => (
  <DrillCard key={`${module.key}-drill-${i}`} drill={d} index={i} />
))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-gray-500 italic">No drills yet.</div>
        )}
      </section>

      {/* Completion */}
      <div className="flex justify-end">
        <button
          onClick={onCompleteModule}
          className="rounded-xl bg-green-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-green-700"
        >
          Mark Module Completed
        </button>
      </div>
    </div>
  )
}

const DrillCard = ({ drill, index }) => {
  // Two drill types supported:
  // 1) mcq: { type:'mcq', question, options[], answerIndex, feedback }
  // 2) reflection: { type:'reflection', question, placeholder }
  const type = drill?.type || 'mcq'

  const [picked, setPicked] = useState(null)
  const [checked, setChecked] = useState(false)
  const [text, setText] = useState('')

  if (type === 'reflection') {
    return (
      <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
        <div className="mb-2 text-xs font-bold text-gray-500">DRILL {index + 1}</div>
        <div className="text-sm font-extrabold text-gray-900">{drill.question}</div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={drill.placeholder || 'Write your answer here...'}
          className="mt-3 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 outline-none focus:ring-4 focus:ring-red-500/15"
          rows={4}
        />

        <div className="mt-2 text-xs text-gray-500">
          (This one is self-check. Just write honestly.)
        </div>
      </div>
    )
  }

  const correctIndex = Number(drill.answerIndex)

  return (
    <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
      <div className="mb-2 text-xs font-bold text-gray-500">DRILL {index + 1}</div>
      <div className="text-sm font-extrabold text-gray-900">{drill.question}</div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(drill.options || []).map((opt, i) => {
          const selected = picked === i

          let cls = 'border-gray-200 bg-white hover:bg-gray-50'
          if (checked) {
            if (i === correctIndex) cls = 'border-green-200 bg-green-50 ring-1 ring-green-200'
            else if (selected && i !== correctIndex)
              cls = 'border-red-200 bg-red-50 ring-1 ring-red-200'
            else cls = 'border-gray-200 bg-white opacity-60'
          } else if (selected) {
            cls = 'border-red-200 bg-red-50 ring-1 ring-red-200'
          }

          return (
            <button
              key={i}
              onClick={() => {
                if (checked) return
                setPicked(i)
              }}
              className={[
                'rounded-xl border p-3 text-left text-sm font-semibold text-gray-700 transition',
                cls,
              ].join(' ')}
            >
              {opt}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => setChecked(true)}
          disabled={picked === null || checked}
          className={[
            'rounded-xl px-4 py-2 text-sm font-extrabold text-white shadow-sm',
            picked === null || checked ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600',
          ].join(' ')}
        >
          Check Answer
        </button>

        {checked && (
          <div className={picked === correctIndex ? 'text-green-700 font-bold text-sm' : 'text-red-700 font-bold text-sm'}>
            {picked === correctIndex ? 'Correct ✅' : `Wrong ❌ Correct: ${drill.options[correctIndex]}`}
          </div>
        )}
      </div>

      {checked && drill.feedback ? (
        <div className="mt-3 rounded-xl bg-white p-3 text-sm text-gray-700 ring-1 ring-gray-200">
          {drill.feedback}
        </div>
      ) : null}
    </div>
  )
}

export default InfoModule