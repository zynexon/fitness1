import { useEffect, useMemo, useRef, useState } from 'react'

const GRID_SIDE = 5
const GRID_SIZE = GRID_SIDE * GRID_SIDE
const ATTEMPT_SECONDS = 5
const ROUND_PATTERN_COUNT = {
  1: 7,
  2: 8,
  3: 9,
}
const TOTAL_ROUNDS = 3

function generatePattern(count) {
  const picks = new Set()

  while (picks.size < count) {
    picks.add(Math.floor(Math.random() * GRID_SIZE))
  }

  return Array.from(picks)
}

function SpeedPatternGame({
  onMainMenu,
  onGameStart,
  onGameFinished,
  submitting,
  awardedXp,
  resultMeta,
  errorText,
  challengeAction = null,
}) {
  const [currentRound, setCurrentRound] = useState(1)
  const [pattern, setPattern] = useState([])
  const [userSelection, setUserSelection] = useState([])
  const [timer, setTimer] = useState(0)
  const [phase, setPhase] = useState('idle')
  const [phaseDuration, setPhaseDuration] = useState(ATTEMPT_SECONDS)
  const [feedback, setFeedback] = useState(null)
  const [xpEarnedToday, setXpEarnedToday] = useState(0)

  const countdownRef = useRef(null)
  const timeoutRef = useRef(null)
  const hasReportedResultRef = useRef(false)
  const reportInFlightRef = useRef(false)
  const phaseRef = useRef('idle')
  const roundRef = useRef(1)
  const patternRef = useRef([])
  const selectionRef = useRef([])
  const attemptsRef = useRef(0)

  const patternSet = useMemo(() => new Set(pattern), [pattern])
  const selectionSet = useMemo(() => new Set(userSelection), [userSelection])
  const progressWidth = phaseDuration > 0 ? Math.max(0, Math.min(100, (timer / phaseDuration) * 100)) : 0

  useEffect(() => {
    if (resultMeta && typeof resultMeta.dailyCap === 'number' && typeof resultMeta.remainingToday === 'number') {
      setXpEarnedToday(Math.max(0, resultMeta.dailyCap - resultMeta.remainingToday))
    }
  }, [resultMeta])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    roundRef.current = currentRound
  }, [currentRound])

  useEffect(() => {
    patternRef.current = pattern
  }, [pattern])

  useEffect(() => {
    selectionRef.current = userSelection
  }, [userSelection])

  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        window.clearInterval(countdownRef.current)
      }
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  function clearTimers() {
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  function startCountdown(seconds, onComplete) {
    clearTimers()
    setPhaseDuration(seconds)
    setTimer(seconds)

    const startAt = Date.now()
    countdownRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startAt) / 1000
      const left = Math.max(0, seconds - elapsed)
      setTimer(left)
    }, 100)

    timeoutRef.current = window.setTimeout(() => {
      clearTimers()
      setTimer(0)
      onComplete()
    }, seconds * 1000)
  }

  function showPattern(duration) {
    setPhase('active')
    phaseRef.current = 'active'
    startCountdown(duration, () => {
      void validateSelection(true)
    })
  }

  function startRound(roundNumber) {
    const patternCount = ROUND_PATTERN_COUNT[roundNumber]
    if (!patternCount) {
      return
    }

    attemptsRef.current += 1

    const nextPattern = generatePattern(patternCount)
    setCurrentRound(roundNumber)
    roundRef.current = roundNumber
    setPattern(nextPattern)
    patternRef.current = nextPattern
    setUserSelection([])
    selectionRef.current = []
    showPattern(ATTEMPT_SECONDS)
  }

  function handleUserInput(cellIndex) {
    if (phase !== 'active') {
      return
    }

    setUserSelection((current) => {
      if (current.includes(cellIndex)) {
        const next = current.filter((index) => index !== cellIndex)
        selectionRef.current = next
        return next
      }
      const next = [...current, cellIndex]
      selectionRef.current = next
      return next
    })
  }

  async function awardXP() {
    if (hasReportedResultRef.current) {
      return true
    }

    if (reportInFlightRef.current) {
      return false
    }

    reportInFlightRef.current = true

    let submitted
    try {
      submitted = onGameFinished
        ? await onGameFinished({ outcome: 'win', score: 1, metric: attemptsRef.current })
        : false
    } catch {
      submitted = undefined
    } finally {
      reportInFlightRef.current = false
    }

    if (submitted === true) {
      hasReportedResultRef.current = true
      return true
    }

    if (submitted === false) {
      return false
    }

    return undefined
  }

  async function submitFinalWin() {
    setPhase('submitting')
    phaseRef.current = 'submitting'

    const submitted = await awardXP()
    if (submitted === true) {
      setPhase('success')
      phaseRef.current = 'success'
      return
    }

    if (submitted === false) {
      setFeedback({ type: 'error', message: 'No active session. Please restart the game.' })
      setPhase('idle')
      phaseRef.current = 'idle'
      return
    }

    timeoutRef.current = window.setTimeout(() => {
      void submitFinalWin()
    }, 350)
  }

  async function validateSelection(isTimeout = false) {
    if (phaseRef.current !== 'active' && !isTimeout) {
      return
    }

    clearTimers()

    const activeRound = roundRef.current
    const activePattern = patternRef.current
    const activeSelection = selectionRef.current
    const activePatternSet = new Set(activePattern)

    const hasAnySelection = activeSelection.length > 0
    const isCorrect = activeSelection.length === activePattern.length
      && activeSelection.every((index) => activePatternSet.has(index))

    if (isCorrect) {
      setFeedback({ type: 'success', message: `Round ${activeRound} cleared` })

      if (activeRound >= TOTAL_ROUNDS) {
        void submitFinalWin()
        return
      }

      startRound(activeRound + 1)
      return
    }

    if (isTimeout && !hasAnySelection) {
      setFeedback({ type: 'neutral', message: 'No input. New pattern loaded.' })
      startRound(activeRound)
      return
    }

    if (activeRound === 1) {
      setFeedback({ type: 'error', message: 'Wrong pattern. Try Round 1 again.' })
      startRound(1)
      return
    }

    setFeedback({ type: 'error', message: 'Wrong pattern. Back to Round 1.' })
    startRound(1)
  }

  async function handleStartGame() {
    resetGame(true)

    if (onGameStart) {
      const started = await onGameStart()
      if (!started) {
        setPhase('idle')
        return
      }
    }

    startRound(1)
  }

  function resetGame(silent = false) {
    clearTimers()
    setCurrentRound(1)
    roundRef.current = 1
    setPattern([])
    patternRef.current = []
    setUserSelection([])
    selectionRef.current = []
    setTimer(0)
    setPhaseDuration(ATTEMPT_SECONDS)
    setFeedback(null)
    hasReportedResultRef.current = false
    attemptsRef.current = 0
    if (!silent) {
      setPhase('idle')
      phaseRef.current = 'idle'
    }
  }

  function displayTopCell(index) {
    if (patternSet.has(index)) {
      return 'bg-zinc-900 border-zinc-900 animate-pulse'
    }

    return 'bg-white border-zinc-300'
  }

  function displayBottomCell(index) {
    if (selectionSet.has(index)) {
      return 'bg-blue-600 border-blue-600'
    }

    return 'bg-white border-zinc-300'
  }

  return (
    <section className="space-y-5">
      <button
        type="button"
        onClick={onMainMenu}
        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100"
      >
        ← Back
      </button>

      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-center">
        <h2 className="text-2xl font-black tracking-tight text-zinc-950">Speed Pattern</h2>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          See pattern and replicate it in real-time.
        </p>
      </div>

      {phase === 'idle' ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-center space-y-4">
          <p className="text-sm font-semibold text-zinc-600">Round 1: 7 cells, Round 2: 8 cells, Round 3: 9 cells.</p>
          <button
            type="button"
            onClick={handleStartGame}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
          >
            Start Speed Pattern
          </button>
        </div>
      ) : null}

      {phase !== 'idle' ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Round {currentRound}/3</p>
            <p className="text-sm font-bold text-zinc-800">{Math.ceil(timer)}s</p>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-2 rounded-full bg-zinc-900 transition-all duration-100"
              style={{ width: `${progressWidth}%` }}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Pattern Display</p>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: GRID_SIZE }, (_, index) => (
                <div
                  key={`top-${index}`}
                  className={`h-10 rounded-md border-2 transition-all duration-150 ${displayTopCell(index)}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Your Input</p>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: GRID_SIZE }, (_, index) => (
                <button
                  key={`bottom-${index}`}
                  type="button"
                  onClick={() => handleUserInput(index)}
                  disabled={phase !== 'active'}
                  className={`h-10 rounded-md border-2 transition-all duration-150 active:scale-95 disabled:cursor-not-allowed ${displayBottomCell(index)} ${selectionSet.has(index) ? 'shadow-sm' : ''}`}
                />
              ))}
            </div>
          </div>

          {feedback ? (
            <p className={`text-sm font-bold text-center ${feedback.type === 'success' ? 'text-emerald-600' : feedback.type === 'neutral' ? 'text-zinc-600' : 'text-red-600'}`}>
              {feedback.message}
            </p>
          ) : null}

          {typeof resultMeta?.dailyCap === 'number' ? (
            <p className="text-xs font-semibold text-zinc-500 text-center">
              XP today: {xpEarnedToday}/{resultMeta.dailyCap}
            </p>
          ) : null}
          {phase === 'submitting' ? (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl text-center space-y-2">
                <h3 className="text-xl font-black text-zinc-950">Submitting..</h3>
                <p className="text-sm font-semibold text-zinc-500">Validating your result and XP.</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {phase === 'success' ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl text-center space-y-3">
            <h3 className="text-2xl font-black text-zinc-950">Great Speed!</h3>
            <p className="text-sm font-semibold text-zinc-700">XP Earned: +25 XP</p>
            {submitting ? <p className="text-xs font-semibold text-zinc-500">Submitting result...</p> : null}
            {typeof awardedXp === 'number' ? (
              <p className="text-xs font-semibold text-zinc-500">Server XP awarded: +{awardedXp}</p>
            ) : null}
            {resultMeta?.cappedByDailyLimit ? (
              <p className="text-xs font-semibold text-amber-600">Cap reached today ✓</p>
            ) : null}
            {errorText ? <p className="text-xs font-semibold text-red-600">{errorText}</p> : null}
            {challengeAction ? <div className="pt-1">{challengeAction}</div> : null}

            <div className="pt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleStartGame}
                className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={onMainMenu}
                className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-900 transition hover:bg-zinc-100"
              >
                Go to Main Menu
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export { generatePattern }
export default SpeedPatternGame
