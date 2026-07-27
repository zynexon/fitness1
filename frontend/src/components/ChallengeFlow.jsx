/**
 * ChallengeFlow.jsx  — 1v1 Challenge System
 *
 * Updated:
 * - MyChallengeDashboard now has 2 tabs: "Created by Me" and "Played by Me"
 * - Clear win/loss/XP stats on each card
 * - Completed challenge links show as invalid on landing page
 * - XP wager transfer shown clearly (green gain, red loss)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import branding from '../config/branding'
import confetti from 'canvas-confetti'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function apiUrl(path) {
  if (!API_BASE_URL) return path
  return `${API_BASE_URL}${path}`
}

// ─── Game metadata ────────────────────────────────────────────────────────────

const GAME_META = {
  quick_math: {
    label: 'Quick Math', icon: '⚡', mode: 'SCORE',
    challengeTagline: 'Beat my score',
    acceptTagline: 'Beat their score in 30 seconds',
    route: '/game/quick-math',
  },
  focus_tap: {
    label: 'Focus Tap', icon: '🎯', mode: 'TIME',
    challengeTagline: 'I finished Focus Tap fast — can you?',
    acceptTagline: 'Finish 15 rounds faster than their time',
    route: '/game/focus-tap',
  },
  number_recall: {
    label: 'Number Recall', icon: '🧠', mode: 'ROUNDS',
    challengeTagline: 'I cleared Number Recall — can you?',
    acceptTagline: 'Finish 3 rounds in fewer attempts',
    route: '/game/number-recall',
  },
  color_count_focus: {
    label: 'Color Count', icon: '🎨', mode: 'ROUNDS',
    challengeTagline: 'I cleared Color Count — can you?',
    acceptTagline: 'Clear 8 rounds in fewer attempts',
    route: '/game/color-count-focus',
  },
  speed_pattern: {
    label: 'Speed Pattern', icon: '📐', mode: 'ROUNDS',
    challengeTagline: 'I cleared Speed Pattern — can you?',
    acceptTagline: 'Finish 3 rounds in fewer attempts',
    route: '/game/speed-pattern',
  },
  reverse_order: {
    label: 'Reverse Order', icon: '🔀', mode: 'ROUNDS',
    challengeTagline: 'I cleared Reverse Order — can you?',
    acceptTagline: 'Solve 3 rounds in fewer attempts',
    route: '/game/reverse-order',
  },
  number_stack: {
    label: 'Number Stack', icon: '🔢', mode: 'ROUNDS',
    challengeTagline: 'I cleared Number Stack — can you?',
    acceptTagline: 'Solve 3 rounds in fewer attempts',
    route: '/game/number-stack',
  },
  pattern_sequence: {
    label: 'Pattern Sequence', icon: '🔮', mode: 'TIME',
    challengeTagline: 'I cleared Pattern Sequence — can you?',
    acceptTagline: 'Solve 9 rounds faster than their time',
    route: '/game/pattern-sequence',
  },
  logic_grid: {
    label: 'Logic Grid', icon: '♟️', mode: 'TIME',
    challengeTagline: 'I solved a Logic Grid — can you?',
    acceptTagline: 'Solve the grid faster than their time',
    route: '/game/logic-grid',
  },
  reaction_tap: {
    label: 'Reaction Tap', icon: '⚡', mode: 'TIME',
    challengeTagline: 'I cleared Reaction Tap — can you?',
    acceptTagline: 'Beat their average reaction time',
    route: '/game/reaction-tap',
  },
}

function getMeta(gameType) {
  return GAME_META[gameType] || {
    label: gameType, icon: '⚔️', mode: 'ROUNDS',
    challengeTagline: 'I completed this game — can you?',
    acceptTagline: 'Complete the game to win',
    route: '/game',
  }
}

function isScoreBased(gameType) { return getMeta(gameType).mode === 'SCORE' }
function isTimeBased(gameType)  { return getMeta(gameType).mode === 'TIME' }
function isRoundsBased(gameType){ return getMeta(gameType).mode === 'ROUNDS' }

function formatTimeMs(ms) {
  if (!Number.isFinite(ms)) return '--'
  if (ms < 1000) return `${Math.round(ms)} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatRounds(rounds) {
  if (!Number.isFinite(rounds)) return '--'
  const count = Math.max(0, Math.round(rounds))
  return `${count} round${count === 1 ? '' : 's'}`
}

function formatMetric(gameType, value) {
  if (isScoreBased(gameType)) {
    if (!Number.isFinite(value)) return '--'
    return String(Math.round(value))
  }
  if (isRoundsBased(gameType)) return formatRounds(value)
  return formatTimeMs(value)
}

function metricLabel(gameType) {
  if (isScoreBased(gameType))  return 'Score to beat'
  if (isRoundsBased(gameType)) return 'Rounds to beat'
  return 'Time to beat'
}

function compareMetrics(gameType, yourValue, theirValue) {
  if (!Number.isFinite(yourValue) || !Number.isFinite(theirValue)) return null
  if (isScoreBased(gameType)) {
    if (yourValue > theirValue) return 'win'
    if (yourValue < theirValue) return 'loss'
    return 'tie'
  }
  // Lower is better for time/rounds
  if (yourValue < theirValue) return 'win'
  if (yourValue > theirValue) return 'loss'
  return 'tie'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const el = document.createElement('textarea')
  el.value = text
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
  return Promise.resolve()
}

function getShareUrl(challengeId) {
  return `${window.location.origin}/?challenge=${challengeId}`
}

function buildShareText(challenge) {
  const meta = getMeta(challenge.game_type)
  const name = challenge.challenger?.name || 'A warrior'
  if (isScoreBased(challenge.game_type))
    return `${name} scored ${challenge.challenger_score} in ${branding.appName} ${meta.label}. Can you beat it? ⚔️`
  if (isRoundsBased(challenge.game_type)) {
    const rounds = formatMetric(challenge.game_type, challenge.challenger_metric)
    return `${name} cleared ${branding.appName} ${meta.label} in ${rounds}. Can you beat it? ⚔️`
  }
  const time = formatMetric(challenge.game_type, challenge.challenger_metric)
  return `${name} finished ${branding.appName} ${meta.label} in ${time}. Can you beat it? ⚔️`
}

function timeAgo(isoString) {
  if (!isoString) return ''
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function fireWinConfetti() {
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 11000 })
}

async function publicFetch(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || data?.detail || 'Request failed.')
  if (!data || typeof data !== 'object') throw new Error('Invalid API response.')
  return data
}

// ─── Embedded Quick Math (score-based challenges only) ────────────────────────

function generateMathQuestion() {
  const n1 = Math.floor(Math.random() * 20) + 1
  const n2 = Math.floor(Math.random() * 20) + 1
  const ops = ['+', '-', '*']
  const op = ops[Math.floor(Math.random() * ops.length)]
  const answer = op === '+' ? n1 + n2 : op === '-' ? n1 - n2 : n1 * n2
  return { n1, n2, op, answer }
}

function QuickMathChallenge({ targetScore, challengerName, onFinish }) {
  const [timeLeft, setTimeLeft] = useState(30)
  const [score, setScore]       = useState(0)
  const [question, setQuestion] = useState(() => generateMathQuestion())
  const [answer, setAnswer]     = useState('')
  const [done, setDone]         = useState(false)
  const inputRef                = useRef(null)

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(id); setDone(true); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (done) onFinish(score) }, [done])

  function handleSubmit(e) {
    e.preventDefault()
    const parsed = parseInt(answer, 10)
    if (!isNaN(parsed) && parsed === question.answer) setScore(s => s + 1)
    setAnswer('')
    setQuestion(generateMathQuestion())
    inputRef.current?.focus()
  }

  const pct   = (timeLeft / 30) * 100
  const ahead = score > targetScore
  const tied  = score === targetScore

  return (
    <div className="space-y-3">
      {/* Live scoreboard */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-center">
            <p className={`text-2xl font-black tabular-nums ${ahead ? 'text-emerald-400' : tied ? 'text-white' : 'text-red-400'}`}>
              {score}
            </p>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">You</p>
          </div>
          <p className="text-zinc-600 font-black">vs</p>
          <div className="text-center">
            <p className="text-2xl font-black tabular-nums text-white">{targetScore}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 truncate max-w-[80px]">
              {challengerName}
            </p>
          </div>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              timeLeft <= 5 ? 'bg-red-500' : ahead ? 'bg-emerald-400' : 'bg-white'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className={`mt-1 text-right text-[10px] font-black tabular-nums ${timeLeft <= 5 ? 'text-red-400' : 'text-zinc-600'}`}>
          {timeLeft}s
        </p>
      </div>

      {/* Question card */}
      <div className="rounded-3xl border border-zinc-200 bg-white px-5 py-7 text-center shadow-sm">
        <p className="text-4xl font-black tracking-tight text-zinc-950 tabular-nums">
          {question.n1}
          <span className="mx-3 text-zinc-400">{question.op === '*' ? '×' : question.op}</span>
          {question.n2}
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            autoFocus
            className="w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-xl font-black outline-none focus:border-zinc-900 tabular-nums transition"
            placeholder="?"
          />
          <button type="submit"
            className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-black uppercase tracking-wider text-white active:scale-[0.98]">
            Submit
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Challenge Result Screen ───────────────────────────────────────────────────

