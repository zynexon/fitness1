import { useCallback, useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'

// ─── Shape renderer ───────────────────────────────────────────────────────────
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'pentagon', 'star']
const COLORS = ['#111827', '#60a5fa', '#f472b6', '#34d399', '#fb923c', '#a78bfa']
const COLOR_NAMES = ['Black', 'Blue', 'Pink', 'Green', 'Orange', 'Purple']
const SIZES = [28, 38, 50]
const SIZE_NAMES = ['Small', 'Medium', 'Large']

function ShapeIcon({ shape, size = 40, color = '#e4e4e7', filled = true }) {
  const s = size
  const half = s / 2
  const stroke = filled ? 'none' : color
  const fill = filled ? color : 'none'
  const sw = 2.5

  if (shape === 'circle') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={half} cy={half} r={half * 0.82} fill={fill} stroke={stroke} strokeWidth={sw} />
      </svg>
    )
  }
  if (shape === 'square') {
    const pad = s * 0.1
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <rect x={pad} y={pad} width={s - pad * 2} height={s - pad * 2} rx={3} fill={fill} stroke={stroke} strokeWidth={sw} />
      </svg>
    )
  }
  if (shape === 'triangle') {
    const pad = s * 0.06
    const pts = `${half},${pad} ${s - pad},${s - pad} ${pad},${s - pad}`
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />
      </svg>
    )
  }
  if (shape === 'diamond') {
    const pad = s * 0.06
    const pts = `${half},${pad} ${s - pad},${half} ${half},${s - pad} ${pad},${half}`
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />
      </svg>
    )
  }
  if (shape === 'pentagon') {
    const r = half * 0.84
    const pts = Array.from({ length: 5 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
      return `${half + r * Math.cos(angle)},${half + r * Math.sin(angle)}`
    }).join(' ')
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />
      </svg>
    )
  }
  if (shape === 'star') {
    const outerR = half * 0.88
    const innerR = half * 0.38
    const pts = Array.from({ length: 10 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2
      const r = i % 2 === 0 ? outerR : innerR
      return `${half + r * Math.cos(angle)},${half + r * Math.sin(angle)}`
    }).join(' ')
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />
      </svg>
    )
  }
  return null
}

// ─── Pattern engine ───────────────────────────────────────────────────────────
// Each generator returns { sequence: [item...], answer: item, explain: string }
// item = { type: 'number'|'shape'|'multi', value, label, ... }

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Number patterns ────────────────────────────────────────────────────────────

function genArithmetic() {
  const start = rndInt(1, 20)
  const step  = rndInt(2, 9) * (Math.random() < 0.3 ? -1 : 1)
  const seq   = [start, start + step, start + step * 2, start + step * 3]
  return {
    sequence: seq.slice(0, 3).map(v => ({ type: 'number', value: v, label: String(v) })),
    answer:   { type: 'number', value: seq[3], label: String(seq[3]) },
    explain:  `Each number ${step > 0 ? 'increases' : 'decreases'} by ${Math.abs(step)}`,
    rule:     `${step > 0 ? '+' : ''}${step} each step`,
  }
}

function genGeometric() {
  const start  = rndInt(1, 6)
  const factor = rndInt(2, 4)
  const seq    = [start, start * factor, start * factor ** 2, start * factor ** 3]
  if (seq[3] > 9999) return genArithmetic()
  return {
    sequence: seq.slice(0, 3).map(v => ({ type: 'number', value: v, label: String(v) })),
    answer:   { type: 'number', value: seq[3], label: String(seq[3]) },
    explain:  `Each number is multiplied by ${factor}`,
    rule:     `×${factor} each step`,
  }
}

function genSquares() {
  const offset = rndInt(0, 4)
  const seq    = [1, 2, 3, 4].map(n => (n + offset) ** 2)
  return {
    sequence: seq.slice(0, 3).map(v => ({ type: 'number', value: v, label: String(v) })),
    answer:   { type: 'number', value: seq[3], label: String(seq[3]) },
    explain:  `Perfect squares: ${offset + 1}², ${offset + 2}², ${offset + 3}²…`,
    rule:     'n² sequence',
  }
}

