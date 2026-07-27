import { useEffect, useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'

const ROWS = 4
const COLS = 7
const GRID_SIZE = ROWS * COLS
const TOTAL_ROUNDS = 15
const COLORS = ['purple', 'blue', 'red']

function randomInt(max) {
  return Math.floor(Math.random() * max)
}

function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

function pickRandom(items) {
  return items[randomInt(items.length)]
}

function makeEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => ({ color: null }))
}

function generateGrid(roundNumber) {
  const nextGrid = makeEmptyGrid()
  const targetColor = pickRandom(COLORS)

  const availableIndices = Array.from({ length: GRID_SIZE }, (_, index) => index)
  const correctPosition = randomInt(availableIndices.length)
  const correctIndex = availableIndices.splice(correctPosition, 1)[0]
  nextGrid[correctIndex] = { color: targetColor }

  let distractorCount = 0
  if (roundNumber > 10) {
    distractorCount = 2
  } else if (roundNumber > 5) {
    distractorCount = 1
  }

  for (let i = 0; i < distractorCount; i += 1) {
    if (availableIndices.length === 0) {
      break
    }

    const pickPosition = randomInt(availableIndices.length)
    const distractorIndex = availableIndices.splice(pickPosition, 1)[0]
    const distractorPalette = COLORS.filter((color) => color !== targetColor)
    nextGrid[distractorIndex] = { color: pickRandom(distractorPalette) }
  }

  return { nextGrid, targetColor }
}

function circleColorClass(color) {
  if (color === 'purple') {
    return 'bg-purple-500 border-purple-500'
  }
  if (color === 'blue') {
    return 'bg-blue-500 border-blue-500'
  }
  if (color === 'red') {
    return 'bg-red-500 border-red-500'
  }
  return 'border-zinc-300 bg-white'
}

function fireConfetti() {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.6 },
    zIndex: 11000,
  })

  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 100,
      origin: { y: 0.4 },
      zIndex: 11000,
    })
  }, 300)
}

function FocusTapGame({ onMainMenu, onGameStart, onGameFinished, submitting, awardedXp, resultMeta, errorText, challengeAction = null }) {
  const initialState = useMemo(() => generateGrid(1), [])

  const [round, setRound] = useState(1)
  const [grid, setGrid] = useState(initialState.nextGrid)
  const [targetColor, setTargetColor] = useState(initialState.targetColor)
  const [gameOver, setGameOver] = useState(false)
  const [gameWon, setGameWon] = useState(false)
  const [isSubmittingResult, setIsSubmittingResult] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)

  const startTimeRef = useRef(null)
  const timerRef = useRef(null)

  const remainingRounds = TOTAL_ROUNDS - round + 1

  useEffect(() => {
    if (onGameStart) {
      void onGameStart()
    }
    startTimer()
    return () => stopTimer()
  }, [])

  function startTimer() {
    stopTimer()
    startTimeRef.current = nowMs()
    setElapsedMs(0)
    timerRef.current = window.setInterval(() => {
      if (startTimeRef.current === null) {
        return
      }
      const nextElapsed = Math.max(0, Math.round(nowMs() - startTimeRef.current))
      setElapsedMs(nextElapsed)
    }, 100)
  }

  function stopTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function restartGame() {
    const fresh = generateGrid(1)
    setRound(1)
    setGrid(fresh.nextGrid)
    setTargetColor(fresh.targetColor)
    setGameOver(false)
    setGameWon(false)
    setIsSubmittingResult(false)
    startTimer()
    if (onGameStart) {
      void onGameStart()
    }
  }

  async function handleTap(cell) {
    if (gameOver || gameWon || isSubmittingResult) {
      return
    }

    if (cell.color === targetColor) {
      if (round === TOTAL_ROUNDS) {
        setIsSubmittingResult(true)
        stopTimer()
        const completedInMs = startTimeRef.current
          ? Math.max(0, Math.round(nowMs() - startTimeRef.current))
          : elapsedMs
        setElapsedMs(completedInMs)
        if (onGameFinished) {
          await onGameFinished({ outcome: 'won', score: TOTAL_ROUNDS, metric: completedInMs })
        }
        setIsSubmittingResult(false)
        setGameWon(true)
        fireConfetti()
        return
      }

      const nextRound = round + 1
      const next = generateGrid(nextRound)
      setRound(nextRound)
      setGrid(next.nextGrid)
      setTargetColor(next.targetColor)
      return
    }

    stopTimer()
    setIsSubmittingResult(true)
    if (onGameFinished) {
      await onGameFinished({ outcome: 'lost', score: Math.max(0, round - 1), metric: null })
    }
    setIsSubmittingResult(false)
    setGameOver(true)
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

      {!gameOver && !gameWon ? (
        <>
          <div className="text-center pt-2">
            <h2 className="text-3xl font-black leading-tight tracking-tight text-zinc-950">Don't Tap the Distractors</h2>
            <p className="mt-2 text-sm font-semibold text-zinc-500">
              Tap ONLY the <span className="font-black uppercase text-zinc-900">{targetColor}</span> circle. {remainingRounds} to go!
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-zinc-400">Round {round}/{TOTAL_ROUNDS}</p>
            <p className="mt-1 text-[11px] font-semibold text-zinc-500">Time: {(elapsedMs / 1000).toFixed(1)}s</p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-7 gap-3">
              {grid.map((cell, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleTap(cell)}
                  className={`h-10 w-10 rounded-full border transition active:scale-95 ${circleColorClass(cell.color)}`}
                  aria-label={`circle-${index + 1}`}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}

      {isSubmittingResult ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl text-center space-y-2">
            <h3 className="text-xl font-black text-zinc-950">Submitting..</h3>
            <p className="text-sm font-semibold text-zinc-500">Validating your result and XP.</p>
          </div>
        </div>
      ) : null}

      {gameOver ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl text-center space-y-3">
            <h3 className="text-2xl font-black text-zinc-950">Game Over!</h3>
            <p className="text-sm font-semibold text-zinc-600">You tapped a distractor.</p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={restartGame}
                className="flex-1 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={onMainMenu}
                className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-900 transition hover:bg-zinc-100"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {gameWon ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl text-center space-y-3">
            <h3 className="text-2xl font-black text-zinc-950">You completed all 15 rounds</h3>
            <p className="text-sm font-semibold text-zinc-600">Focus Tap clear reward: up to +10 XP</p>
            {submitting ? <p className="text-xs font-semibold text-zinc-500">Submitting result...</p> : null}
            {typeof awardedXp === 'number' ? (
              <p className="text-xs font-semibold text-zinc-500">Server XP awarded: +{awardedXp}</p>
            ) : null}
            {resultMeta?.cappedByDailyLimit ? (
              <p className="text-xs font-semibold text-amber-600">Cap reached today ✓</p>
            ) : null}
            {errorText ? <p className="text-xs font-semibold text-red-600">{errorText}</p> : null}
            {challengeAction ? <div className="pt-1">{challengeAction}</div> : null}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={restartGame}
                className="flex-1 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={onMainMenu}
                className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-900 transition hover:bg-zinc-100"
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

export default FocusTapGame
