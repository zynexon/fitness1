import { useCallback, useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'

const COLOR_POOL = ['BLUE', 'RED', 'YELLOW', 'BLACK', 'PURPLE', 'GREEN']
const DAILY_CAP = 75
const TOTAL_ROUNDS = 3
const MAX_ATTEMPTS_PER_ROUND = 3

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

function randomInt(max) {
  return Math.floor(Math.random() * max)
}

function pickRandom(items) {
  return items[randomInt(items.length)]
}

function shuffle(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function sequenceKey(sequence) {
  return sequence.join('|')
}

function sequenceText(sequence) {
  return sequence.join(' - ')
}

function equalSequence(a, b) {
  if (a.length !== b.length) {
    return false
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false
    }
  }

  return true
}

function generateSequence(length) {
  return Array.from({ length }, () => pickRandom(COLOR_POOL))
}

function applyRule(sequence, rule) {
  const next = [...sequence]

  if (rule.type === 'remove_index') {
    next.splice(rule.index - 1, 1)
    return next
  }

  if (rule.type === 'reverse') {
    return next.reverse()
  }

  if (rule.type === 'move_last_to_first') {
    const last = next.pop()
    if (typeof last === 'undefined') {
      return next
    }
    next.unshift(last)
    return next
  }

  if (rule.type === 'move_first_to_last') {
    const first = next.shift()
    if (typeof first === 'undefined') {
      return next
    }
    next.push(first)
    return next
  }

  if (rule.type === 'swap') {
    const a = rule.a - 1
    const b = rule.b - 1
    ;[next[a], next[b]] = [next[b], next[a]]
    return next
  }

  if (rule.type === 'remove_color') {
    return next.filter((item) => item !== rule.color)
  }

  return next
}

function generateRuleCandidates(sequence) {
  const candidates = []
  const length = sequence.length

  if (length > 1) {
    candidates.push({ type: 'reverse', label: 'REVERSE' })
    candidates.push({ type: 'move_last_to_first', label: 'MOVE LAST TO FIRST' })
    candidates.push({ type: 'move_first_to_last', label: 'MOVE FIRST TO LAST' })
    const removeIndex = randomInt(length) + 1
    candidates.push({
      type: 'remove_index',
      index: removeIndex,
      label: `REMOVE ${removeIndex}`,
    })

    const a = randomInt(length) + 1
    let b = randomInt(length) + 1
    while (b === a) {
      b = randomInt(length) + 1
    }
    candidates.push({ type: 'swap', a, b, label: `SWAP ${a} & ${b}` })
  }

  const uniqueColors = [...new Set(sequence)]
  const removableColors = uniqueColors.filter((color) => sequence.some((item) => item !== color))
  if (removableColors.length > 0) {
    const color = pickRandom(removableColors)
    candidates.push({ type: 'remove_color', color, label: `REMOVE ${color}` })
  }

  return candidates
}

function generateRules(sequence) {
  const targetCount = randomInt(2) + 2
  const rules = []
  let current = [...sequence]
  let safety = 0

  while (rules.length < targetCount && safety < 20) {
    safety += 1
    const candidates = generateRuleCandidates(current)
    if (candidates.length === 0) {
      break
    }

    const selected = pickRandom(candidates)

    if (selected.type === 'remove_index') {
      selected.label = `REMOVE ${selected.index}`
    }

    const transformed = applyRule(current, selected)
    if (transformed.length === 0) {
      continue
    }

    rules.push(selected)
    current = transformed
  }

  return rules
}

function applyRules(sequence, rules) {
  return rules.reduce((current, rule) => applyRule(current, rule), [...sequence])
}

function generateOptions(correctAnswer, startSequence, rules) {
  const optionMap = new Map()

  function addOption(sequence) {
    if (!sequence || sequence.length === 0) {
      return
    }
    const key = sequenceKey(sequence)
    if (!optionMap.has(key)) {
      optionMap.set(key, sequence)
    }
  }

  addOption(correctAnswer)

  if (rules.length > 1) {
    addOption(applyRules(startSequence, rules.slice(0, -1)))
    addOption(applyRules(startSequence, [...rules].reverse()))
  }

  if (correctAnswer.length > 1) {
    addOption([...correctAnswer].reverse())

    const moveLastToFirst = [...correctAnswer]
    const last = moveLastToFirst.pop()
    if (typeof last !== 'undefined') {
      moveLastToFirst.unshift(last)
      addOption(moveLastToFirst)
    }

    const swapped = [...correctAnswer]
    const firstIndex = 0
    const secondIndex = Math.min(1, swapped.length - 1)
    ;[swapped[firstIndex], swapped[secondIndex]] = [swapped[secondIndex], swapped[firstIndex]]
    addOption(swapped)
  }

  let attempts = 0
  while (optionMap.size < 4 && attempts < 30) {
    attempts += 1
    const randomRule = pickRandom(generateRuleCandidates(correctAnswer))
    if (!randomRule) {
      break
    }
    addOption(applyRule(correctAnswer, randomRule))
  }

  while (optionMap.size < 4) {
    addOption(generateSequence(Math.max(1, correctAnswer.length)))
  }

  const uniqueOptions = Array.from(optionMap.values())
  return shuffle(uniqueOptions.slice(0, 4))
}

function validateAnswer(selectedOption, expected) {
  return equalSequence(selectedOption, expected)
}

function awardXP(previousXpToday, resultMeta) {
  const gained = resultMeta?.xpAwarded || 0
  const before = Number.isFinite(resultMeta?.todayGameXpBefore)
    ? resultMeta.todayGameXpBefore
    : previousXpToday
  const updated = Math.min(DAILY_CAP, before + gained)
  const capReached = Boolean(resultMeta?.cappedByDailyLimit) || updated >= DAILY_CAP

  if (capReached) {
    return {
      xpEarnedToday: updated,
      message: 'Daily XP limit reached',
    }
  }

  return {
    xpEarnedToday: updated,
    message: gained > 0 ? 'Correct' : 'No XP awarded',
  }
}

function buildPuzzle() {
  const length = randomInt(3) + 4
  const start = generateSequence(length)
  const rules = generateRules(start)
  const correct = applyRules(start, rules)
  const options = generateOptions(correct, start, rules)

  return {
    startSequence: start,
    rules,
    correctAnswer: correct,
    options,
  }
}

function ReverseOrderGame({ onMainMenu, onGameStart, onGameFinished, submitting, resultMeta, errorText, challengeAction = null }) {
  const attemptsRef = useRef(0)
  const [startSequence, setStartSequence] = useState([])
  const [rules, setRules] = useState([])
  const [correctAnswer, setCorrectAnswer] = useState([])
  const [options, setOptions] = useState([])
  const [selectedOption, setSelectedOption] = useState(null)
  const [xpEarnedToday, setXpEarnedToday] = useState(0)
  const [feedbackType, setFeedbackType] = useState('idle')
  const [feedbackText, setFeedbackText] = useState('')
  const [loadingQuestion, setLoadingQuestion] = useState(true)
  const [currentRound, setCurrentRound] = useState(1)
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS_PER_ROUND)
  const [completionResult, setCompletionResult] = useState(null)
  const [gameOverResult, setGameOverResult] = useState(null)

  const canChooseOption = !loadingQuestion && !submitting && feedbackType === 'idle' && !completionResult && !gameOverResult

  function loadPuzzle() {
    attemptsRef.current += 1
    const puzzle = buildPuzzle()
    setStartSequence(puzzle.startSequence)
    setRules(puzzle.rules)
    setCorrectAnswer(puzzle.correctAnswer)
    setOptions(puzzle.options)
  }

  const startThreeRoundGame = useCallback(async () => {
    setLoadingQuestion(true)
    setSelectedOption(null)
    setFeedbackType('idle')
    setFeedbackText('')
    setCurrentRound(1)
    setAttemptsLeft(MAX_ATTEMPTS_PER_ROUND)
    setCompletionResult(null)
    setGameOverResult(null)
    attemptsRef.current = 0

    try {
      loadPuzzle()
      const started = onGameStart ? await onGameStart() : true
      if (!started) {
        setFeedbackType('incorrect')
        setFeedbackText('Could not start a new game. Try again.')
      }
    } catch {
      setFeedbackType('incorrect')
      setFeedbackText('Could not start a new game. Try again.')
    } finally {
      setLoadingQuestion(false)
    }
  }, [onGameStart])

  useEffect(() => {
    void startThreeRoundGame()
  }, [])

  async function handleSelectOption(option, index) {
    if (!canChooseOption) {
      return
    }

    setSelectedOption(index)
    const isCorrect = validateAnswer(option, correctAnswer)

    if (!isCorrect) {
      const nextAttempts = attemptsLeft - 1
      setAttemptsLeft(nextAttempts)
      setFeedbackType('incorrect')
      if (nextAttempts <= 0) {
        setFeedbackText('Incorrect. Resetting this round.')
        window.setTimeout(() => {
          setAttemptsLeft(MAX_ATTEMPTS_PER_ROUND)
          setSelectedOption(null)
          setFeedbackType('idle')
          setFeedbackText('')
          loadPuzzle()
        }, 500)
        return
      }

      setFeedbackText(`Incorrect. New stack loaded. Attempts left: ${nextAttempts}`)
      window.setTimeout(() => {
        setSelectedOption(null)
        setFeedbackType('idle')
        setFeedbackText('')
        loadPuzzle()
      }, 900)
      return
    }

    if (currentRound < TOTAL_ROUNDS) {
      setFeedbackType('correct')
      setFeedbackText('Correct')
      window.setTimeout(() => {
        setCurrentRound((previous) => previous + 1)
        setAttemptsLeft(MAX_ATTEMPTS_PER_ROUND)
        setSelectedOption(null)
        setFeedbackType('idle')
        setFeedbackText('')
        loadPuzzle()
      }, 700)
      return
    }

    setFeedbackType('correct')
    setFeedbackText('Correct')

    const submitMeta = onGameFinished
      ? await onGameFinished({ score: 1, metric: attemptsRef.current })
      : null
    if (!submitMeta && onGameFinished) {
      setFeedbackType('incorrect')
      setFeedbackText('Could not submit result. Try again.')
      window.setTimeout(() => {
        setSelectedOption(null)
        setFeedbackType('idle')
        setFeedbackText('')
      }, 1000)
      return
    }

    const reward = awardXP(xpEarnedToday, submitMeta || resultMeta)
    setXpEarnedToday(reward.xpEarnedToday)
    setFeedbackText(
      reward.message === 'Daily XP limit reached'
        ? 'Correct. +15 XP. Daily XP limit reached'
        : 'Correct. +15 XP',
    )
    setCompletionResult({
      xpAwarded: submitMeta?.xpAwarded ?? resultMeta?.xpAwarded ?? 0,
      cappedByDailyLimit: Boolean(submitMeta?.cappedByDailyLimit ?? resultMeta?.cappedByDailyLimit),
      dailyCap: submitMeta?.dailyCap ?? resultMeta?.dailyCap,
      remainingToday: submitMeta?.remainingToday ?? resultMeta?.remainingToday,
    })
    fireConfetti()
  }

  function optionClass(index, option) {
    const isSelected = selectedOption === index
    const isCorrect = equalSequence(option, correctAnswer)

    if (feedbackType === 'correct' && isSelected) {
      return 'border-emerald-500 bg-emerald-50 text-emerald-700'
    }

    if (feedbackType === 'incorrect' && isCorrect) {
      return 'border-emerald-500 bg-emerald-50 text-emerald-700'
    }

    if (feedbackType === 'incorrect' && isSelected) {
      return 'border-red-500 bg-red-50 text-red-700'
    }

    if (isSelected) {
      return 'border-zinc-900 bg-zinc-900 text-white'
    }

    return 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400'
  }

  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={onMainMenu}
        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100"
      >
        ← Back
      </button>

      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-center">
        <h2 className="text-2xl font-black tracking-tight text-zinc-950">Reverse Order</h2>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-500 whitespace-nowrap">
          Apply rules. Pick final sequence.
        </p>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
          Round {currentRound}/{TOTAL_ROUNDS}
        </p>
        <p className="mt-1 text-[11px] font-semibold text-zinc-500">
          Attempts left this round: {attemptsLeft}
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm space-y-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Start</p>
          <p className="mt-2 text-sm font-bold text-zinc-900 break-words">{sequenceText(startSequence)}</p>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Rules</p>
          <div className="mt-2 space-y-1.5">
            {rules.map((rule, index) => (
              <p key={`${rule.label}-${index}`} className="text-sm font-semibold text-zinc-700">
                {index + 1}. {rule.label}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Options</p>
        {options.map((option, index) => (
          <button
            key={`${sequenceKey(option)}-${index}`}
            type="button"
            onClick={() => handleSelectOption(option, index)}
            disabled={!canChooseOption}
            className={`w-full rounded-xl border px-3 py-3 text-left text-sm font-bold transition ${optionClass(index, option)}`}
          >
            {sequenceText(option)}
          </button>
        ))}
      </div>

      {feedbackText ? (
        <p className={`text-sm font-bold ${feedbackType === 'correct' ? 'text-emerald-600' : 'text-red-600'}`}>
          {feedbackText}
        </p>
      ) : null}

      {loadingQuestion ? <p className="text-xs font-semibold text-zinc-500">Loading question...</p> : null}
      {errorText ? <p className="text-xs font-semibold text-red-600">{errorText}</p> : null}

      {submitting && !completionResult && !gameOverResult ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl text-center space-y-2">
            <h3 className="text-xl font-black text-zinc-950">Submitting Result</h3>
            <p className="text-sm font-semibold text-zinc-600">Finalizing your run...</p>
          </div>
        </div>
      ) : null}

      {completionResult ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl text-center space-y-3">
            <h3 className="text-2xl font-black text-zinc-950">Round Complete</h3>
            <p className="text-sm font-semibold text-zinc-600">You cleared all 3 rounds.</p>
            <p className="text-sm font-semibold text-zinc-600">XP earned: +{completionResult.xpAwarded}</p>
            {completionResult.cappedByDailyLimit ? (
              <p className="text-xs font-semibold text-amber-600">Cap reached today ✓</p>
            ) : null}
            {challengeAction ? <div className="pt-1">{challengeAction}</div> : null}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  void startThreeRoundGame()
                }}
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

      {gameOverResult ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl text-center space-y-3">
            <h3 className="text-2xl font-black text-zinc-950">Game Over</h3>
            <p className="text-sm font-semibold text-zinc-600">
              You used all {MAX_ATTEMPTS_PER_ROUND} attempts on round {gameOverResult.round}.
            </p>
            <p className="text-sm font-semibold text-zinc-600">No rewards this run.</p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  void startThreeRoundGame()
                }}
                className="flex-1 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
              >
                Try Again
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

export default ReverseOrderGame