function genFibonacci() {
  const a = rndInt(1, 5), b = rndInt(1, 8)
  const c = a + b, d = b + c
  return {
    sequence: [a, b, c].map(v => ({ type: 'number', value: v, label: String(v) })),
    answer:   { type: 'number', value: d, label: String(d) },
    explain:  `Each number is the sum of the previous two`,
    rule:     'Fibonacci-style',
  }
}

function genDoubleStep() {
  // Alternating two different steps: +3, +5, +3, +5...
  const start = rndInt(2, 15)
  const s1 = rndInt(2, 6), s2 = rndInt(2, 6)
  const seq = [start, start + s1, start + s1 + s2, start + s1 * 2 + s2]
  return {
    sequence: seq.slice(0, 3).map(v => ({ type: 'number', value: v, label: String(v) })),
    answer:   { type: 'number', value: seq[3], label: String(seq[3]) },
    explain:  `Alternating steps: +${s1}, +${s2}, +${s1}…`,
    rule:     `+${s1}, +${s2} alternating`,
  }
}

function genPrimeDiffs() {
  // Differences are primes: 2,3,5,7
  const primes = [2, 3, 5, 7, 11, 13]
  const start  = rndInt(5, 20)
  const usedPrimes = [primes[rndInt(0,3)], primes[rndInt(1,4)], primes[rndInt(2,5)]]
  const seq = [start]
  usedPrimes.forEach(p => seq.push(seq[seq.length - 1] + p))
  return {
    sequence: seq.slice(0, 3).map(v => ({ type: 'number', value: v, label: String(v) })),
    answer:   { type: 'number', value: seq[3], label: String(seq[3]) },
    explain:  `Differences are prime numbers: ${usedPrimes.join(', ')}`,
    rule:     'Prime differences',
  }
}

function genSecondOrder() {
  // Second differences are constant: diffs grow by fixed amount
  const start = rndInt(1, 10)
  const d0    = rndInt(1, 4) // first difference
  const dd    = rndInt(1, 3) // second difference (constant)
  const seq   = [start, start + d0, start + d0 + (d0 + dd), start + d0 + (d0 + dd) + (d0 + dd * 2)]
  return {
    sequence: seq.slice(0, 3).map(v => ({ type: 'number', value: v, label: String(v) })),
    answer:   { type: 'number', value: seq[3], label: String(seq[3]) },
    explain:  `The gaps between numbers grow by ${dd} each time`,
    rule:     'Second-order arithmetic',
  }
}

// ── Shape patterns ─────────────────────────────────────────────────────────────

function genShapeRotation() {
  // Shapes rotate through a fixed list
  const pool = shuffle(SHAPES).slice(0, 3)
  const seq  = [pool[0], pool[1], pool[2], pool[0]] // cycles back
  const color = rnd(COLORS)
  return {
    sequence: seq.slice(0, 3).map(s => ({ type: 'shape', shape: s, color, size: 44, label: s })),
    answer:   { type: 'shape', shape: seq[3], color, size: 44, label: seq[3] },
    explain:  `Shapes cycle: ${pool[0]} → ${pool[1]} → ${pool[2]} → back to ${pool[0]}`,
    rule:     'Cycling shapes',
  }
}

function genColorCycle() {
  const shape    = rnd(SHAPES)
  const colorIdx = [rndInt(0, 5), rndInt(0, 5), rndInt(0, 5)]
  // ensure all different
  while (colorIdx[1] === colorIdx[0]) colorIdx[1] = rndInt(0, 5)
  while (colorIdx[2] === colorIdx[1] || colorIdx[2] === colorIdx[0]) colorIdx[2] = rndInt(0, 5)
  const next = colorIdx[0] // cycles back
  return {
    sequence: colorIdx.map(i => ({ type: 'shape', shape, color: COLORS[i], size: 44, label: COLOR_NAMES[i] })),
    answer:   { type: 'shape', shape, color: COLORS[next], size: 44, label: COLOR_NAMES[next] },
    explain:  `Colors cycle back to the first`,
    rule:     'Color cycle',
  }
}

function genSizeGrow() {
  const shape  = rnd(SHAPES)
  const color  = rnd(COLORS)
  const sizes  = [SIZES[0], SIZES[1], SIZES[2], SIZES[0]] // S, M, L, S
  return {
    sequence: sizes.slice(0, 3).map((sz, i) => ({
      type: 'shape', shape, color, size: sz, label: SIZE_NAMES[i],
    })),
    answer: { type: 'shape', shape, color, size: sizes[3], label: SIZE_NAMES[0] },
    explain: 'Size grows Small → Medium → Large, then resets',
    rule: 'Size cycle',
  }
}

