import { useEffect, useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'

const TOTAL_TRIALS = 5
const MIN_DELAY_MS = 1500
const MAX_DELAY_MS = 4000
const XP_PER_GAME = 10
const DAILY_XP_CAP = 50
const MAX_GAMES_PER_DAY = 5

function fireConfetti() {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.6 },
    zIndex: 11000,
  })

  window.setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 100,
      origin: { y: 0.4 },
      zIndex: 11000,
    })
  }, 300)
}

function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

function getRandomDelayMs() {
  return MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1))
}

function buildProgressFromSource(source) {
  const dailyCap = Number(source?.dailyCap ?? source?.daily_cap ?? DAILY_XP_CAP)
  const remainingToday = Number(source?.remainingToday ?? source?.remaining_today)

  if (!Number.isFinite(dailyCap) || !Number.isFinite(remainingToday)) {
    return {
      dailyCap: DAILY_XP_CAP,
      xpEarnedToday: 0,
      gamesPlayedToday: 0,
    }
  }

  const safeCap = Math.max(0, dailyCap)
  const safeRemaining = Math.max(0, Math.min(safeCap, remainingToday))
  const xpEarnedToday = Math.max(0, safeCap - safeRemaining)
  const gamesPlayedToday = Math.min(MAX_GAMES_PER_DAY, Math.floor(xpEarnedToday / XP_PER_GAME))

  return {
    dailyCap: safeCap,
    xpEarnedToday,
    gamesPlayedToday,
  }
}

