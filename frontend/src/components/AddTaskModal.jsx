import { useEffect, useState } from 'react'

const FOCUS_OPTIONS = [
  { key: 'study',      icon: '📚', label: 'Study / Learning' },
  { key: 'fitness',    icon: '💪', label: 'Fitness' },
  { key: 'discipline', icon: '🧠', label: 'Discipline / Focus' },
  { key: 'work',       icon: '💼', label: 'Work / Productivity' },
  { key: 'logic',      icon: '⚡', label: 'Logic' },
]

const CATEGORY_COLORS = {
  study:      { bg: 'bg-blue-50',    border: 'border-blue-200',   text: 'text-blue-700',   dot: '#3b82f6' },
  fitness:    { bg: 'bg-emerald-50', border: 'border-emerald-200',text: 'text-emerald-700',dot: '#10b981' },
  discipline: { bg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-700', dot: '#f97316' },
  work:       { bg: 'bg-violet-50',  border: 'border-violet-200', text: 'text-violet-700', dot: '#8b5cf6' },
  logic:      { bg: 'bg-rose-50',    border: 'border-rose-200',   text: 'text-rose-700',   dot: '#f43f5e' },
  general:    { bg: 'bg-zinc-50',    border: 'border-zinc-200',   text: 'text-zinc-600',   dot: '#a1a1aa' },
}

function getCategoryColor(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.general
}

function getCategoryLabel(cat) {
  return FOCUS_OPTIONS.find((opt) => opt.key === cat)?.label || 'General'
}

/**
 * AddTaskModal
 *
 * Props:
 *   open            – boolean
 *   onClose         – () => void
 *   authedFetch     – the app's authedFetch helper
 *   focusCategory   – user's current focus_category
 *   xpEligibleCount – how many XP-eligible tasks remain today (0-5)
 *   onTaskAdded     – (newUserTask) => void   called after successful creation
 */
function AddTaskModal({ open, onClose, authedFetch, focusCategory, xpEligibleCount, onTaskAdded }) {
  const [tab, setTab] = useState('pool')        // 'pool' | 'custom'
  const [poolCategory, setPoolCategory] = useState(focusCategory || 'discipline')
  const [customCategory, setCustomCategory] = useState(focusCategory || 'discipline')
  const [poolTasks, setPoolTasks] = useState([])
  const [poolLoading, setPoolLoading] = useState(false)
  const [poolError, setPoolError] = useState('')

  const [customTitle, setCustomTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Reset when opened
  useEffect(() => {
    if (!open) return
    setTab('pool')
    setPoolCategory(focusCategory || 'discipline')
    setCustomCategory(focusCategory || 'discipline')
    setCustomTitle('')
    setError('')
    setPoolError('')
  }, [open, focusCategory])

  // Load pool tasks whenever tab is 'pool' or category changes
  useEffect(() => {
    if (!open || tab !== 'pool') return
    let cancelled = false

    async function load() {
      setPoolLoading(true)
      setPoolError('')
      try {
        const data = await authedFetch(`/api/tasks/pool/?category=${poolCategory}`)
        if (!cancelled) setPoolTasks(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) setPoolError(err.message || 'Could not load tasks.')
      } finally {
        if (!cancelled) setPoolLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [open, tab, poolCategory, authedFetch])

  async function handleAddPoolTask(task) {
    setSubmitting(true)
    setError('')
    try {
      const data = await authedFetch('/api/tasks/create/', {
        method: 'POST',
        body: JSON.stringify({ source: 'pool', pool_task_id: task.id }),
      })
      onTaskAdded(data)
      // Remove from the local pool list
      setPoolTasks((prev) => prev.filter((t) => t.id !== task.id))
    } catch (err) {
      setError(err.message || 'Could not add task.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddCustomTask(e) {
    e.preventDefault()
    const title = customTitle.trim()
    if (!title) return
    setSubmitting(true)
    setError('')
    try {
      const data = await authedFetch('/api/tasks/create/', {
        method: 'POST',
        body: JSON.stringify({ source: 'custom', title, category: customCategory }),
      })
      onTaskAdded(data)
      setCustomTitle('')
    } catch (err) {
      setError(err.message || 'Could not add task.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const xpLabel = xpEligibleCount > 0
    ? `${xpEligibleCount} XP slot${xpEligibleCount === 1 ? '' : 's'} left today`
    : 'XP cap reached for today'

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-100 shrink-0">
          <div>
            <h2 className="text-base font-black text-zinc-900">Add a Task</h2>
            <p className={`mt-0.5 text-[10px] font-bold uppercase tracking-wider ${
              xpEligibleCount > 0 ? 'text-emerald-600' : 'text-zinc-400'
            }`}>
              {xpLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:bg-zinc-100"
          >
            ✕
          </button>
        </div>

        {/* XP info banner */}
        <div className={`mx-5 mt-3 rounded-xl px-3 py-2.5 shrink-0 ${
          xpEligibleCount > 0
            ? 'border border-emerald-200 bg-emerald-50'
            : 'border border-zinc-200 bg-zinc-50'
        }`}>
          <p className={`text-[11px] font-semibold leading-relaxed ${
            xpEligibleCount > 0 ? 'text-emerald-800' : 'text-zinc-500'
          }`}>
            {xpEligibleCount > 0
              ? `First 5 tasks each day earn +20 XP. You have ${xpEligibleCount} earning slot${xpEligibleCount === 1 ? '' : 's'} left.`
              : 'You\'ve earned XP from 5 tasks today. Additional tasks won\'t give XP but still count toward your streak.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="mx-5 mt-3 grid grid-cols-2 gap-1 rounded-xl border border-zinc-100 bg-zinc-100 p-1 shrink-0">
          {[
            { key: 'pool',   label: '📋 From Pool' },
            { key: 'custom', label: '✏️ Custom' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setTab(t.key); setError('') }}
              className={`rounded-lg py-2 text-[11px] font-black uppercase tracking-wider transition-all ${
                tab === t.key
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-3 min-h-0">

          {/* ── POOL TAB ── */}
          {tab === 'pool' && (
            <div className="space-y-3">
              {/* Category picker */}
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {FOCUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setPoolCategory(opt.key)}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all ${
                        poolCategory === opt.key
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400'
                      }`}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Task list */}
              {poolLoading ? (
                <div className="space-y-2 pt-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-100" />
                  ))}
                </div>
              ) : poolError ? (
                <p className="py-4 text-center text-xs font-semibold text-red-600">{poolError}</p>
              ) : poolTasks.length === 0 ? (
                <div className="py-6 text-center space-y-1">
                  <p className="text-sm font-black text-zinc-700">All tasks assigned!</p>
                  <p className="text-xs font-semibold text-zinc-400">
                    Every task in this category is already in your list. Try another category or create a custom task.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {poolTasks.length} available
                  </p>
                  {poolTasks.map((task) => {
                    const cc = getCategoryColor(task.category)
                    return (
                      <div
                        key={task.id}
                        className={`flex items-center gap-3 rounded-xl border ${cc.border} ${cc.bg} px-3 py-2.5`}
                      >
                        <div
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: cc.dot }}
                        />
                        <p className={`flex-1 text-sm font-semibold ${cc.text} leading-snug`}>
                          {task.title}
                        </p>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleAddPoolTask(task)}
                          className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-zinc-700 active:scale-95 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── CUSTOM TAB ── */}
          {tab === 'custom' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Category</p>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                    getCategoryColor(customCategory).border
                  } ${getCategoryColor(customCategory).bg} ${
                    getCategoryColor(customCategory).text
                  }`}>
                    {customCategory}
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-zinc-700">
                  {getCategoryLabel(customCategory)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {FOCUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setCustomCategory(opt.key)}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all ${
                        customCategory === opt.key
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400'
                      }`}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-zinc-500 leading-relaxed">
                  Create any task you want. It will be added to today's list. No limit on custom tasks — but only the first 5 completions today earn XP.
                </p>
              </div>

              <form onSubmit={handleAddCustomTask} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Task description
                  </label>
                  <textarea
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Write 500 words of my essay"
                    maxLength={255}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-500 placeholder:text-zinc-300 transition"
                  />
                  <p className="mt-1 text-right text-[10px] font-semibold text-zinc-300">
                    {customTitle.length}/255
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !customTitle.trim()}
                  className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Custom Task'}
                </button>
              </form>

              {/* Examples */}
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Quick examples</p>
                <div className="space-y-1.5">
                  {[
                    'Review my notes for 30 minutes',
                    'Do 3 sets of pull-ups',
                    'No social media until 6pm',
                    'Finish the report draft',
                    'Solve one LeetCode problem',
                  ].map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setCustomTitle(example)}
                      className="w-full rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-left text-[11px] font-semibold text-zinc-600 transition hover:border-zinc-300 hover:bg-white"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error ? (
            <p className="mt-3 text-center text-xs font-semibold text-red-600">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default AddTaskModal