// ── Multi-property patterns (hard) ─────────────────────────────────────────────

function genMultiShapeColor() {
  // shape AND color both change independently
  const shapePool = shuffle(SHAPES).slice(0, 4)
  const colorPool = [rndInt(0, 5), rndInt(0, 5), rndInt(0, 5), rndInt(0, 5)]
  while (colorPool[1] === colorPool[0]) colorPool[1] = rndInt(0, 5)
  while (colorPool[2] === colorPool[1]) colorPool[2] = rndInt(0, 5)
  colorPool[3] = colorPool[0]

  return {
    sequence: shapePool.slice(0, 3).map((sh, i) => ({
      type: 'shape', shape: sh, color: COLORS[colorPool[i]], size: 44,
      label: `${sh}+${COLOR_NAMES[colorPool[i]]}`,
    })),
    answer: {
      type: 'shape', shape: shapePool[3], color: COLORS[colorPool[3]], size: 44,
      label: `${shapePool[3]}+${COLOR_NAMES[colorPool[3]]}`,
    },
    explain: `Shape changes each step AND color cycles back to the first`,
    rule: 'Dual property change',
  }
}

function genMultiNumberShape() {
  // Number grows +N, shape cycles
  const start = rndInt(2, 12)
  const step  = rndInt(2, 5)
  const shapePool = shuffle(SHAPES).slice(0, 4)
  const nums  = [start, start + step, start + step * 2, start + step * 3]
  const color = rnd(COLORS)
  return {
    sequence: nums.slice(0, 3).map((n, i) => ({
      type: 'multi', number: n, shape: shapePool[i], color, size: 36,
      label: `${n} ${shapePool[i]}`,
    })),
    answer: {
      type: 'multi', number: nums[3], shape: shapePool[3], color, size: 36,
      label: `${nums[3]} ${shapePool[3]}`,
    },
    explain: `Number increases by ${step} AND shape cycles through a list`,
    rule: 'Number + shape combo',
  }
}

function genMirrorArithmetic() {
  // Two interleaved sequences: odd positions one rule, even another
  const a1 = rndInt(2, 10), stepA = rndInt(2, 4)
  const b1 = rndInt(2, 10), stepB = rndInt(2, 4)
  // seq: a1, b1, a2, b2 → show a1,b1,a2 → answer b2
  const a2 = a1 + stepA, b2 = b1 + stepB
  const colA = COLORS[1], colB = COLORS[3]
  return {
    sequence: [
      { type: 'number', value: a1, label: String(a1), color: colA },
      { type: 'number', value: b1, label: String(b1), color: colB },
      { type: 'number', value: a2, label: String(a2), color: colA },
    ],
    answer: { type: 'number', value: b2, label: String(b2), color: colB },
    explain: `Two interleaved sequences: ${a1},${a2}… (+${stepA}) and ${b1},${b2}… (+${stepB})`,
    rule:    'Interleaved sequences',
  }
}

// ─── Difficulty buckets ────────────────────────────────────────────────────────
const GENERATORS_BY_DIFFICULTY = {
  easy:   [genArithmetic, genGeometric, genShapeRotation, genColorCycle, genSizeGrow],
  medium: [genFibonacci, genDoubleStep, genSquares, genMultiShapeColor, genColorCycle],
  hard:   [genSecondOrder, genPrimeDiffs, genMultiNumberShape, genMirrorArithmetic, genMultiShapeColor],
}

function getDifficultyForRound(round) {
  if (round <= 3)  return 'easy'
  if (round <= 6)  return 'medium'
  return 'hard'
}

function generatePuzzle(difficulty) {
  const pool = GENERATORS_BY_DIFFICULTY[difficulty]
  const gen  = rnd(pool)
  return gen()
}