function ReactionTapGame({
  onMainMenu,
  onGameStart,
  onGameFinished,
  submitting = false,
  awardedXp = null,
  resultMeta = null,
  errorText = '',
  gameRemainingEntry = null,
  challengeAction = null,
}) {
  const initialProgress = useMemo(() => buildProgressFromSource(gameRemainingEntry), [gameRemainingEntry])

  const [currentTrial, setCurrentTrial] = useState(1)
  const [reactionTimes, setReactionTimes] = useState([])
  const [isWaiting, setIsWaiting] = useState(false)
  const [isReadyToTap, setIsReadyToTap] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [endTime, setEndTime] = useState(null)
  const [xpEarnedToday, setXpEarnedToday] = useState(initialProgress.xpEarnedToday)

  const [dailyCap, setDailyCap] = useState(initialProgress.dailyCap)
  const [gamesPlayedToday, setGamesPlayedToday] = useState(initialProgress.gamesPlayedToday)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameCompleted, setGameCompleted] = useState(false)
  const [latestReaction, setLatestReaction] = useState(null)
  const [feedbackText, setFeedbackText] = useState('Tap start to begin.')
  const [feedbackTone, setFeedbackTone] = useState('neutral')
  const [earlyFlash, setEarlyFlash] = useState(false)
  const [isSubmittingResult, setIsSubmittingResult] = useState(false)
  const [finalAwardedXp, setFinalAwardedXp] = useState(0)

  const trialTimeoutRef = useRef(null)
  const nextTrialTimeoutRef = useRef(null)
  const resetTrialTimeoutRef = useRef(null)
  const startTimeRef = useRef(null)
  const gameStartedRef = useRef(false)
  const gameCompletedRef = useRef(false)
  const isSubmittingResultRef = useRef(false)
  // This guard blocks accidental multi-taps in the same trial.
  const roundResolvedRef = useRef(false)

  useEffect(() => {
    const progress = buildProgressFromSource(resultMeta || gameRemainingEntry)
    setDailyCap(progress.dailyCap)
    setXpEarnedToday(progress.xpEarnedToday)
    setGamesPlayedToday(progress.gamesPlayedToday)
  }, [resultMeta, gameRemainingEntry])

  useEffect(() => {
    gameStartedRef.current = gameStarted
  }, [gameStarted])

  useEffect(() => {
    gameCompletedRef.current = gameCompleted
  }, [gameCompleted])

  useEffect(() => {
    isSubmittingResultRef.current = isSubmittingResult
  }, [isSubmittingResult])

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [])

  const averageReaction = useMemo(() => calculateAverage(reactionTimes), [reactionTimes])
  const bestReaction = useMemo(() => {
    if (!reactionTimes.length) {
      return null
    }
    return Math.min(...reactionTimes)
  }, [reactionTimes])

  const gamesLeftToday = Math.max(0, MAX_GAMES_PER_DAY - gamesPlayedToday)
  const xpRemainingToday = Math.max(0, dailyCap - xpEarnedToday)
  const dailyLimitReached = xpRemainingToday <= 0 || gamesLeftToday <= 0

  function clearTimers() {
    if (trialTimeoutRef.current) {
      window.clearTimeout(trialTimeoutRef.current)
      trialTimeoutRef.current = null
    }
    if (nextTrialTimeoutRef.current) {
      window.clearTimeout(nextTrialTimeoutRef.current)
      nextTrialTimeoutRef.current = null
    }
    if (resetTrialTimeoutRef.current) {
      window.clearTimeout(resetTrialTimeoutRef.current)
      resetTrialTimeoutRef.current = null
    }
  }

  async function startGame() {
    if (onGameStart) {
      const started = await onGameStart()
      if (started === false) {
        return
      }
    }

    clearTimers()
    roundResolvedRef.current = false
    startTimeRef.current = null
    gameStartedRef.current = true
    gameCompletedRef.current = false
    isSubmittingResultRef.current = false

    setCurrentTrial(1)
    setReactionTimes([])
    setIsWaiting(false)
    setIsReadyToTap(false)
    setStartTime(null)
    setEndTime(null)
    setLatestReaction(null)
    setGameCompleted(false)
    setGameStarted(true)
    setEarlyFlash(false)
    setIsSubmittingResult(false)
    setFinalAwardedXp(0)
    setFeedbackTone('neutral')
    setFeedbackText('Get ready...')

    startTrial()
  }

  function startTrial() {
    clearTimers()
    roundResolvedRef.current = false
    startTimeRef.current = null

    setIsWaiting(true)
    setIsReadyToTap(false)
    setStartTime(null)
    setEndTime(null)
    setEarlyFlash(false)
    setFeedbackTone('neutral')
    setFeedbackText('WAIT...')

    trialTimeoutRef.current = window.setTimeout(() => {
      triggerTapState()
    }, getRandomDelayMs())
  }

  function triggerTapState() {
    if (!gameStartedRef.current || gameCompletedRef.current || isSubmittingResultRef.current) {
      return
    }

    const preciseStart = nowMs()
    startTimeRef.current = preciseStart
    setStartTime(preciseStart)
    setIsWaiting(false)
    setIsReadyToTap(true)
    setFeedbackTone('neutral')
    setFeedbackText('TAP!')
  }

  function handleUserTap() {
    if (!gameStartedRef.current || gameCompletedRef.current || isSubmittingResultRef.current) {
      return
    }

    if (roundResolvedRef.current) {
      return
    }

    if (isReadyToTap) {
      roundResolvedRef.current = true

      const preciseEnd = nowMs()
      setEndTime(preciseEnd)
      setIsReadyToTap(false)
      setIsWaiting(false)

      const reactionTime = calculateReactionTime(preciseEnd)
      if (reactionTime === null) {
        resetTrial()
        return
      }

      setLatestReaction(reactionTime)
      setFeedbackTone('success')
      setFeedbackText(`${reactionTime} ms`)

      const nextTimes = [...reactionTimes, reactionTime]
      setReactionTimes(nextTimes)

      if (nextTimes.length >= TOTAL_TRIALS) {
        void endGame(nextTimes)
      } else {
        setCurrentTrial(nextTimes.length + 1)
        nextTrialTimeoutRef.current = window.setTimeout(() => {
          startTrial()
        }, 650)
      }
      return
    }

    if (isWaiting) {
      roundResolvedRef.current = true
      clearTimers()

      setEarlyFlash(true)
      setIsWaiting(false)
      setIsReadyToTap(false)
      setFeedbackTone('error')
      setFeedbackText('Too early!')

      resetTrialTimeoutRef.current = window.setTimeout(() => {
        resetTrial()
      }, 600)
    }
  }

  function calculateReactionTime(tapMoment = endTime) {
    const preciseStart = startTimeRef.current ?? startTime
    if (preciseStart === null || tapMoment === null) {
      return null
    }
    return Math.max(0, Math.round(tapMoment - preciseStart))
  }

  function calculateAverage(times = reactionTimes) {
    if (!times.length) {
      return 0
    }
    const total = times.reduce((sum, value) => sum + value, 0)
    return Math.round(total / times.length)
  }

  function resetTrial() {
    roundResolvedRef.current = false
    startTimeRef.current = null
    setStartTime(null)
    setEndTime(null)
    setIsWaiting(false)
    setIsReadyToTap(false)
    setEarlyFlash(false)

    if (gameStartedRef.current && !gameCompletedRef.current && !isSubmittingResultRef.current) {
      startTrial()
    }
  }

  async function endGame(finalTimes = reactionTimes) {
    clearTimers()
    gameStartedRef.current = false
    gameCompletedRef.current = true
    isSubmittingResultRef.current = true
    setGameStarted(false)
    setGameCompleted(true)
    setIsWaiting(false)
    setIsReadyToTap(false)
    setIsSubmittingResult(true)

    let submitMeta = null
    if (onGameFinished) {
      const average = calculateAverage(finalTimes)
      submitMeta = await onGameFinished({
        score: 1,
        averageReaction: average,
        metric: average,
        bestReaction: finalTimes.length ? Math.min(...finalTimes) : null,
        reactionTimes: finalTimes,
      })
    }

    setIsSubmittingResult(false)
    isSubmittingResultRef.current = false

    const progress = buildProgressFromSource(submitMeta || resultMeta || gameRemainingEntry)
    setDailyCap(progress.dailyCap)
    setXpEarnedToday(progress.xpEarnedToday)
    setGamesPlayedToday(progress.gamesPlayedToday)

    const awardedNow = Number(submitMeta?.xpAwarded ?? submitMeta?.xp_awarded ?? awardedXp ?? 0)
    setFinalAwardedXp(awardedNow)
    fireConfetti()

    if (awardedNow > 0) {
      setFeedbackTone('success')
      setFeedbackText(`+${awardedNow} XP earned`)
      return
    }

    if (progress.xpEarnedToday >= progress.dailyCap || progress.gamesPlayedToday >= MAX_GAMES_PER_DAY) {
      setFeedbackTone('warning')
      setFeedbackText('Daily XP limit reached')
      return
    }

    setFeedbackTone('neutral')
    setFeedbackText('Run complete.')
  }

  function trialStatusLabel() {
    if (!gameStarted && !gameCompleted) {
      return 'READY'
    }
    if (isReadyToTap) {
      return 'TAP!'
    }
    if (isWaiting) {
      return 'WAIT...'
    }
    if (gameCompleted) {
      return 'COMPLETE'
    }
    return '...'
  }

  const tapAreaClass = isReadyToTap
    ? 'border-zinc-900 bg-zinc-900 text-white'
    : earlyFlash
      ? 'border-red-700 bg-red-500 text-white'
      : isWaiting
        ? 'border-zinc-400 bg-zinc-200 text-zinc-700'
        : 'border-zinc-300 bg-white text-zinc-800'

  const popupAwardedXp = Number(finalAwardedXp || awardedXp || resultMeta?.xpAwarded || 0)

  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={onMainMenu}
        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100"
      >
        ← Back
      </button>

      <div className="rounded-3xl border border-zinc-200 bg-white p-5 text-center shadow-sm">
        <h2 className="text-2xl font-black tracking-tight text-zinc-950">Reaction Tap</h2>
        <p className="mt-1 text-sm font-semibold text-zinc-500">Tap the screen when it changes</p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Trials</p>
            <p className="mt-1 text-lg font-black text-zinc-900">{Math.min(currentTrial, TOTAL_TRIALS)}/{TOTAL_TRIALS}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Average</p>
            <p className="mt-1 text-lg font-black text-zinc-900">{averageReaction > 0 ? `${averageReaction} ms` : '--'}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUserTap}
          disabled={!gameStarted || gameCompleted || isSubmittingResult || submitting}
          className={`mt-5 flex h-56 w-full items-center justify-center rounded-3xl border text-4xl font-black tracking-tight transition ${tapAreaClass} ${!gameStarted || gameCompleted || isSubmittingResult || submitting ? 'cursor-default' : 'active:scale-[0.99]'}`}
        >
          {trialStatusLabel()}
        </button>

        <p className={`mt-3 text-sm font-semibold ${feedbackTone === 'error' ? 'text-red-600' : feedbackTone === 'warning' ? 'text-amber-600' : feedbackTone === 'success' ? 'text-emerald-600' : 'text-zinc-600'}`}>
          {feedbackText}
        </p>

        {latestReaction !== null ? (
          <p className="mt-1 text-xs font-semibold text-zinc-500">Latest reaction: {latestReaction} ms</p>
        ) : null}

        {bestReaction !== null ? (
          <p className="mt-1 text-xs font-semibold text-zinc-500">Best reaction: {bestReaction} ms</p>
        ) : null}

        {!gameStarted && !gameCompleted ? (
          <button
            type="button"
            onClick={() => {
              void startGame()
            }}
            className="mt-4 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-black text-white transition hover:bg-zinc-800 disabled:opacity-60"
            disabled={isSubmittingResult || submitting}
          >
            Start 5-Trial Run
          </button>
        ) : null}

        {!gameStarted && !gameCompleted && dailyLimitReached ? (
          <p className="mt-2 text-xs font-semibold text-amber-600">Cap reached today ✓</p>
        ) : null}

        {errorText ? <p className="mt-2 text-xs font-semibold text-red-600">{errorText}</p> : null}
      </div>

      {(isSubmittingResult || submitting) && gameCompleted ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl text-center space-y-2">
            <h3 className="text-xl font-black text-zinc-950">Submitting..</h3>
            <p className="text-sm font-semibold text-zinc-500">Validating your result and XP.</p>
          </div>
        </div>
      ) : null}

      {gameCompleted && !(isSubmittingResult || submitting) ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl text-center space-y-3">
            <h3 className="text-2xl font-black text-zinc-950">Round Complete</h3>
            <p className="text-sm font-semibold text-zinc-600">Average: {averageReaction} ms</p>
            <p className="text-sm font-semibold text-zinc-600">Best: {bestReaction ?? '--'} ms</p>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Reaction times</p>
              <p className="mt-1 text-xs font-semibold text-zinc-700">{reactionTimes.join(' • ')} ms</p>
            </div>

            {popupAwardedXp > 0 ? (
              <p className="text-sm font-semibold text-zinc-600">XP earned: +{popupAwardedXp}</p>
            ) : (
              <p className="text-xs font-semibold text-amber-600">Cap reached today ✓</p>
            )}
            {challengeAction ? <div className="pt-1">{challengeAction}</div> : null}

            <div className="pt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  void startGame()
                }}
                className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={onMainMenu}
                className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-900 transition hover:bg-zinc-100"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default ReactionTapGame
