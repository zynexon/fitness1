// frontend/src/components/pages/TasksPage.jsx
import { useMemo } from 'react'
import TaskCard, { getCategoryConfig } from '../TaskCard'

const XP_ELIGIBLE_TASK_COUNT = 5
const TASK_XP_AMOUNT = 20

// ─── Progress Ring ────────────────────────────────────────────────────────────
function ProgressRing({ completed, total }) {
  const radius = 44
  const stroke = 6
  const normalRadius = radius - stroke / 2
  const circumference = 2 * Math.PI * normalRadius
  const pct = total > 0 ? completed / total : 0
  const dashOffset = circumference * (1 - pct)
  const isDone = completed === total && total > 0

  return (
    <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={normalRadius} fill="none" stroke="#e4e4e7" strokeWidth={stroke} />
        <circle
          cx="50" cy="50" r={normalRadius}
          fill="none"
          stroke="#111827"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isDone ? (
          <span className="text-2xl leading-none">🏆</span>
        ) : (
          <>
            <span className="text-xl font-black leading-none text-zinc-900">{completed}</span>
            <span className="text-[10px] font-bold text-zinc-400">of {total}</span>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Morning countdown ────────────────────────────────────────────────────────
function getMorningCountdown() {
  const now = new Date()
  const hours = now.getHours()
  if (hours >= 10) return null
  const target = new Date(now)
  target.setHours(10, 0, 0, 0)
  const diffMs = target - now
  const diffMins = Math.floor(diffMs / 60000)
  const h = Math.floor(diffMins / 60)
  const m = diffMins % 60
  if (h > 0) return `${h}h ${m}m left`
  return `${m}m left`
}

// ─── XP earned today from tasks ───────────────────────────────────────────────
function getXpEarnedToday(tasks) {
  const completedCount = tasks.filter((t) => t.completed).length
  const xpEarningCompletions = Math.min(completedCount, XP_ELIGIBLE_TASK_COUNT)
  return xpEarningCompletions * TASK_XP_AMOUNT
}

// ─── Day won state ────────────────────────────────────────────────────────────
function DayWonState({ streakDays, xpEarned, totalTasks, onChangeFocus, onAddTask }) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6 text-center relative overflow-hidden md:max-w-2xl md:mx-auto w-full">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04] select-none">
          <span className="text-[120px] font-black text-white leading-none">W</span>
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">Today</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight text-white">Day Won.</h2>
          <p className="mt-2 text-sm font-semibold text-zinc-400 leading-relaxed">
            First 5 tasks cleared. The streak lives.
          </p>
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-black text-white">+{xpEarned}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">XP Today</p>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div className="text-center">
              <p className="text-2xl font-black text-white">🔥 {streakDays}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Day Streak</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-center shadow-sm">
        <p className="text-sm font-bold text-zinc-700">5 XP tasks done. Extra tasks earn no XP today.</p>
        <p className="mt-0.5 text-xs font-semibold text-zinc-400">Come back tomorrow for new XP slots.</p>
      </div>

      {/* Still allow adding more tasks even after winning */}
      <button
        type="button"
        onClick={onAddTask}
        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-600 transition hover:bg-zinc-50 flex items-center justify-center gap-2"
      >
        <span className="text-sm">＋</span> Add More Tasks (no XP)
      </button>

      {onChangeFocus && (
        <button
          type="button"
          onClick={onChangeFocus}
          className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-600 transition hover:bg-zinc-50"
        >
          Change Tomorrow's Focus →
        </button>
      )}
    </div>
  )
}

// ─── XP progress bar ──────────────────────────────────────────────────────────
function XpEligibilityBar({ completedCount }) {
  const eligible = Math.min(completedCount, XP_ELIGIBLE_TASK_COUNT)
  const pct = (eligible / XP_ELIGIBLE_TASK_COUNT) * 100
  const remaining = Math.max(0, XP_ELIGIBLE_TASK_COUNT - completedCount)
  const capped = completedCount >= XP_ELIGIBLE_TASK_COUNT

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          XP Tasks
        </p>
        <p className={`text-[10px] font-black ${capped ? 'text-emerald-600' : 'text-zinc-500'}`}>
          {capped ? 'Cap reached ✓' : `${remaining} slot${remaining === 1 ? '' : 's'} left · +${remaining * TASK_XP_AMOUNT} XP available`}
        </p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${capped ? 'bg-emerald-500' : 'bg-zinc-900'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between">
        {Array.from({ length: XP_ELIGIBLE_TASK_COUNT }).map((_, i) => (
          <div
            key={i}
            className={`flex flex-col items-center gap-0.5`}
          >
            <div className={`h-1.5 w-1.5 rounded-full ${i < eligible ? (capped ? 'bg-emerald-500' : 'bg-zinc-900') : 'bg-zinc-200'}`} />
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[10px] font-semibold text-zinc-400">
        Each of the first {XP_ELIGIBLE_TASK_COUNT} completions earns +{TASK_XP_AMOUNT} XP
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
function TasksPage({
  onBack,
  onChangeFocus,
  onAddTask,
  focusCategory,
  focusOptions,
  completedCount,
  tasks,
  isLoading,
  onCompleteTask,
  onDeleteTask,
  justCompletedId,
  streakDays,
  dailyStatusMessage,
  errorText,
  streakShields = 0,
  dailyChallenge = null,
}) {
  const currentFocus = focusOptions?.find((o) => o.key === focusCategory) || null

  // Day is "won" once at least 5 tasks are completed (not necessarily all tasks)
  const fiveTasksDone = completedCount >= XP_ELIGIBLE_TASK_COUNT
  const allTasksDone = tasks.length > 0 && completedCount === tasks.length

  const xpEarned = useMemo(() => getXpEarnedToday(tasks), [tasks])
  const morningLeft = useMemo(() => getMorningCountdown(), [])
  const xpEligibleRemaining = Math.max(0, XP_ELIGIBLE_TASK_COUNT - completedCount)

  // Sort: incomplete first (by creation order), completed last
  const sortedTasks = useMemo(() => {
    const incomplete = tasks.filter((t) => !t.completed)
    const complete = tasks.filter((t) => t.completed)
    return [...incomplete, ...complete]
  }, [tasks])

  const showMorningBanner =
    morningLeft !== null &&
    dailyChallenge?.challenge?.type === 'complete_morning_task_before_10am' &&
    !dailyChallenge?.completed

  const taskListSection = (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Your Tasks ({tasks.length})
        </h2>
        {completedCount < tasks.length && (
          <span className="text-[10px] font-bold text-zinc-400">
            {xpEligibleRemaining > 0
              ? `${xpEligibleRemaining} XP task${xpEligibleRemaining === 1 ? '' : 's'} left`
              : 'XP cap reached'}
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {sortedTasks.map((task) => {
          // Tasks beyond the first 5 completions show 0 XP (no XP awarded)
          const taskPosition = sortedTasks
            .filter((t) => t.completed)
            .findIndex((t) => t.id === task.id)
          const isXpEligible = task.completed
            ? taskPosition < XP_ELIGIBLE_TASK_COUNT
            : completedCount < XP_ELIGIBLE_TASK_COUNT

          return (
            <TaskCard
              key={task.id}
              task={{
                ...task,
                // Show 0 XP for tasks that won't earn XP
                xp: isXpEligible ? TASK_XP_AMOUNT : 0,
              }}
              onComplete={onCompleteTask}
              onDelete={onDeleteTask}
              isJustCompleted={task.id === justCompletedId}
            />
          )
        })}

        {isLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-zinc-100" />
            ))}
          </>
        )}
      </div>

      {/* Add task nudge at bottom of list */}
      {!isLoading && tasks.length > 0 && (
        <button
          type="button"
          onClick={onAddTask}
          className="mt-3 w-full rounded-2xl border border-dashed border-zinc-300 px-4 py-3 text-[11px] font-bold text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-600 hover:bg-zinc-50"
        >
          ＋ Add another task
        </button>
      )}
    </section>
  )

  return (
    <>
      {/* ── Header row ──────────────────────────────────────────────────── */}
      <section className="relative flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100"
        >
          ← Back
        </button>

        {/* Add task button — always visible */}
        <button
          type="button"
          onClick={onAddTask}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-black text-white transition hover:bg-zinc-700 active:scale-95"
        >
          <span className="text-sm leading-none">＋</span>
          Add Task
        </button>
      </section>

      {/* ── Focus badge ─────────────────────────────────────────────────── */}
      {currentFocus && (
        <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{currentFocus.icon}</span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Today's Focus</p>
                <p className="text-sm font-black text-zinc-900">{currentFocus.label}</p>
              </div>
            </div>
            {onChangeFocus && !fiveTasksDone && (
              <button
                type="button"
                onClick={onChangeFocus}
                className="rounded-lg border border-zinc-200 px-2.5 py-1 text-[10px] font-bold text-zinc-500 transition hover:bg-zinc-100"
              >
                Change
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── Morning bonus banner ─────────────────────────────────────────── */}
      {showMorningBanner && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black text-amber-900">⚡ Morning bonus window</p>
              <p className="mt-0.5 text-[10px] font-semibold text-amber-700">
                Complete a task before 10 AM to finish today's challenge
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-base font-black text-amber-800">{morningLeft}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600">remaining</p>
            </div>
          </div>
        </section>
      )}

      {/* ── 5 tasks done (XP cap reached) — show day won state ──────────── */}
      {fiveTasksDone ? (
        <>
          <DayWonState
            streakDays={streakDays}
            xpEarned={xpEarned}
            totalTasks={tasks.length}
            onChangeFocus={onChangeFocus}
            onAddTask={onAddTask}
          />
          {taskListSection}
        </>
      ) : (
        <div className="lg:grid lg:grid-cols-[300px_1fr] lg:gap-8 lg:items-start">
          <div className="space-y-4">
            {/* ── Progress header ──────────────────────────────────────────── */}
            <section className="rounded-3xl border border-zinc-200 bg-white px-5 py-4 shadow-sm w-full">
              <div className="flex items-center gap-5">
                <ProgressRing completed={completedCount} total={Math.max(tasks.length, XP_ELIGIBLE_TASK_COUNT)} />
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">XP from tasks today</p>
                    <p className="mt-0.5 text-2xl font-black text-zinc-900">
                      +{xpEarned}
                      <span className="ml-1.5 text-xs font-bold text-zinc-400">XP</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🔥</span>
                      <span className="text-xs font-black text-zinc-700">{streakDays}d streak</span>
                    </div>
                    {streakShields > 0 && (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: streakShields }).map((_, i) => (
                          <span key={i} className="text-xs">🛡️</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-zinc-500 leading-relaxed">
                    {dailyStatusMessage}
                  </p>
                </div>
              </div>

              {/* Overall task progress bar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  <span>Progress</span>
                  <span>{completedCount}/{tasks.length} tasks</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-zinc-900 transition-all duration-700 ease-out"
                    style={{ width: tasks.length > 0 ? `${(completedCount / tasks.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </section>

            {/* ── XP eligibility bar ───────────────────────────────────────── */}
            <XpEligibilityBar completedCount={completedCount} />

            {/* ── Streak at risk warning ───────────────────────────────────── */}
            {(() => {
              const hour = new Date().getHours()
              const remaining = tasks.length - completedCount
              if (hour >= 21 && remaining > 0 && tasks.length > 0) {
                return (
                  <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-xs font-black text-red-800">🔥 Streak at risk</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-red-700">
                      {remaining} task{remaining > 1 ? 's' : ''} left — complete at least one before midnight.
                    </p>
                  </section>
                )
              }
              return null
            })()}
          </div>

          <div className="mt-6 lg:mt-0">
            {/* ── Task list ────────────────────────────────────────────────── */}
            {taskListSection}
          </div>
        </div>
      )}

      {errorText && (
        <p className="text-center text-xs font-semibold text-red-600">{errorText}</p>
      )}
    </>
  )
}

export default TasksPage