// ─── Generate wrong options ────────────────────────────────────────────────────
function generateOptions(puzzle, difficulty) {
  const { answer } = puzzle
  const options = [answer]

  function makeWrong() {
    if (answer.type === 'number') {
      // Wrong numbers: nearby values that aren't the answer
      const offsets = [-3, -2, -1, 1, 2, 3, 4, 5, 6, -4, -5]
      for (const off of shuffle(offsets)) {
        const v = answer.value + off
        if (v > 0 && !options.some(o => o.value === v)) {
          return { ...answer, value: v, label: String(v) }
        }
      }
    }
    if (answer.type === 'shape') {
      // Keep shape distractors visually distinct by varying shape/color, not just size.
      const shapeChoices = shuffle(SHAPES.filter((s) => s !== answer.shape))
      const colorChoices = shuffle(COLORS.filter((c) => c !== answer.color))
      const baseSize = answer.size || 44
      const attempts = [
        { ...answer, shape: shapeChoices[0], color: answer.color, size: baseSize },
        { ...answer, shape: shapeChoices[1] || shapeChoices[0], color: colorChoices[0], size: baseSize },
        { ...answer, shape: answer.shape, color: colorChoices[1] || colorChoices[0], size: baseSize },
        { ...answer, shape: shapeChoices[2] || shapeChoices[0], color: colorChoices[2] || colorChoices[0], size: baseSize },
      ].filter((candidate) => Boolean(candidate.shape) && Boolean(candidate.color))

      for (const candidate of attempts) {
        const dup = options.some(
          (o) => o.type === 'shape' && o.shape === candidate.shape && o.color === candidate.color,
        )
        if (!dup) return candidate
      }
    }
    if (answer.type === 'multi') {
      const offsets = [-2, -1, 1, 2, 3]
      for (const off of shuffle(offsets)) {
        const v = answer.number + off
        const sh = rnd(SHAPES.filter(s => s !== answer.shape))
        if (v > 0 && !options.some(o => o.number === v && o.shape === sh)) {
          return { ...answer, number: v, shape: sh, label: `${v} ${sh}` }
        }
      }
    }
    return null
  }

  let attempts = 0
  while (options.length < 4 && attempts < 40) {
    attempts++
    const wrong = makeWrong()
    if (wrong) {
      const dup = options.some(o => JSON.stringify(o) === JSON.stringify(wrong))
      if (!dup) options.push(wrong)
    }
  }

  if (answer.type === 'shape' && options.length < 4) {
    const shapeFallbacks = shuffle(
      SHAPES.flatMap((shape) =>
        COLORS.map((color) => ({
          ...answer,
          shape,
          color,
          size: answer.size || 44,
        })),
      ),
    ).filter((candidate) => !(candidate.shape === answer.shape && candidate.color === answer.color))

    for (const candidate of shapeFallbacks) {
      const dup = options.some(
        (o) => o.type === 'shape' && o.shape === candidate.shape && o.color === candidate.color,
      )
      if (!dup) {
        options.push(candidate)
      }
      if (options.length >= 4) {
        break
      }
    }
  }

  // Fallback: fill any remaining slot.
  let fallbackAttempts = 0
  while (options.length < 4 && fallbackAttempts < 24) {
    fallbackAttempts += 1
    const indexSeed = options.length + fallbackAttempts

    const fallback = answer.type === 'number'
      ? { ...answer, value: answer.value + indexSeed * 2, label: String(answer.value + indexSeed * 2) }
      : answer.type === 'multi'
        ? {
          ...answer,
          number: answer.number + indexSeed,
          shape: SHAPES[indexSeed % SHAPES.length],
          label: `${answer.number + indexSeed} ${SHAPES[indexSeed % SHAPES.length]}`,
        }
        : {
          ...answer,
          shape: SHAPES[indexSeed % SHAPES.length],
          color: COLORS[(indexSeed + 1) % COLORS.length],
          size: answer.size || 44,
        }

    const dup = options.some((o) => JSON.stringify(o) === JSON.stringify(fallback))
    if (!dup) {
      options.push(fallback)
    }
  }

  return shuffle(options)
}

function getShapeChoiceLabel(item) {
  const colorIndex = COLORS.indexOf(item.color)
  const colorName = colorIndex >= 0 ? COLOR_NAMES[colorIndex] : 'Color'
  const shapeName = item.shape ? `${item.shape.charAt(0).toUpperCase()}${item.shape.slice(1)}` : 'Shape'
  return `${colorName} ${shapeName}`
}