function ChallengeResultScreen({ challenge, yourScore, yourMetric, isAuthenticated, xpGained, onClose }) {
  const meta = getMeta(challenge.game_type)
  const challengerName = challenge.challenger?.name || 'Challenger'
  const challengerMetric = challenge.challenger_metric

  let won = false
  let tied = false
  let resultHeading = ''
  let resultBody = ''
  const metricOutcome = compareMetrics(challenge.game_type, yourMetric, challengerMetric)
  const metricSymbol = metricOutcome === 'win' ? '<' : metricOutcome === 'loss' ? '>' : '='

  if (isScoreBased(challenge.game_type)) {
    won = yourScore > challenge.challenger_score
    tied = yourScore === challenge.challenger_score
    resultHeading = won ? 'You Win ⚔️' : tied ? "It's a Tie" : 'You Lose 💀'
    resultBody = won
      ? `You beat ${challengerName} by ${yourScore - challenge.challenger_score}. Send them a rematch.`
      : tied
        ? `Dead even with ${challengerName}. Rematch to break the tie.`
        : `${challengerName} holds the record by ${challenge.challenger_score - yourScore}. Train harder.`
  } else if (metricOutcome) {
    won = metricOutcome === 'win'
    tied = metricOutcome === 'tie'
    const diffValue = Math.abs((challengerMetric || 0) - (yourMetric || 0))
    const diffText = formatMetric(challenge.game_type, diffValue)
    const lowerBetterLabel = isTimeBased(challenge.game_type) ? 'faster' : 'fewer rounds'
    resultHeading = won ? 'You Win ⚔️' : tied ? "It's a Tie" : 'You Lose 💀'
    resultBody = won
      ? `You were ${lowerBetterLabel} by ${diffText}. Send them a rematch.`
      : tied
        ? `Dead even with ${challengerName}. Rematch to break the tie.`
        : `${challengerName} was ${lowerBetterLabel} by ${diffText}. Train harder.`
  } else {
    resultHeading = 'Challenge Failed ❌'
    resultBody = `${challengerName}'s record stands. Come back stronger.`
  }

  useEffect(() => { if (won) fireWinConfetti() }, [won])

  return (
    <div className="space-y-4">
      <div className={`rounded-3xl border p-6 text-center relative overflow-hidden ${
        won ? 'border-emerald-700 bg-emerald-950' : tied ? 'border-zinc-700 bg-zinc-950' : 'border-red-800 bg-red-950'
      }`}>
        <div className="pointer-events-none absolute right-3 top-0 text-[100px] font-black leading-none opacity-[0.06] select-none">
          {won ? '🏆' : tied ? '=' : '💀'}
        </div>
        <div className="relative z-10 space-y-3">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">
            {meta.icon} {meta.label} — 1v1 Duel
          </p>

          {/* Score comparison */}
          {isScoreBased(challenge.game_type) && (
            <div className="flex items-center justify-center gap-6 py-1">
              <div className="text-center">
                <p className="text-4xl font-black tabular-nums text-white">{yourScore}</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1">You</p>
              </div>
              <p className={`text-2xl font-black ${won ? 'text-emerald-400' : tied ? 'text-white' : 'text-red-400'}`}>
                {yourScore > challenge.challenger_score ? '>' : yourScore === challenge.challenger_score ? '=' : '<'}
              </p>
              <div className="text-center">
                <p className="text-4xl font-black tabular-nums text-white">{challenge.challenger_score}</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1">{challengerName}</p>
              </div>
            </div>
          )}

          {/* Metric comparison */}
          {!isScoreBased(challenge.game_type) && (
            <div className="flex items-center justify-center gap-6 py-1">
              <div className="text-center">
                <p className="text-2xl font-black tabular-nums text-white">
                  {formatMetric(challenge.game_type, yourMetric)}
                </p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1">You</p>
              </div>
              <p className={`text-2xl font-black ${won ? 'text-emerald-400' : tied ? 'text-white' : 'text-red-400'}`}>
                {metricOutcome ? metricSymbol : '?'}
              </p>
              <div className="text-center">
                <p className="text-2xl font-black tabular-nums text-white">
                  {formatMetric(challenge.game_type, challengerMetric)}
                </p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1">{challengerName}</p>
              </div>
            </div>
          )}

          <p className={`text-xl font-black ${won ? 'text-emerald-400' : tied ? 'text-zinc-300' : 'text-red-400'}`}>
            {resultHeading}
          </p>
          <p className="text-xs font-semibold text-zinc-400 leading-relaxed">{resultBody}</p>

          {xpGained > 0 && (
            <div className="rounded-xl border border-amber-700 bg-amber-950/50 px-4 py-2">
              <p className="text-sm font-black text-amber-400">+{xpGained} XP transferred to you 💰</p>
            </div>
          )}
        </div>
      </div>

      {isAuthenticated && (
        <button type="button" onClick={onClose}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800">
          Back to Home
        </button>
      )}
    </div>
  )
}

