import { useEffect, useMemo, useRef, useState } from 'react'

const COLORS = ['blue', 'green', 'red']
const TOTAL_ROUNDS = 8
const GRID_SIZE = 16
const EMPTY_GRID = Array.from({ length: GRID_SIZE }, () => null)

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function buildRoundGrid() {
  let grid = []
  let activeColors = []

  while (activeColors.length === 0) {
    grid = Array.from({ length: GRID_SIZE }, () => {
      const isActive = Math.random() < 0.4
      if (!isActive) {
        return null
      }

      return randomItem(COLORS)
    })

    activeColors = grid.filter((color) => color !== null)
  }

  return grid
}

function colorClass(color) {
  if (color === 'blue') {
    return 'bg-blue-500 border-blue-500'
  }
  if (color === 'green') {
    return 'bg-green-500 border-green-500'
  }
  if (color === 'red') {
    return 'bg-red-500 border-red-500'
  }
  return 'bg-white border-zinc-300'
}

function targetColorTextClass(color) {
  if (color === 'blue') {
    return 'text-blue-500'
  }
  if (color === 'green') {
    return 'text-green-500'
  }
  return 'text-red-500'
}

function countColor(grid, target) {
  return grid.filter((color) => color === target).length
}

function buildOptions(correct) {
  const options = [correct]

  while (options.length < 3) {
    const wrong = Math.max(0, correct + Math.floor(Math.random() * 5) - 2)
    if (!options.includes(wrong)) {
      options.push(wrong)
    }
  }

  return options.sort(() => Math.random() - 0.5)
}

function ColorCountFocusGame({ onMainMenu, onGameStart, onGameFinished, submitting, awardedXp, resultMeta, errorText, challengeAction = null }) {
  const [grid, setGrid] = useState(EMPTY_GRID)
  const [targetColor, setTargetColor] = useState('blue')
  const [correctCount, setCorrectCount] = useState(0)
  const [options, setOptions] = useState([])
  const [round, setRound] = useState(1)
  const [phase, setPhase] = useState('idle')
  const [result, setResult] = useState(null)

  const showTimeoutRef = useRef(null)
  const nextRoundTimeoutRef = useRef(null)
  const isRoundLockedRef = useRef(false)
  const attemptsRef = useRef(0)

  const targetUpper = useMemo(() => targetColor.toUpperCase(), [targetColor])
  const isTransitionPhase = phase === 'transition'

  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) {
        window.clearTimeout(showTimeoutRef.current)
      }
      if (nextRoundTimeoutRef.current) {
        window.clearTimeout(nextRoundTimeoutRef.current)
      }
    }
  }, [])

  async function startRound(roundNumber, skipStartCall = false) {
    if (showTimeoutRef.current) {
      window.clearTimeout(showTimeoutRef.current)
    }
    if (nextRoundTimeoutRef.current) {
      window.clearTimeout(nextRoundTimeoutRef.current)
    }

    if (!skipStartCall && onGameStart) {
      const started = await onGameStart()
      if (!started) {
        setPhase('idle')
        return
      }
    }

    attemptsRef.current += 1

    const nextGrid = buildRoundGrid()
    const activeColors = nextGrid.filter((color) => color !== null)
    const nextTargetColor = randomItem(activeColors)
    const nextCorrectCount = countColor(nextGrid, nextTargetColor)

    setRound(roundNumber)
    setGrid(nextGrid)
    setTargetColor(nextTargetColor)
    setCorrectCount(nextCorrectCount)
    setOptions(buildOptions(nextCorrectCount))
    setPhase('show')
    isRoundLockedRef.current = false

    showTimeoutRef.current = window.setTimeout(() => {
      setPhase('input')
    }, 1000)
  }

  async function startGame() {
    // Leave result phase immediately so the modal disappears without a blink.
    setPhase('transition')
    setGrid(EMPTY_GRID)
    setOptions([])
    setResult(null)
    attemptsRef.current = 0
    await startRound(1)
  }

  async function finalizeGame(nextResult, finalScore) {
    setPhase('submitting')

    if (onGameFinished) {
      await onGameFinished({
        outcome: nextResult,
        score: finalScore,
        metric: attemptsRef.current,
      })
    }

    setResult(nextResult)
    setPhase('result')
  }

  function handleAnswer(value) {
    if (phase !== 'input' || isRoundLockedRef.current) {
      return
    }

    isRoundLockedRef.current = true

    if (value === correctCount) {
      if (round === TOTAL_ROUNDS) {
        void finalizeGame('win', TOTAL_ROUNDS)
        return
      }

      // Clear old round state immediately so stale colors never blink before next flash.
      setPhase('transition')
      setGrid(EMPTY_GRID)
      setOptions([])
      nextRoundTimeoutRef.current = window.setTimeout(() => {
        void startRound(round + 1, true)
      }, 300)
      return
    }

    setPhase('round-reset')
    setGrid(EMPTY_GRID)
    setOptions([])
    nextRoundTimeoutRef.current = window.setTimeout(() => {
      void startRound(round, true)
    }, 650)
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
        <h2 className="text-2xl font-black tracking-tight text-zinc-950">Color Count Focus</h2>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Count fast. Choose right.
        </p>
      </div>

      {phase === 'idle' ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-center space-y-4">
          <p className="text-sm font-semibold text-zinc-600">Watch flashes for 1 second and count the target color.</p>
          <button
            type="button"
            onClick={startGame}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
          >
            Start Color Count Focus
          </button>
        </div>
      ) : null}

      {phase !== 'idle' ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
          <div className="text-center">
            {isTransitionPhase ? (
              <h3 className="text-xl font-bold text-zinc-900">Count the color</h3>
            ) : (
              <h3 className="text-xl font-bold text-zinc-900">
                Count the <span className={`${targetColorTextClass(targetColor)} font-black`}>{targetUpper}</span>
              </h3>
            )}
            {isTransitionPhase ? (
              <p className="text-sm text-zinc-500 mt-1">Get ready for the next flash.</p>
            ) : (
              <p className="text-sm text-zinc-500 mt-1">
                Watch carefully! Target color now: <span className={`${targetColorTextClass(targetColor)} font-semibold`}>{targetUpper}</span>
              </p>
            )}
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mt-2">
              {round} / {TOTAL_ROUNDS}
            </p>
          </div>

          <div className={`grid grid-cols-4 gap-3 justify-items-center ${phase === 'input' ? 'transition-opacity duration-300 opacity-80' : ''}`}>
            {(phase === 'input' ? Array.from({ length: GRID_SIZE }, () => null) : grid).map((color, index) => (
              <div
                key={index}
                className={`h-12 w-12 rounded-full border-2 ${colorClass(color)} ${phase === 'show' && color ? 'animate-flash' : ''}`}
              />
            ))}
          </div>

          {phase === 'input' ? (
            <div className="flex justify-center gap-4 mt-2">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleAnswer(option)}
                  className="min-w-16 px-6 py-3 border border-zinc-300 rounded-xl text-lg font-bold text-zinc-900 active:scale-95 transition"
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {phase === 'round-reset' ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm text-center">
          <p className="text-sm font-bold text-red-700">Wrong count. Resetting round {round}...</p>
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
              <h3 className="text-2xl font-black text-green-600">Perfect Focus 🔥</h3>
            ) : (
              <h3 className="text-lg font-black text-red-600">
                Wrong! {correctCount} {targetUpper} circles flashed.
              </h3>
            )}

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

export default ColorCountFocusGame