// ─── Sequence tile renderer ───────────────────────────────────────────────────
function SequenceTile({ item, isAnswer = false, dim = false }) {
  const base = `
    flex flex-col items-center justify-center rounded-2xl border
    transition-all duration-200 select-none
    ${dim ? 'opacity-30' : 'opacity-100'}
  `

  if (isAnswer) {
    return (
      <div className={`${base} border-dashed border-zinc-300 bg-white`}
        style={{ width: 72, height: 72 }}>
        <span className="text-2xl font-black text-zinc-500">?</span>
      </div>
    )
  }

  if (item.type === 'number') {
    return (
      <div className={`${base} border-zinc-200 bg-white`}
        style={{ width: 72, height: 72 }}>
        <span className="text-2xl font-black tabular-nums"
          style={{ color: item.color || '#111827' }}>
          {item.label}
        </span>
      </div>
    )
  }

  if (item.type === 'shape') {
    return (
      <div className={`${base} border-zinc-200 bg-white`}
        style={{ width: 72, height: 72 }}>
        <ShapeIcon shape={item.shape} size={item.size || 44} color={item.color} filled />
      </div>
    )
  }

  if (item.type === 'multi') {
    return (
      <div className={`${base} border-zinc-200 bg-white`}
        style={{ width: 72, height: 72 }}>
        <ShapeIcon shape={item.shape} size={item.size || 36} color={item.color} filled />
        <span className="mt-1 text-xs font-black tabular-nums text-zinc-700">{item.number}</span>
      </div>
    )
  }

  return null
}

// ─── Option button renderer ────────────────────────────────────────────────────
function OptionButton({ item, state, onClick, disabled }) {
  // state: 'idle' | 'correct' | 'wrong'
  const borderColor =
    state === 'correct' ? 'border-emerald-400 bg-emerald-950/60 shadow-[0_0_16px_rgba(52,211,153,0.25)]' :
    state === 'wrong'   ? 'border-red-500 bg-red-950/60' :
                          'border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex flex-col items-center justify-center gap-1
        rounded-2xl border px-3 py-3 transition-all duration-200
        active:scale-95 disabled:cursor-not-allowed
        ${borderColor}
      `}
      style={{ minHeight: 80 }}
    >
      {item.type === 'number' && (
        <span className="text-xl font-black tabular-nums"
          style={{ color: state === 'idle' ? (item.color || '#111827') : state === 'correct' ? '#34d399' : '#f87171' }}>
          {item.label}
        </span>
      )}
      {item.type === 'shape' && (
        <>
          <ShapeIcon
            shape={item.shape}
            size={item.size || 40}
            color={state === 'idle' ? item.color : state === 'correct' ? '#34d399' : '#f87171'}
            filled
          />
          <span className={`text-[10px] font-bold uppercase tracking-wide ${
            state === 'correct' ? 'text-emerald-500' : state === 'wrong' ? 'text-red-500' : 'text-zinc-500'
          }`}>
            {getShapeChoiceLabel(item)}
          </span>
        </>
      )}
      {item.type === 'multi' && (
        <>
          <ShapeIcon shape={item.shape} size={item.size || 32}
            color={state === 'idle' ? item.color : state === 'correct' ? '#34d399' : '#f87171'} filled />
          <span className={`text-xs font-black tabular-nums ${
            state === 'correct' ? 'text-emerald-400' : state === 'wrong' ? 'text-red-400' : 'text-zinc-700'
          }`}>{item.number}</span>
        </>
      )}
      {state === 'correct' && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-black text-zinc-950">✓</span>
      )}
      {state === 'wrong' && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">✕</span>
      )}
    </button>
  )
}

// ─── Difficulty pill ──────────────────────────────────────────────────────────
function DiffPill({ diff }) {
  const cfg = {
    easy:   'border-emerald-700 bg-emerald-950 text-emerald-400',
    medium: 'border-amber-700 bg-amber-950 text-amber-400',
    hard:   'border-rose-700 bg-rose-950 text-rose-400',
  }
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${cfg[diff] || cfg.easy}`}>
      {diff}
    </span>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TOTAL_ROUNDS   = 9   // 3 easy + 3 medium + 3 hard
const MAX_ATTEMPTS   = 3   // wrong attempts per round before forced advance
const XP_PER_SUBMISSION = 20
const DAILY_XP_CAP = 80
const REVEAL_DELAY   = 900 // ms to show correct/wrong before next round