// ─── ChallengeCreateButton ─────────────────────────────────────────────────────

export function ChallengeCreateButton({ gameType, score, metric = null, seed = null, authedFetch, className = '' }) {
  const [phase, setPhase]         = useState('idle')
  const [wager, setWager]         = useState(0)
  const [challenge, setChallenge] = useState(null)
  const [copied, setCopied]       = useState(false)
  const [error, setError]         = useState('')

  const meta          = getMeta(gameType)
  const scoreMode     = isScoreBased(gameType)
  const metricValue   = Number.isFinite(metric) ? metric : (scoreMode ? score : null)
  const metricDisplay = scoreMode ? score : formatMetric(gameType, metricValue)
  const normalizedSeed = seed && typeof seed === 'object' ? seed : {}

  async function handleCreate() {
    if (!scoreMode && !Number.isFinite(metricValue)) {
      setError('Finish the game to set a valid challenge metric.')
      setPhase('error')
      return
    }
    setPhase('creating')
    setError('')
    try {
      const data = await authedFetch('/api/challenges/create/', {
        method: 'POST',
        body: JSON.stringify({
          game_type: gameType,
          challenger_score: score,
          challenger_metric: metricValue,
          xp_wager: wager,
          seed: normalizedSeed,
        }),
      })
      setChallenge(data.challenge)
      setPhase('created')
    } catch (err) {
      setError(err.message || 'Could not create challenge.')
      setPhase('error')
    }
  }

  async function handleShare() {
    if (!challenge) return
    const url  = getShareUrl(challenge.id)
    const text = buildShareText(challenge)
    if (navigator.share) {
      navigator.share({ title: `${branding.appName} Challenge ⚔️`, text, url }).catch(() => doCopy())
    } else {
      doCopy()
    }
  }

  async function doCopy() {
    if (!challenge) return
    await copyToClipboard(getShareUrl(challenge.id))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* Created state */
  if (phase === 'created' && challenge) {
    return (
      <div className={`rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3 ${className}`}>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Challenge created ⚔️</p>
            <p className="text-sm font-black text-white">
              {scoreMode ? `You scored ${score}. Can they beat it?` : `You finished in ${metricDisplay}. Can they beat it?`}
            </p>
          </div>
        </div>

        {challenge.xp_wager > 0 && (
          <div className="rounded-xl border border-amber-800 bg-amber-950/40 px-3 py-2 text-center">
            <p className="text-xs font-black text-amber-400">💰 {challenge.xp_wager} XP on the line</p>
            <p className="text-[10px] font-semibold text-amber-700">Winner takes it from loser's total XP</p>
          </div>
        )}

        <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2">
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Share link</p>
          <p className="text-[10px] font-mono text-zinc-300 break-all leading-relaxed">
            {getShareUrl(challenge.id)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={handleShare}
            className="rounded-xl bg-white px-3 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-950 hover:bg-zinc-100 active:scale-95 transition">
            {copied ? '✓ Copied!' : '📤 Share Link'}
          </button>
          <button type="button" onClick={() => setPhase('idle')}
            className="rounded-xl border border-zinc-700 px-3 py-2.5 text-xs font-bold text-zinc-400 hover:bg-zinc-800 transition">
            Done
          </button>
        </div>

        <p className="text-center text-[9px] font-semibold text-zinc-600">
          Expires in {challenge.hours_remaining}h · Link becomes invalid once played
        </p>
      </div>
    )
  }

  /* Wager picker */
  if (phase === 'wager') {
    return (
      <div className={`rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3 ${className}`}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">
            {meta.icon} {meta.label} Challenge
          </p>
          <p className="text-sm font-black text-white">
            {scoreMode ? `Your score: ${score}.` : `Your result: ${metricDisplay}.`} Set a wager.
          </p>
        </div>

        <p className="text-xs font-semibold text-zinc-400 leading-relaxed">
          Optional XP wager — winner takes it directly from the loser's total XP balance.
        </p>

        <div className="flex gap-2 flex-wrap">
          {[0, 10, 25, 50, 100].map(amt => (
            <button key={amt} type="button" onClick={() => setWager(amt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                wager === amt
                  ? 'border-white bg-white text-zinc-950'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}>
              {amt === 0 ? 'No wager' : `${amt} XP`}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={handleCreate}
            className="rounded-xl bg-white px-3 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-950 hover:bg-zinc-100 active:scale-95 transition">
            ⚔️ Create Challenge
          </button>
          <button type="button" onClick={() => setPhase('idle')}
            className="rounded-xl border border-zinc-700 px-3 py-2.5 text-xs font-bold text-zinc-400 hover:bg-zinc-800 transition">
            Cancel
          </button>
        </div>

        {error && <p className="text-[10px] font-semibold text-red-400">{error}</p>}
      </div>
    )
  }

  if (phase === 'creating') {
    return (
      <div className={`rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-center ${className}`}>
        <p className="text-xs font-semibold text-zinc-400">Creating challenge...</p>
      </div>
    )
  }

  /* Idle button */
  return (
    <button type="button" onClick={() => setPhase('wager')}
      className={`w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-left transition hover:border-zinc-500 active:scale-[0.98] ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Challenge a friend</p>
          <p className="text-sm font-black text-white">
            ⚔️ {scoreMode ? `1v1 Duel — Score: ${score}` : `1v1 Duel — Result: ${metricDisplay}`}
          </p>
        </div>
        <span className="text-2xl shrink-0">{meta.icon}</span>
      </div>
      {error && <p className="mt-1 text-[10px] font-semibold text-red-400">{error}</p>}
    </button>
  )
}

// ─── ChallengeLandingPage ──────────────────────────────────────────────────────

export function ChallengeLandingPage({
  challengeId,
  initialScore = null,
  initialMetric = null,
  initialResultMode = 'submit',
  user,
  authedFetch,
  onLogin,
  onRegister,
  onClose,
  onInitialResultHandled,
  onGuestAuthRequired,
  onNavigateToGame,
}) {
  const [phase, setPhase]             = useState('loading')
  const [challenge, setChallenge]     = useState(null)
  const [yourScore, setYourScore]     = useState(null)
  const [yourMetric, setYourMetric]   = useState(null)
  const [xpGained, setXpGained]       = useState(0)
  const [guestPlayed, setGuestPlayed] = useState(false)
  const [error, setError]             = useState('')

  const normalizedChallengeId = String(challengeId || '').trim().replace(/\/+$/, '')
  const initialSubmissionRef = useRef({
    score: initialScore,
    metric: initialMetric,
    mode: initialResultMode,
    challengeKey: normalizedChallengeId,
  })

  const isAuthenticated = Boolean(user)

  if (initialSubmissionRef.current.challengeKey !== normalizedChallengeId) {
    initialSubmissionRef.current = {
      score: initialScore, metric: initialMetric,
      mode: initialResultMode, challengeKey: normalizedChallengeId,
    }
  }

  const fetchChallenge = useCallback(async () => {
    setPhase('loading')
    try {
      if (!normalizedChallengeId) throw new Error('Invalid challenge id')
      const data = await publicFetch(`/api/challenges/${encodeURIComponent(normalizedChallengeId)}/`)
      setChallenge(data)
      const pendingScore  = initialSubmissionRef.current.score
      const pendingMetric = initialSubmissionRef.current.metric
      const pendingMode   = initialSubmissionRef.current.mode || 'submit'
      if (Number.isFinite(pendingScore)) {
        if (typeof onInitialResultHandled === 'function') onInitialResultHandled()
        if (pendingMode === 'display') {
          setYourScore(pendingScore)
          setYourMetric(pendingMetric)
          setGuestPlayed(false)
          setPhase('result')
          return
        }
        await submitResult(pendingScore, pendingMetric, data)
        return
      }
      setPhase('preview')
    } catch {
      setError('This challenge link is invalid or has expired.')
      setPhase('error')
    }
  }, [normalizedChallengeId, onInitialResultHandled]) // eslint-disable-line

  useEffect(() => { fetchChallenge() }, [fetchChallenge])

  async function submitResult(score, metricValue) {
    setPhase('submitting')
    try {
      const doFetch = isAuthenticated ? authedFetch : publicFetch
      const data = await doFetch(
        `/api/challenges/${encodeURIComponent(normalizedChallengeId)}/accept/`,
        { method: 'POST', body: JSON.stringify({ opponent_score: score, opponent_metric: metricValue }) }
      )
      setChallenge(data.challenge)
      setXpGained(data.xp_gained || 0)
      setGuestPlayed(Boolean(data.guest_played) || !isAuthenticated)
    } catch {
      if (!isAuthenticated) setGuestPlayed(true)
    }
    setYourScore(score)
    setYourMetric(metricValue)
    setPhase('result')
  }

  function handleScoreFinish(score) { submitResult(score, score) }

  /* Loading */
  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-3">
          <p className="text-3xl font-black tracking-[0.18em] text-white">{branding.appName}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Loading challenge...</p>
        </div>
      </div>
    )
  }

  /* Error */
  if (phase === 'error' || !challenge) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950 p-5">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-2xl font-black text-white">Challenge not found</p>
          <p className="text-sm font-semibold text-zinc-400 leading-relaxed">
            {error || 'This challenge may have expired or been deleted.'}
          </p>
          <button type="button" onClick={onClose}
            className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-bold text-zinc-300 hover:bg-zinc-800 transition">
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const meta           = getMeta(challenge.game_type)
  const challengerName = challenge.challenger?.name || 'A warrior'
  const scoreMode      = isScoreBased(challenge.game_type)
  const isOpen         = challenge.status === 'open'
  const isCompleted    = challenge.status === 'completed'
  const isExpired      = challenge.status === 'expired'

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[#f8f6f1]">
      <div className="mx-auto max-w-md lg:max-w-xl px-5 pt-6 pb-24 space-y-5">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-900">{branding.appName}</p>
          <button type="button" onClick={onClose}
            className="rounded-full border border-zinc-200 px-3 py-1 text-[10px] font-bold text-zinc-500 hover:bg-zinc-100">
            ✕ Close
          </button>
        </div>

        {/* Preview */}
        {phase === 'preview' && (
          <>
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-5 relative overflow-hidden">
              <div className="pointer-events-none absolute right-3 top-1 text-[80px] leading-none opacity-[0.06] select-none">
                {meta.icon}
              </div>
              <div className="relative z-10 space-y-4">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">
                  You've been challenged ⚔️
                </p>

                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-xl font-black text-white">
                    {(challengerName[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-base font-black text-white">{challengerName}</p>
                    <p className="text-[10px] font-semibold text-zinc-500">
                      Level {challenge.challenger?.level || 1} · 🔥 {challenge.challenger?.streak || 0} streak
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Game</span>
                    <span className="text-sm font-black text-white">{meta.icon} {meta.label}</span>
                  </div>
                  {scoreMode ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Score to beat</span>
                      <span className="text-2xl font-black text-white tabular-nums">{challenge.challenger_score}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{metricLabel(challenge.game_type)}</span>
                      <span className="text-sm font-black text-emerald-400">{formatMetric(challenge.game_type, challenge.challenger_metric)}</span>
                    </div>
                  )}
                  {challenge.xp_wager > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">XP wager</span>
                      <span className="text-sm font-black text-amber-400">💰 {challenge.xp_wager} XP</span>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-center">
                  <p className="text-xs font-semibold text-zinc-400 leading-relaxed">{meta.acceptTagline}</p>
                </div>

                {/* Already completed / expired — link is invalid */}
                {(isCompleted || isExpired) && (
                  <div className={`rounded-xl border px-3 py-3 text-center ${
                    isCompleted ? 'border-zinc-600 bg-zinc-900' : 'border-zinc-700 bg-zinc-900/50'
                  }`}>
                    <p className="text-xs font-black text-zinc-300">
                      {isCompleted
                        ? '✓ This challenge has already been played'
                        : '⏰ This challenge has expired'}
                    </p>
                    {isCompleted && challenge.winner && (
                      <p className="text-[10px] font-semibold text-zinc-500 mt-1">
                        Winner: {challenge.winner === 'challenger'
                          ? challengerName
                          : challenge.opponent?.name || 'Opponent'}
                        {' '}· Link is no longer valid
                      </p>
                    )}
                    <button type="button" onClick={onClose}
                      className="mt-3 rounded-xl bg-white/10 border border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-white/20 transition">
                      Go Home
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Actions — only for open challenges */}
            {isOpen && (
              <>
                {scoreMode && (
                  <>
                    <button type="button" onClick={() => setPhase('playing')}
                      className="w-full rounded-2xl bg-zinc-950 px-4 py-4 text-sm font-black uppercase tracking-wider text-white transition hover:bg-zinc-800 active:scale-[0.98]">
                      ⚔️ Accept — Play Now
                    </button>
                    {!isAuthenticated && (
                      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 space-y-2">
                        <p className="text-xs font-semibold text-zinc-600">
                          Playing as guest. Your result won't be saved. Create an account to submit your score.
                        </p>
                        <div className="flex gap-2">
                          <button type="button" onClick={onRegister}
                            className="flex-1 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-black text-white">Sign Up</button>
                          <button type="button" onClick={onLogin}
                            className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-600">Log In</button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!scoreMode && isAuthenticated && (
                  <div className="space-y-2">
                    <button type="button"
                      onClick={() => { if (onNavigateToGame) onNavigateToGame(meta.route, challengeId, challenge.seed) }}
                      className="w-full rounded-2xl bg-zinc-950 px-4 py-4 text-sm font-black uppercase tracking-wider text-white transition hover:bg-zinc-800 active:scale-[0.98]">
                      ⚔️ Accept — Play {meta.label}
                    </button>
                    <p className="text-center text-[10px] font-semibold text-zinc-500">
                      Complete the game to win the duel.
                      {challenge.xp_wager > 0 ? ` Win = +${challenge.xp_wager} XP transferred from their balance.` : ''}
                    </p>
                  </div>
                )}

                {!scoreMode && !isAuthenticated && (
                  <div className="rounded-3xl border border-zinc-200 bg-white p-5 space-y-3">
                    <p className="text-sm font-black text-zinc-950 leading-snug">
                      Play as guest to test your skills. Sign up to save your win.
                    </p>
                    <button type="button"
                      onClick={() => { if (onNavigateToGame) onNavigateToGame(meta.route, challengeId, challenge.seed) }}
                      className="w-full rounded-2xl bg-zinc-950 px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white active:scale-[0.98]">
                      Play as Guest
                    </button>
                    <div className="flex gap-2">
                      <button type="button" onClick={onRegister}
                        className="flex-1 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-black text-white">Sign Up</button>
                      <button type="button" onClick={onLogin}
                        className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-600">Log In</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Playing — inline quick math */}
        {phase === 'playing' && scoreMode && (
          <div className="space-y-3">
            <p className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Beat {challengerName}'s score of {challenge.challenger_score}
            </p>
            <QuickMathChallenge
              targetScore={challenge.challenger_score}
              challengerName={challengerName}
              onFinish={handleScoreFinish}
            />
          </div>
        )}

        {/* Submitting */}
        {phase === 'submitting' && (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-center">
            <p className="text-sm font-semibold text-zinc-600">Submitting your result...</p>
          </div>
        )}

        {/* Result — authenticated */}
        {phase === 'result' && yourScore !== null && (isAuthenticated || !guestPlayed) && (
          <ChallengeResultScreen
            challenge={challenge}
            yourScore={yourScore}
            yourMetric={yourMetric}
            isAuthenticated={isAuthenticated}
            xpGained={xpGained}
            onClose={onClose}
          />
        )}

        {/* Result — guest, prompt to sign up */}
        {phase === 'result' && guestPlayed && !isAuthenticated && (
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 space-y-3">
            <p className="text-sm font-black text-zinc-950 leading-snug">
              Sign up to see who won and claim or protect your XP.
            </p>
            <button type="button"
              onClick={() => {
                if (typeof onGuestAuthRequired === 'function') {
                  onGuestAuthRequired({ challengeId: normalizedChallengeId, score: yourScore, metric: yourMetric })
                }
                onRegister()
              }}
              className="w-full rounded-2xl bg-zinc-950 px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white active:scale-[0.98]">
              Sign Up to Continue
            </button>
            <button type="button"
              onClick={() => {
                if (typeof onGuestAuthRequired === 'function') {
                  onGuestAuthRequired({ challengeId: normalizedChallengeId, score: yourScore, metric: yourMetric })
                }
                onLogin()
              }}
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-600">
              Already have an account? Log In
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ChallengeCard — shared card component ────────────────────────────────────

function ChallengeCard({ c, viewAs, onCopy, copied }) {
  const meta         = getMeta(c.game_type)
  const isChallenger = c.is_challenger
  const isOpponent   = c.is_opponent

  const youWon      = (isChallenger && c.winner === 'challenger') || (isOpponent && c.winner === 'opponent')
  const tied        = c.winner === 'tie'
  const isCompleted = c.status === 'completed'
  const isExpired   = c.status === 'expired'
  const isOpen      = c.status === 'open'

  const opponentName = isChallenger
    ? (c.opponent?.name || 'Awaiting opponent')
    : (c.challenger?.name || 'Challenger')

  const myScore     = isChallenger ? c.challenger_score  : c.opponent_score
  const theirScore  = isChallenger ? c.opponent_score    : c.challenger_score
  const myMetric    = isChallenger ? c.challenger_metric : c.opponent_metric
  const theirMetric = isChallenger ? c.opponent_metric   : c.challenger_metric

  const wagerXp           = c.xp_wager || 0
  const actualTransferred = c.actual_xp_transferred || wagerXp

  // Card color based on result
  let cardBorder = 'border-zinc-200', cardBg = 'bg-white'
  if (isCompleted) {
    if (youWon)    { cardBorder = 'border-emerald-200'; cardBg = 'bg-emerald-50' }
    else if (tied) { cardBorder = 'border-zinc-200';    cardBg = 'bg-white' }
    else           { cardBorder = 'border-red-200';     cardBg = 'bg-red-50' }
  }
  if (isExpired) { cardBorder = 'border-zinc-100'; cardBg = 'bg-zinc-50' }

  return (
    <div className={`rounded-2xl border ${cardBorder} ${cardBg} px-4 py-4 space-y-3 ${isExpired ? 'opacity-60' : ''}`}>

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`text-xl shrink-0 ${isExpired ? 'grayscale' : ''}`}>{meta.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-black text-zinc-900 truncate">{meta.label}</p>
            <p className="text-[10px] font-semibold text-zinc-500 truncate">
              {viewAs === 'created' ? `vs ${opponentName}` : `by ${opponentName}`}
            </p>
          </div>
        </div>

        {/* Status badge / result */}
        {isOpen && (
          <span className="shrink-0 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700">
            Pending
          </span>
        )}
        {isCompleted && (
          <span className={`shrink-0 text-sm font-black ${youWon ? 'text-emerald-600' : tied ? 'text-zinc-500' : 'text-red-500'}`}>
            {youWon ? '🏆 WIN' : tied ? '= TIE' : '💀 LOSS'}
          </span>
        )}
        {isExpired && (
          <span className="shrink-0 rounded-full border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-zinc-500">
            Expired
          </span>
        )}
      </div>

      {/* Completed: score/metric + XP wager details */}
      {isCompleted && (
        <div className="rounded-xl border border-zinc-200 bg-white/70 px-3 py-2.5 space-y-1.5">
          {/* Score or metric row */}
          {isScoreBased(c.game_type) ? (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Score</span>
              <div className="flex items-center gap-2 tabular-nums">
                <span className={`text-lg font-black ${youWon ? 'text-emerald-600' : tied ? 'text-zinc-700' : 'text-red-500'}`}>
                  {myScore ?? '--'}
                </span>
                <span className="text-[10px] font-bold text-zinc-400">vs</span>
                <span className="text-lg font-black text-zinc-700">{theirScore ?? '--'}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                {isTimeBased(c.game_type) ? 'Time' : 'Rounds'}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-black ${youWon ? 'text-emerald-600' : tied ? 'text-zinc-700' : 'text-red-500'}`}>
                  {formatMetric(c.game_type, myMetric)}
                </span>
                <span className="text-[10px] font-bold text-zinc-400">vs</span>
                <span className="text-sm font-black text-zinc-700">{formatMetric(c.game_type, theirMetric)}</span>
              </div>
            </div>
          )}

          {/* XP wager outcome */}
          {wagerXp > 0 && (
            <div className="flex items-center justify-between pt-1.5 border-t border-zinc-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">XP Wager</span>
              {tied ? (
                <span className="text-[11px] font-black text-zinc-500">No transfer — tied</span>
              ) : youWon ? (
                <span className="text-[11px] font-black text-emerald-600">+{actualTransferred} XP gained 💰</span>
              ) : (
                <span className="text-[11px] font-black text-red-500">−{actualTransferred} XP lost 💸</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Open: show my result + resend */}
      {isOpen && (
        <div className="space-y-2">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-zinc-500">
              {isScoreBased(c.game_type)
                ? `Your score: ${c.challenger_score}`
                : `Your result: ${formatMetric(c.game_type, c.challenger_metric)}`}
              {wagerXp > 0 ? ` · 💰 ${wagerXp} XP wager` : ''}
            </span>
            <span className="text-[9px] font-black text-zinc-400 shrink-0 ml-2">{c.hours_remaining}h left</span>
          </div>
          <button type="button" onClick={() => onCopy(c.id)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-[11px] font-bold text-zinc-600 hover:bg-zinc-50 active:scale-95 transition">
            {copied === c.id ? '✓ Link Copied!' : '📤 Resend Challenge Link'}
          </button>
        </div>
      )}

      {/* Expired info */}
      {isExpired && viewAs === 'created' && (
        <p className="text-[10px] font-semibold text-zinc-400">
          No response within 48h · {timeAgo(c.created_at)}
        </p>
      )}

      {/* Completion timestamp */}
      {isCompleted && (
        <p className="text-[9px] font-semibold text-zinc-400">{timeAgo(c.completed_at)}</p>
      )}
    </div>
  )
}

// ─── MyChallengeDashboard ──────────────────────────────────────────────────────

export function MyChallengeDashboard({ authedFetch, onClose }) {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading]       = useState(true)
  const [copied, setCopied]         = useState(null)
  const [activeTab, setActiveTab]   = useState('created') // 'created' | 'played'

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = {
      bodyOverflow: document.body.style.overflow,
      bodyOverscroll: document.body.style.overscrollBehavior,
      htmlOverflow: document.documentElement.style.overflow,
      htmlOverscroll: document.documentElement.style.overscrollBehavior,
    }
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.overscrollBehavior = 'none'
    return () => {
      document.body.style.overflow = prev.bodyOverflow
      document.body.style.overscrollBehavior = prev.bodyOverscroll
      document.documentElement.style.overflow = prev.htmlOverflow
      document.documentElement.style.overscrollBehavior = prev.htmlOverscroll
    }
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await authedFetch('/api/challenges/')
        setChallenges(data.challenges || [])
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    load()
  }, [authedFetch])

  async function handleCopy(id) {
    await copyToClipboard(getShareUrl(id))
    setCopied(id)
    setTimeout(() => setCopied(null), 2500)
  }

  // Split by perspective
  const createdByMe = challenges.filter(c => c.is_challenger)
  const playedByMe  = challenges.filter(c => c.is_opponent)

  // Calculate win/loss/tie record for a list
  function getStats(list) {
    const completed = list.filter(c => c.status === 'completed')
    const wins   = completed.filter(c =>
      (c.is_challenger && c.winner === 'challenger') ||
      (c.is_opponent   && c.winner === 'opponent')
    ).length
    const losses = completed.filter(c =>
      (c.is_challenger && c.winner === 'opponent') ||
      (c.is_opponent   && c.winner === 'challenger')
    ).length
    const ties = completed.filter(c => c.winner === 'tie').length
    return { wins, losses, ties, total: completed.length }
  }

  const activeList  = activeTab === 'created' ? createdByMe : playedByMe
  const activeStats = getStats(activeList)

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] h-[100svh] overflow-y-auto overscroll-contain bg-[#f8f6f1]"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div
        className="mx-auto min-h-full w-full max-w-md lg:max-w-3xl px-5 pt-6 space-y-5"
        style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">1v1 Wars</p>
            <h1 className="text-2xl font-black text-zinc-950">My Challenges</h1>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-[10px] font-bold text-zinc-500 hover:bg-zinc-100 transition">
            ✕ Close
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-zinc-200 bg-zinc-100 p-1">
          {[
            { key: 'created', label: '⚔️ Created by Me', count: createdByMe.length },
            { key: 'played',  label: '🎮 Played by Me',  count: playedByMe.length },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl py-2.5 text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                  activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-zinc-300 text-zinc-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Win/Loss/Tie record — only shown when there are completed challenges */}
        {!loading && activeStats.total > 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2.5">
              Record — {activeStats.total} completed
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-center">
                <p className="text-2xl font-black text-emerald-600">{activeStats.wins}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">Wins</p>
              </div>
              <div className="h-8 w-px bg-zinc-100" />
              <div className="flex-1 text-center">
                <p className="text-2xl font-black text-red-500">{activeStats.losses}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">Losses</p>
              </div>
              <div className="h-8 w-px bg-zinc-100" />
              <div className="flex-1 text-center">
                <p className="text-2xl font-black text-zinc-500">{activeStats.ties}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">Ties</p>
              </div>
              <>
                <div className="h-8 w-px bg-zinc-100" />
                <div className="flex-1 text-center">
                  <p className="text-2xl font-black text-zinc-900">
                    {Math.round((activeStats.wins / activeStats.total) * 100)}%
                  </p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-0.5">Win %</p>
                </div>
              </>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-200" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && activeList.length === 0 && (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center space-y-3">
            <p className="text-4xl">{activeTab === 'created' ? '⚔️' : '🎮'}</p>
            <p className="text-base font-black text-zinc-900">
              {activeTab === 'created' ? 'No challenges created yet' : 'No challenges played yet'}
            </p>
            <p className="text-sm font-semibold text-zinc-500 leading-relaxed">
              {activeTab === 'created'
                ? 'Finish any game and tap "Challenge a Friend" to start a 1v1 duel.'
                : 'Accept a challenge link from another warrior to appear here.'}
            </p>
          </div>
        )}

        {/* Challenge cards grouped by status */}
        {!loading && activeList.length > 0 && (
          <div className="space-y-4">

            {/* Pending / Open */}
            {activeList.filter(c => c.status === 'open').length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">
                  Awaiting Response · {activeList.filter(c => c.status === 'open').length}
                </p>
                {activeList.filter(c => c.status === 'open').map(c => (
                  <ChallengeCard key={c.id} c={c} viewAs={activeTab} onCopy={handleCopy} copied={copied} />
                ))}
              </div>
            )}

            {/* Completed */}
            {activeList.filter(c => c.status === 'completed').length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">
                  Completed · {activeList.filter(c => c.status === 'completed').length}
                </p>
                {activeList.filter(c => c.status === 'completed').map(c => (
                  <ChallengeCard key={c.id} c={c} viewAs={activeTab} onCopy={handleCopy} copied={copied} />
                ))}
              </div>
            )}

            {/* Expired */}
            {activeList.filter(c => c.status === 'expired').length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">
                  Expired · {activeList.filter(c => c.status === 'expired').length}
                </p>
                {activeList.filter(c => c.status === 'expired').map(c => (
                  <ChallengeCard key={c.id} c={c} viewAs={activeTab} onCopy={handleCopy} copied={copied} />
                ))}
              </div>
            )}

          </div>
        )}

        <div aria-hidden="true" className="h-8" />
      </div>
    </div>,
    document.body,
  )
}
