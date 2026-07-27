import { useEffect, useMemo, useRef, useState } from 'react'

const SEQUENCE_LENGTH = 7
const SHOW_DURATION_MS = 2000
const TOTAL_ROUNDS = 3

function createSequence(length = SEQUENCE_LENGTH) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10))
}

function NumberRecallGame({ onMainMenu, onGameStart, onGameFinished, submitting, awardedXp, resultMeta, errorText, challengeAction = null }) {
  const [sequence, setSequence] = useState([])
  const [userInput, setUserInput] = useState([])
  const [phase, setPhase] = useState('idle')
  const [currentRound, setCurrentRound] = useState(1)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [result, setResult] = useState(null)
  const [hasReportedResult, setHasReportedResult] = useState(false)

  const timerRef = useRef(null)
  const attemptsRef = useRef(0)
  const progressText = useMemo(() => `${userInput.length}/${sequence.length}`, [userInput.length, sequence.length])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  function startRound(roundNumber) {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }

    attemptsRef.current += 1

    const nextSequence = createSequence()
    setCurrentRound(roundNumber)
    setSequence(nextSequence)
    setUserInput([])
    setCurrentIndex(0)
    setPhase('show')

    timerRef.current = window.setTimeout(() => {
      setPhase('input')
    }, SHOW_DURATION_MS)
  }

  async function startGame() {
    setResult(null)
    setHasReportedResult(false)
    setCurrentRound(1)
    attemptsRef.current = 0

    if (onGameStart) {
      const started = await onGameStart()
      if (!started) {
        setPhase('idle')
        return
      }
    }

    startRound(1)
  }

  async function finalizeGame(nextResult) {
    if (hasReportedResult) {
      return
    }

    setPhase('submitting')
    setHasReportedResult(true)

    if (onGameFinished) {
      await onGameFinished({
        outcome: nextResult,
        score: nextResult === 'win' ? 1 : 0,
        metric: attemptsRef.current,
      })
    }

    setResult(nextResult)
    setPhase('result')
  }

  function handleInput(digit) {
    if (phase !== 'input') {
      return
    }

    if (digit === sequence[currentIndex]) {
      const nextInput = [...userInput, digit]
      const nextIndex = currentIndex + 1
      setUserInput(nextInput)
      setCurrentIndex(nextIndex)

      if (nextInput.length === sequence.length) {
        if (currentRound < TOTAL_ROUNDS) {
          setPhase('round-complete')
          timerRef.current = window.setTimeout(() => {
            startRound(currentRound + 1)
          }, 700)
          return
        }

        void finalizeGame('win')
      }
      return
    }

    setPhase('round-reset')
    timerRef.current = window.setTimeout(() => {
      startRound(currentRound)
    }, 900)
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
        <h2 className="text-2xl font-black tracking-tight text-zinc-950">Number Recall</h2>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Memorize 7 digits in 2 seconds
        </p>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
          Round {currentRound}/{TOTAL_ROUNDS}
        </p>
      </div>

      {phase === 'idle' ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-center space-y-4">
          <p className="text-sm font-semibold text-zinc-600">Fast memory challenge. Win grants up to +10 XP.</p>
          <button
            type="button"
            onClick={startGame}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
          >
            Start Number Recall
          </button>
        </div>
      ) : null}

      {phase === 'show' ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-center space-y-4">
          <p className="text-sm font-semibold text-zinc-600">Memorize this sequence</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {sequence.map((num, index) => (
              <div
                key={`${num}-${index}`}
                className="w-12 h-12 bg-indigo-500 text-white rounded-xl flex items-center justify-center text-xl font-bold"
              >
                {num}
              </div>
            ))}
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">It will hide in 2s</p>
        </div>
      ) : null}

      {phase === 'input' ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-600">Enter the sequence in order</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-zinc-400">Progress: {progressText}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleInput(num)}
                className="h-14 rounded-xl border border-zinc-300 bg-white text-lg font-bold text-zinc-900 active:scale-95 transition"
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {phase === 'round-complete' ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm text-center">
          <p className="text-sm font-bold text-emerald-700">Round cleared. Next round...</p>
        </div>
      ) : null}

      {phase === 'round-reset' ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm text-center">
          <p className="text-sm font-bold text-red-700">Wrong input. Resetting this round...</p>
        </div>
      ) : null}

      {phase === 'submitting' ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl text-center space-y-2">
            <h3 className="text-xl font-black text-zinc-950">Submitting..</h3>
            <p className="text-sm font-semibold text-zinc-500">Validating your result and XP.</p>
          </div>
        </div>
      ) : null}

      {phase === 'result' ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl text-center space-y-3">
            {result === 'win' ? (
              <h3 className="text-2xl font-black text-green-600">You cleared all 3 rounds 🎉</h3>
            ) : (
              <h3 className="text-2xl font-black text-red-600">Game Over ❌</h3>
            )}

            <p className="text-sm font-semibold text-zinc-600">Sequence: {sequence.join(' ')}</p>
            {submitting ? <p className="text-xs font-semibold text-zinc-500">Submitting result...</p> : null}
            {typeof awardedXp === 'number' ? (
              <p className="text-xs font-semibold text-zinc-500">Server XP awarded: +{awardedXp}</p>
            ) : null}
            {resultMeta?.cappedByDailyLimit ? (
              <p className="text-xs font-semibold text-amber-600">Cap reached today ✓</p>
            ) : null}
            {errorText ? <p className="text-xs font-semibold text-red-600">{errorText}</p> : null}
            {result === 'win' && challengeAction ? <div className="pt-1">{challengeAction}</div> : null}

            <div className="pt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={startGame}
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

export default NumberRecallGame