// ─── Main component ───────────────────────────────────────────────────────────
export default function PatternSequenceGame({
  onMainMenu,
  onGameStart,
  onGameFinished,
  submitting,
  resultMeta,
  errorText,
  challengeAction = null,
}) {
  const [screen,       setScreen]       = useState('intro')     // intro | game | result
  const [round,        setRound]        = useState(1)
  const [puzzle,       setPuzzle]       = useState(null)
  const [options,      setOptions]      = useState([])
  const [selected,     setSelected]     = useState(null)        // index
  const [feedback,     setFeedback]     = useState('idle')      // idle | correct | wrong
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS)
  const [correctCount, setCorrectCount] = useState(0)
  const [xpLocal,      setXpLocal]      = useState(0)
  const [elapsed,      setElapsed]      = useState(0)
  const [gameOver,     setGameOver]     = useState(false)
  const [completionMeta, setMeta]       = useState(null)
  const [showExplain,  setShowExplain]  = useState(false)
  const [wrongAnswer,  setWrongAnswer]  = useState(null)        // to show correct after wrong

  const timerRef    = useRef(null)
  const pendingRef  = useRef(false)   // debounce double-tap

  const difficulty  = getDifficultyForRound(round)
  const isLastRound = round === TOTAL_ROUNDS

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'game') { clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [screen])

  // ── Load a new puzzle for current round ────────────────────────────────────
  const loadPuzzle = useCallback((roundNum) => {
    const diff = getDifficultyForRound(roundNum)
    const p    = generatePuzzle(diff)
    const opts = generateOptions(p, diff)
    setPuzzle(p)
    setOptions(opts)
    setSelected(null)
    setFeedback('idle')
    setAttemptsLeft(MAX_ATTEMPTS)
    setShowExplain(false)
    setWrongAnswer(null)
    pendingRef.current = false
  }, [])

  // ── Start game ─────────────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    if (onGameStart) {
      const started = await onGameStart()
      if (started === false) return
    }
    setRound(1)
    setCorrectCount(0)
    setXpLocal(0)
    setElapsed(0)
    setGameOver(false)
    setMeta(null)
    loadPuzzle(1)
    setScreen('game')
  }, [onGameStart, loadPuzzle])

  // ── Advance to next round ──────────────────────────────────────────────────
  const advanceRound = useCallback(async (wasCorrect) => {
    const nextRound = round + 1

    if (round >= TOTAL_ROUNDS) {
      // Game complete — submit
      clearInterval(timerRef.current)
      let meta = null
      if (onGameFinished) {
        meta = await onGameFinished({ score: correctCount, elapsed, metric: Math.round(elapsed * 1000) })
      }
      setMeta(meta)
      setGameOver(true)
      setScreen('result')
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 11000 })
      return
    }

    setRound(nextRound)
    loadPuzzle(nextRound)
  }, [round, correctCount, elapsed, onGameFinished, loadPuzzle])

  // ── Handle answer pick ─────────────────────────────────────────────────────
  const handlePick = useCallback((idx) => {
    if (feedback !== 'idle' || pendingRef.current) return
    pendingRef.current = true

    const pickedItem = options[idx]
    const isCorrect  = JSON.stringify(pickedItem) === JSON.stringify(puzzle.answer)

    setSelected(idx)

    if (isCorrect) {
      setFeedback('correct')
      setCorrectCount(c => c + 1)
      setShowExplain(true)

      setTimeout(() => {
        advanceRound(true)
      }, REVEAL_DELAY)
    } else {
      setFeedback('wrong')
      setWrongAnswer(puzzle.answer)

      const next = attemptsLeft - 1
      setAttemptsLeft(next)

      if (next <= 0) {
        // Out of attempts — show correct answer then advance
        setShowExplain(true)
        setTimeout(() => {
          advanceRound(false)
        }, REVEAL_DELAY + 400)
      } else {
        setTimeout(() => {
          setSelected(null)
          setFeedback('idle')
          setShowExplain(false)
          setWrongAnswer(null)
          pendingRef.current = false
        }, REVEAL_DELAY)
      }
    }
  }, [feedback, options, puzzle, attemptsLeft, advanceRound])

  // ── INTRO SCREEN ───────────────────────────────────────────────────────────
  if (screen === 'intro') {
    return (
      <section className="space-y-5">
        <button type="button" onClick={onMainMenu}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100">
          ← Back
        </button>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Mental Training</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">Pattern Sequence</h2>
          <p className="mt-2 text-sm font-semibold text-zinc-600 leading-relaxed">
            Three tiles. One rule. What comes next?
          </p>
        </div>

        {/* Example puzzle preview */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">Example</p>
          <div className="flex items-center justify-center gap-2">
            {[2, 4, 8].map((n, i) => (
              <div key={i} className="flex h-16 w-16 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50">
                <span className="text-xl font-black text-zinc-900">{n}</span>
              </div>
            ))}
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50">
              <span className="text-xl font-black text-zinc-500">?</span>
            </div>
          </div>
          <p className="mt-3 text-center text-xs font-semibold text-zinc-600">
            Answer: <span className="font-black text-zinc-900">16</span> — each number doubles (×2)
          </p>
        </div>

        {/* Difficulty progression */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">9 Rounds — 3 Difficulty Tiers</p>
          {[
            { label: 'Rounds 1–3', diff: 'easy',   desc: 'Arithmetic, geometric, shape cycles' },
            { label: 'Rounds 4–6', diff: 'medium',  desc: 'Fibonacci, alternating rules, multi-property' },
            { label: 'Rounds 7–9', diff: 'hard',    desc: 'Second-order, interleaved, compound patterns' },
          ].map(({ label, diff, desc }) => (
            <div key={diff} className="flex items-start gap-3">
              <DiffPill diff={diff} />
              <div>
                <p className="text-xs font-black text-zinc-900">{label}</p>
                <p className="text-[10px] font-semibold text-zinc-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rules */}
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Rules</p>
          <div className="space-y-1.5 text-xs font-semibold text-zinc-700 leading-relaxed">
            <p>• See 3 items — figure out the pattern — pick the 4th</p>
            <p>• <span className="text-zinc-900">{MAX_ATTEMPTS} attempts</span> per round before it auto-advances</p>
            <p>• <span className="text-zinc-900">+{XP_PER_SUBMISSION} XP</span> on successful submission (up to {DAILY_XP_CAP} XP today)</p>
            <p>• After wrong answer: the rule is revealed — learn from it</p>
          </div>
        </div>

        <button type="button" onClick={handleStart}
          className="w-full rounded-2xl bg-zinc-900 px-4 py-4 text-sm font-black text-white transition hover:bg-zinc-800 active:scale-[0.99]">
          Start Pattern Sequence →
        </button>
      </section>
    )
  }

  // ── RESULT SCREEN ──────────────────────────────────────────────────────────
  if (screen === 'result') {
    const xpAwarded = completionMeta?.xp_awarded ?? completionMeta?.xpAwarded ?? xpLocal
    const pct       = Math.round((correctCount / TOTAL_ROUNDS) * 100)
    const grade     = pct >= 90 ? 'S' : pct >= 70 ? 'A' : pct >= 50 ? 'B' : pct >= 30 ? 'C' : 'D'
    const gradeColor = { S: 'text-amber-400', A: 'text-emerald-400', B: 'text-blue-400', C: 'text-amber-500', D: 'text-red-400' }

    return (
      <section className="space-y-4">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-center space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Session Complete</p>
          <div className={`text-7xl font-black ${gradeColor[grade]}`}>{grade}</div>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-black text-zinc-900">{correctCount}/{TOTAL_ROUNDS}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-0.5">Correct</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-zinc-900">+{xpAwarded}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-0.5">XP</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-zinc-900">{fmt(elapsed)}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-0.5">Time</p>
            </div>
          </div>

          {/* Score bar */}
          <div className="mx-auto w-full max-w-xs">
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
              <div className={`h-full rounded-full transition-all duration-1000 ${
                grade === 'S' ? 'bg-amber-400' : grade === 'A' ? 'bg-emerald-400' :
                grade === 'B' ? 'bg-blue-400'  : grade === 'C' ? 'bg-amber-500' : 'bg-red-400'
              }`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-[10px] font-bold text-zinc-600 text-center">{pct}% accuracy</p>
          </div>
        </div>

        {completionMeta?.cappedByDailyLimit && (
          <p className="text-xs font-semibold text-amber-500 text-center">Daily XP cap reached ✓</p>
        )}
        {errorText && <p className="text-xs font-semibold text-red-400 text-center">{errorText}</p>}
        {challengeAction ? <div className="pt-1">{challengeAction}</div> : null}

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={handleStart}
            className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100">
            Play Again
          </button>
          <button type="button" onClick={onMainMenu}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800">
            Main Menu
          </button>
        </div>
      </section>
    )
  }

  // ── GAME SCREEN ────────────────────────────────────────────────────────────
  if (screen !== 'game' || !puzzle) return null

  const roundProgress = ((round - 1) / TOTAL_ROUNDS) * 100

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={onMainMenu}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100">
          ← Quit
        </button>
        <div className="flex items-center gap-2">
          <DiffPill diff={difficulty} />
          <span className="rounded-full border border-zinc-300 bg-white px-2.5 py-0.5 text-[11px] font-black text-zinc-700 tabular-nums">
            ⏱ {fmt(elapsed)}
          </span>
        </div>
      </div>

      {/* Round progress bar */}
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black text-zinc-700">
            Round <span className="text-zinc-900">{round}</span> of {TOTAL_ROUNDS}
          </span>
          <span className="text-xs font-black text-zinc-500">
            {correctCount} correct
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
          <div className="h-full rounded-full bg-zinc-900 transition-all duration-500"
            style={{ width: `${roundProgress}%` }} />
        </div>
        {/* Round dots */}
        <div className="mt-2 flex gap-1">
          {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-all ${
              i < round - 1 ? 'bg-zinc-900' : i === round - 1 ? 'bg-zinc-500' : 'bg-zinc-200'
            }`} />
          ))}
        </div>
      </div>

      {/* Attempts left */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Attempts left
        </p>
        <div className="flex gap-1.5">
          {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
            <div key={i} className={`h-2 w-6 rounded-full transition-all ${
              i < attemptsLeft ? 'bg-zinc-900' : 'bg-zinc-200'
            }`} />
          ))}
        </div>
      </div>

      {/* Sequence display */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-5">
        <p className="mb-4 text-center text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
          What comes next?
        </p>
        <div className="flex items-center justify-center gap-2.5">
          {puzzle.sequence.map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <SequenceTile item={item} />
              <span className="text-[10px] font-bold text-zinc-600">{i + 1}</span>
            </div>
          ))}

          {/* Arrow */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center">
              <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
                <path d="M0 6h17M13 1l6 5-6 5" stroke="#52525b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* ? tile */}
          <div className="flex flex-col items-center gap-1.5">
            <SequenceTile isAnswer />
            <span className="text-[10px] font-bold text-zinc-600">4</span>
          </div>
        </div>

        {/* Rule reveal after answer */}
        {showExplain && puzzle.explain && (
          <div className={`mt-4 rounded-xl border px-3 py-2 text-center transition-all ${
            feedback === 'correct'
              ? 'border-emerald-800 bg-emerald-950/60'
              : 'border-zinc-200 bg-zinc-50'
          }`}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5"
              style={{ color: feedback === 'correct' ? '#34d399' : '#a1a1aa' }}>
              {feedback === 'correct' ? '✓ Correct!' : '⟲ The Rule'}
            </p>
            <p className="text-xs font-semibold text-zinc-700">{puzzle.explain}</p>
          </div>
        )}
      </div>

      {/* Options grid */}
      <div>
        <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Pick the 4th item
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {options.map((opt, idx) => {
            let state = 'idle'
            if (selected === idx) state = feedback === 'correct' ? 'correct' : 'wrong'
            // Also highlight correct answer when wrong was picked and attempts run out
            if (feedback === 'wrong' && attemptsLeft <= 0 && showExplain) {
              if (JSON.stringify(opt) === JSON.stringify(puzzle.answer)) state = 'correct'
            }
            return (
              <OptionButton
                key={idx}
                item={opt}
                state={state}
                onClick={() => handlePick(idx)}
                disabled={feedback !== 'idle'}
              />
            )
          })}
        </div>
      </div>

      {submitting && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-100/70 backdrop-blur-sm">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-center space-y-2 shadow-lg">
            <p className="text-base font-black text-zinc-900">Submitting…</p>
            <p className="text-xs font-semibold text-zinc-600">Saving your score and XP</p>
          </div>
        </div>
      )}
    </section>
  )
}
