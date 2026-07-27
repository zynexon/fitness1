// frontend/src/components/TaskCard.jsx

const CATEGORY_CONFIG = {
  study:      { color: 'bg-blue-500',    light: 'bg-blue-50 text-blue-700 border-blue-200',    label: 'Study',      dot: '#3b82f6' },
  fitness:    { color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Fitness',    dot: '#10b981' },
  discipline: { color: 'bg-orange-500',  light: 'bg-orange-50 text-orange-700 border-orange-200',  label: 'Discipline', dot: '#f97316' },
  work:       { color: 'bg-violet-500',  light: 'bg-violet-50 text-violet-700 border-violet-200',  label: 'Work',       dot: '#8b5cf6' },
  logic:      { color: 'bg-rose-500',    light: 'bg-rose-50 text-rose-700 border-rose-200',    label: 'Logic',      dot: '#f43f5e' },
  general:    { color: 'bg-zinc-400',    light: 'bg-zinc-100 text-zinc-600 border-zinc-200',   label: 'General',    dot: '#a1a1aa' },
}

function getCategoryConfig(category) {
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general
}

function TaskCard({ task, onComplete, onDelete, isJustCompleted }) {
  const cat = getCategoryConfig(task.category)

  return (
    <article
      className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 ${
        task.completed
          ? 'border-zinc-200 bg-zinc-50/80 opacity-70'
          : 'border-zinc-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] active:scale-[0.98]'
      }`}
    >
      {/* Category accent bar — left edge */}
      <div
        className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl transition-opacity duration-300 ${cat.color} ${
          task.completed ? 'opacity-30' : 'opacity-100'
        }`}
      />

      <div className="flex items-center justify-between gap-3 px-4 py-3.5 pl-5">
        {/* Left: check + text */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Completion indicator */}
          {task.completed ? (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-white">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.815a.75.75 0 011.05-.145z" clipRule="evenodd" />
              </svg>
            </div>
          ) : (
            <div
              className="h-6 w-6 shrink-0 rounded-full border-2 border-zinc-300 transition-colors group-hover:border-zinc-400"
              style={{ borderColor: task.completed ? undefined : cat.dot + '66' }}
            />
          )}

          {/* Task name + category pill */}
          <div className="min-w-0">
            <p className={`text-sm font-bold leading-snug transition-all ${
              task.completed ? 'text-zinc-400 line-through decoration-zinc-300' : 'text-zinc-900'
            }`}>
              {task.name}
            </p>
            <div className="mt-1 flex items-center gap-2">
              {/* Category pill */}
              <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${cat.light}`}>
                <span className="h-1 w-1 rounded-full" style={{ background: cat.dot }} />
                {cat.label}
              </span>
              {/* XP badge */}
              <span className={`text-[10px] font-black tracking-wide ${
                task.completed ? 'text-zinc-400' : 'text-zinc-500'
              }`}>
                +{task.xp} XP
              </span>
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {task.is_custom && !task.completed && (
            <button
              type="button"
              onClick={() => onDelete && onDelete(task)}
              className="shrink-0 rounded-xl border border-red-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-red-600 transition-all hover:border-red-300 hover:bg-red-50 active:scale-95"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={() => onComplete(task)}
            disabled={task.completed}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 ${
              task.completed
                ? 'pointer-events-none bg-transparent text-transparent'
                : 'bg-zinc-900 text-white hover:bg-zinc-700'
            }`}
          >
            {task.completed ? '' : 'Done'}
          </button>
        </div>
      </div>

      {/* XP float animation */}
      {isJustCompleted && (
        <div className="pointer-events-none absolute right-14 top-1/2 -translate-y-1/2 z-20 animate-float-up text-sm font-black drop-shadow-md"
          style={{ color: cat.dot }}>
          +{task.xp} XP
        </div>
      )}
    </article>
  )
}

export default TaskCard
export { getCategoryConfig }
