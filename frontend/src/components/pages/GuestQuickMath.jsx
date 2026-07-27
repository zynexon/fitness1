// frontend/src/components/pages/GuestQuickMath.jsx

import { useEffect, useState } from 'react'
import branding, { interpolate } from '../../config/branding'

function generateGuestQuestion() {
  const num1 = Math.floor(Math.random() * 20) + 1
  const num2 = Math.floor(Math.random() * 20) + 1
  const operators = ['+', '-', '*']
  const operator = operators[Math.floor(Math.random() * operators.length)]

  let answer = 0
  if (operator === '+') answer = num1 + num2
  else if (operator === '-') answer = num1 - num2
  else answer = num1 * num2

  return { num1, num2, operator, answer }
}

// ─── Score screen ─────────────────────────────────────────────────────────────
function GuestScoreScreen({ score, onSignup, onPlayAgain }) {
  // Verdict tiers — honest, not cheerful
  const verdict =
    score >= 15 ? { label: 'Elite',    pct: 5,  msg: 'Top 5% of people who\'ve tried this. That\'s rare.' } :
    score >= 10 ? { label: 'Strong',   pct: 20, msg: 'Top 20%. You have the processing speed. Use it.' } :
    score >= 5  ? { label: 'Solid',    pct: 45, msg: 'Above average. The ceiling is higher than this.' } :
                  { label: 'Civilian', pct: 80, msg: interpolate(branding.copyPack.guestQuickMathCopy.lowScoreMsg, { streakUnitLabel: branding.copyPack.streakUnitLabel }) }

  // What's inside the full app — shown after the score to create pull
  const features = [
    { icon: '🧠', label: '9 more brain games',     desc: 'Pattern sequences, logic grids, memory recall, reaction tap…' },
    { icon: '📋', label: 'Daily task system',       desc: '5 discipline tasks every day tailored to your focus area.' },
    { icon: '⚔️', label: branding.copyPack.guestQuickMathCopy.featureWarMode.label,                desc: branding.copyPack.guestQuickMathCopy.featureWarMode.desc },
    { icon: '🏆', label: branding.copyPack.guestQuickMathCopy.featureLeaderboard.label,        desc: interpolate(branding.copyPack.guestQuickMathCopy.featureLeaderboard.desc, { streakUnitLabelPlural: branding.copyPack.streakUnitLabelPlural }) },
    { icon: '🔥', label: 'Streak & rank system',    desc: '30 ranks to climb. Break your streak and start over.' },
  ]

  return (
    <main className="mx-auto w-full max-w-md lg:max-w-lg min-h-[100dvh] flex flex-col px-5 pt-6 pb-12">

      {/* ── Score hero ── */}
      <div className="rounded-[2rem] border border-zinc-900 bg-zinc-950 px-6 py-7 text-white relative overflow-hidden">
        {/* Faint score watermark */}
        <div className="pointer-events-none absolute right-4 top-2 text-[96px] font-black leading-none text-white opacity-[0.05] select-none tabular-nums">
          {score}
        </div>

        <div className="relative z-10">
          <p className="text-[9px] font-black uppercase tracking-[0.32em] text-zinc-500">
            Quick Math — Your Result
          </p>

          <div className="mt-3 flex items-end gap-3">
            <span className="text-7xl font-black leading-none tabular-nums text-white">{score}</span>
            <div className="pb-2">
              <p className="text-base font-black text-zinc-300">correct</p>
              <p className="text-[10px] font-bold text-zinc-600">in 30 seconds</p>
            </div>
          </div>

          {/* Verdict */}
          <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-white">{verdict.label}</span>
              <span className="text-[10px] font-bold text-zinc-500">Top {verdict.pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-white transition-all duration-1000"
                style={{ width: `${100 - verdict.pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-zinc-400 leading-relaxed">{verdict.msg}</p>
          </div>
        </div>
      </div>

      {/* ── Save your score push ── */}
      <div className="mt-4 rounded-3xl border border-zinc-200 bg-white px-5 py-5 space-y-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-400 mb-1">
            Your score disappears when you close this tab
          </p>
          <h2 className="text-lg font-black text-zinc-950 leading-tight">
            Create a free account to save it and track your progress.
          </h2>
        </div>

        {/* What's inside */}
        <div className="space-y-2">
          {features.map(({ icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3">
              <span className="text-base leading-none shrink-0 mt-0.5">{icon}</span>
              <div>
                <p className="text-xs font-black text-zinc-900">{label}</p>
                <p className="text-[10px] font-semibold text-zinc-500 leading-snug mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onSignup('register')}
          className="w-full rounded-2xl bg-zinc-950 px-4 py-4 text-sm font-black uppercase tracking-wider text-white transition hover:bg-zinc-800 active:scale-[0.98]"
        >
          Create Account — Free
        </button>

        <button
          type="button"
          onClick={() => onSignup('login')}
          className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50"
        >
          Already have an account? Log in
        </button>

        <button
          type="button"
          onClick={onPlayAgain}
          className="w-full rounded-xl py-2 text-xs font-semibold text-zinc-400 transition hover:text-zinc-700"
        >
          Play again without account →
        </button>
      </div>

    </main>
  )
}

// ─── Game screen ──────────────────────────────────────────────────────────────
function GuestQuickMath({ onFinish, onPlayAgain }) {
  const [phase,    setPhase]    = useState('playing')
  const [score,    setScore]    = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [question, setQuestion] = useState(generateGuestQuestion())
  const [answer,   setAnswer]   = useState('')
  const [flash,    setFlash]    = useState(null) // 'correct' | 'wrong' | null

  useEffect(() => {
    if (phase !== 'playing') return undefined
    const id = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(id)
          setPhase('result')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase])

  function handleSubmit(e) {
    e.preventDefault()
    const parsed = Number.parseInt(answer, 10)
    const isCorrect = !Number.isNaN(parsed) && parsed === question.answer

    if (isCorrect) {
      setScore(prev => prev + 1)
      setFlash('correct')
    } else {
      setFlash('wrong')
    }

    setTimeout(() => setFlash(null), 250)
    setAnswer('')
    setQuestion(generateGuestQuestion())
  }

  if (phase === 'result') {
    return (
      <GuestScoreScreen
        score={score}
        onSignup={(mode) => onFinish(mode, score)}
        onPlayAgain={onPlayAgain}
      />
    )
  }

  // Progress bar width
  const timePct = (timeLeft / 30) * 100

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md lg:max-w-lg flex-col px-5 pt-8 pb-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-400">Quick Math</p>
          <p className="text-[10px] font-semibold text-zinc-500">One of 10 brain training games</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black tabular-nums text-zinc-900">{score}</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">score</p>
        </div>
      </div>

      {/* Timer bar */}
      <div className="mb-6">
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${
              timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-amber-500' : 'bg-zinc-900'
            }`}
            style={{ width: `${timePct}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className={`text-xs font-black tabular-nums ${timeLeft <= 5 ? 'text-red-500' : 'text-zinc-500'}`}>
            {timeLeft}s
          </span>
          <span className="text-[10px] font-semibold text-zinc-400">remaining</span>
        </div>
      </div>

      {/* Question card */}
      <div className={`flex flex-col rounded-3xl border-2 transition-colors duration-150 ${
        flash === 'correct'
          ? 'border-emerald-400 bg-emerald-50'
          : flash === 'wrong'
            ? 'border-red-300 bg-red-50'
            : 'border-zinc-200 bg-white'
      } px-5 py-6 sm:px-6 sm:py-8 shadow-sm`}>

        {/* Operation labels */}
        <div className="text-center mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            {question.operator === '+' ? 'Add' : question.operator === '-' ? 'Subtract' : 'Multiply'}
          </p>
        </div>

        {/* The question */}
        <div className="py-8 sm:py-10 flex items-center justify-center">
          <p className="text-5xl font-black tracking-tight text-zinc-950 tabular-nums">
            {question.num1}
            <span className="mx-3 text-zinc-400">{question.operator === '*' ? '×' : question.operator}</span>
            {question.num2}
          </p>
        </div>

        {/* Answer form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="number"
            inputMode="numeric"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            autoFocus
            className="w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 py-4 text-center text-2xl font-black outline-none focus:border-zinc-900 focus:bg-white tabular-nums transition"
            placeholder="?"
          />
          <button
            type="submit"
            className="w-full rounded-2xl bg-zinc-950 px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white transition hover:bg-zinc-800 active:scale-[0.98]"
          >
            Submit
          </button>
        </form>
      </div>

      {/* Bottom hint */}
      <p className="mt-4 text-center text-[10px] font-semibold text-zinc-400">
        Tap Submit or press Enter to answer
      </p>

    </main>
  )
}

export default GuestQuickMath
