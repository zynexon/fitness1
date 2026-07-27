import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'

// --- Puzzle Data ------------------------------------------------------------
const PUZZLES = [
  {
    id: 'e1',
    difficulty: 'easy',
    title: 'The Color Squad',
    goal: 'Figure out which shirt color and which pet belongs to each person.',
    categories: ['name', 'color', 'pet'],
    labels: { name: 'Person', color: 'Shirt Color', pet: 'Pet' },
    items: {
      name: ['Alex', 'Ben', 'Cara'],
      color: ['Red', 'Blue', 'Green'],
      pet: ['Cat', 'Dog', 'Fish'],
    },
    clues: [
      'Alex does not wear red.',
      'The person who has a dog wears blue.',
      'Ben has a fish.',
      'Cara wears green.',
    ],
    solution: {
      color: { alex: 'Blue', ben: 'Red', cara: 'Green' },
      pet: { alex: 'Dog', ben: 'Fish', cara: 'Cat' },
    },
  },
  {
    id: 'e2',
    difficulty: 'easy',
    title: 'Desk Jobs',
    goal: "Find out each person's job and which office floor they work on.",
    categories: ['name', 'job', 'floor'],
    labels: { name: 'Person', job: 'Job', floor: 'Office Floor' },
    items: {
      name: ['Dana', 'Eli', 'Faye'],
      job: ['Designer', 'Engineer', 'Manager'],
      floor: ['1st', '2nd', '3rd'],
    },
    clues: [
      'The engineer works on the 3rd floor.',
      'Dana is not a manager.',
      'Faye works on the 1st floor.',
      'Eli is not a designer.',
      'Dana works on the 2nd floor.',
    ],
    solution: {
      job: { dana: 'Designer', eli: 'Engineer', faye: 'Manager' },
      floor: { dana: '2nd', eli: '3rd', faye: '1st' },
    },
  },
  {
    id: 'm1',
    difficulty: 'medium',
    title: 'Weekend Warriors',
    goal: 'Match each person to their sport, their drink, and their practice time.',
    categories: ['name', 'sport', 'drink', 'time'],
    labels: { name: 'Person', sport: 'Sport', drink: 'Drink', time: 'Time' },
    items: {
      name: ['Gus', 'Hana', 'Ivan', 'Jess'],
      sport: ['Tennis', 'Running', 'Cycling', 'Swimming'],
      drink: ['Coffee', 'Tea', 'Water', 'Juice'],
      time: ['6am', '8am', '10am', '12pm'],
    },
    clues: [
      'The swimmer practices at 6am.',
      'Hana drinks coffee and does not run.',
      'Ivan cycles and practices at 10am.',
      'The cyclist does not drink tea.',
      'The 12pm session belongs to the runner.',
      'Gus does not swim.',
      'Jess practices at 6am.',
      'The runner drinks water.',
      'Hana does not practice at 6am.',
    ],
    solution: {
      sport: { gus: 'Running', hana: 'Tennis', ivan: 'Cycling', jess: 'Swimming' },
      drink: { gus: 'Water', hana: 'Coffee', ivan: 'Juice', jess: 'Tea' },
      time: { gus: '12pm', hana: '8am', ivan: '10am', jess: '6am' },
    },
  },
  {
    id: 'm2',
    difficulty: 'medium',
    title: 'Book Club',
    goal: "Work out each member's favourite genre, their meeting day, and their snack.",
    categories: ['name', 'genre', 'day', 'snack'],
    labels: { name: 'Person', genre: 'Genre', day: 'Day', snack: 'Snack' },
    items: {
      name: ['Kim', 'Leo', 'Mia', 'Ned'],
      genre: ['Mystery', 'Sci-Fi', 'Romance', 'History'],
      day: ['Mon', 'Wed', 'Fri', 'Sat'],
      snack: ['Chips', 'Fruit', 'Cookies', 'Nuts'],
    },
    clues: [
      'The mystery reader meets on Monday.',
      'Leo loves sci-fi and meets on Wednesday.',
      'Mia eats fruit and does not read romance.',
      'The Saturday meeting belongs to the history reader.',
      'Ned does not meet on Friday.',
      'The cookie lover reads romance.',
      'Kim meets on Friday.',
      'The chips eater meets on Monday.',
    ],
    solution: {
      genre: { kim: 'Romance', leo: 'Sci-Fi', mia: 'History', ned: 'Mystery' },
      day: { kim: 'Fri', leo: 'Wed', mia: 'Sat', ned: 'Mon' },
      snack: { kim: 'Cookies', leo: 'Nuts', mia: 'Fruit', ned: 'Chips' },
    },
  },
  {
    id: 'h1',
    difficulty: 'hard',
    title: 'The Research Lab',
    goal: "Identify each researcher's field, country, active year, and award.",
    categories: ['name', 'field', 'country', 'year', 'award'],
    labels: { name: 'Researcher', field: 'Field', country: 'Country', year: 'Year', award: 'Award' },
    items: {
      name: ['Ora', 'Pete', 'Quinn', 'Rosa', 'Sam'],
      field: ['Biology', 'Physics', 'Chemistry', 'Math', 'CS'],
      country: ['USA', 'UK', 'Japan', 'Brazil', 'Germany'],
      year: ['2018', '2019', '2020', '2021', '2022'],
      award: ['Gold', 'Silver', 'Bronze', 'Platinum', 'Diamond'],
    },
    clues: [
      'The biologist is from Japan.',
      'Pete works in physics and received gold.',
      'The 2022 researcher is from Brazil.',
      'Quinn is not from the USA or UK.',
      'Rosa works in chemistry and was active in 2019.',
      'The CS researcher won platinum.',
      'Sam was active in 2022.',
      'The UK researcher won gold.',
      'Ora is from the USA and won bronze.',
      'The mathematician was active in 2018.',
      'Quinn won diamond.',
      'The 2020 researcher works in biology.',
      'Pete was active in 2021.',
      'The German researcher works in chemistry.',
    ],
    solution: {
      field: { ora: 'Math', pete: 'Physics', quinn: 'Biology', rosa: 'Chemistry', sam: 'CS' },
      country: { ora: 'USA', pete: 'UK', quinn: 'Japan', rosa: 'Germany', sam: 'Brazil' },
      year: { ora: '2018', pete: '2021', quinn: '2020', rosa: '2019', sam: '2022' },
      award: { ora: 'Bronze', pete: 'Gold', quinn: 'Diamond', rosa: 'Silver', sam: 'Platinum' },
    },
  },
]

// --- Helpers ----------------------------------------------------------------
const YES = 'yes'
const NO = 'no'
const EMPTY = 'empty'

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

function cellKey(a, b) {
  return [a, b].sort().join('___')
}

function buildEmptyGrid(puzzle) {
  const g = {}
  const { categories, items } = puzzle
  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      items[categories[i]].forEach((a) =>
        items[categories[j]].forEach((b) => {
          g[cellKey(a, b)] = EMPTY
        }),
      )
    }
  }
  return g
}

function cycleState(s) {
  if (s === EMPTY) return YES
  if (s === YES) return NO
  return EMPTY
}

function checkSolution(puzzle, grid) {
  const { items, solution } = puzzle
  let correct = 0
  let total = 0
  Object.entries(solution).forEach(([cat, mapping]) => {
    Object.entries(mapping).forEach(([nameKey, val]) => {
      total++
      const name = items.name.find((n) => n.toLowerCase() === nameKey)
      if (!name) return
      if (grid[cellKey(name, val)] === YES) correct++
    })
  })
  return { correct, total, perfect: correct === total }
}

// --- Difficulty badge --------------------------------------------------------
function DiffBadge({ d }) {
  const cfg = {
    easy: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    medium: 'border-amber-300 bg-amber-50 text-amber-700',
    hard: 'border-rose-300 bg-rose-50 text-rose-700',
  }
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${cfg[d]}`}>
      {d}
    </span>
  )
}

// --- Grid table - pixel-precise alignment, no CSS rotation tricks -----------
const CELL_W = 44 // px width per column cell
const ROW_LBL_W = 76 // px for the row label column

function GridTable({ rowLabel, colLabel, rowItems, colItems, grid, onToggle }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'inline-block', minWidth: ROW_LBL_W + colItems.length * CELL_W }}>
        {/* Column headers - fixed-height box, text reads bottom-up using writingMode */}
        <div style={{ display: 'flex', paddingLeft: ROW_LBL_W }}>
          {colItems.map((col) => (
            <div
              key={col}
              style={{
                width: CELL_W,
                minWidth: CELL_W,
                height: 64,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: 6,
              }}
            >
              <span
                style={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#52525b',
                  lineHeight: 1.1,
                  maxHeight: 52,
                  overflow: 'hidden',
                  display: 'block',
                  textAlign: 'left',
                }}
              >
                {col}
              </span>
            </div>
          ))}
        </div>

        {/* Divider under headers */}
        <div style={{ borderTop: '2px solid #e4e4e7', marginLeft: ROW_LBL_W, marginBottom: 4 }} />

        {/* Rows */}
        {rowItems.map((row, ri) => (
          <div
            key={row}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: ri === 0 ? 0 : 4,
            }}
          >
            {/* Row label */}
            <div style={{ width: ROW_LBL_W, minWidth: ROW_LBL_W, paddingRight: 8, textAlign: 'right' }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#3f3f46',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row}
              </span>
            </div>

            {/* Cells */}
            {colItems.map((col) => {
              const k = cellKey(row, col)
              const state = grid[k] || EMPTY
              return (
                <div
                  key={col}
                  style={{ width: CELL_W, minWidth: CELL_W, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <button
                    type="button"
                    onClick={() => onToggle(row, col)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      border:
                        state === YES
                          ? '2px solid #34d399'
                          : state === NO
                            ? '2px solid #fca5a5'
                            : '1.5px solid #d4d4d8',
                      background: state === YES ? '#ecfdf5' : state === NO ? '#fff1f2' : '#fafafa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 900,
                      color: state === YES ? '#059669' : state === NO ? '#f87171' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.1s',
                      flexShrink: 0,
                    }}
                  >
                    {state === YES ? '✓' : state === NO ? '✕' : ''}
                  </button>
                </div>
              )
            })}
          </div>
        ))}

        {/* Axis labels below */}
        <div style={{ display: 'flex', marginTop: 8, paddingLeft: ROW_LBL_W }}>
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#a1a1aa' }}>
            {colLabel} →
          </span>
        </div>
        <div style={{ marginTop: 2 }}>
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#a1a1aa' }}>
            ^ {rowLabel}
          </span>
        </div>
      </div>
    </div>
  )
}

// --- Answer table shown after solving ---------------------------------------
function AnswerTable({ puzzle, grid }) {
  const nonNameCats = puzzle.categories.filter((c) => c !== 'name')
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50">
            <th className="py-2.5 px-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-400">Person</th>
            {nonNameCats.map((cat) => (
              <th key={cat} className="py-2.5 px-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {puzzle.labels[cat]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {puzzle.items.name.map((name, ni) => {
            const row = {}
            nonNameCats.forEach((cat) => {
              const match = puzzle.items[cat].find((val) => (grid[cellKey(name, val)] || EMPTY) === YES)
              row[cat] = match || '-'
            })
            return (
              <tr key={name} className={ni % 2 === 0 ? '' : 'bg-zinc-50'}>
                <td className="py-2.5 px-3 font-black text-zinc-900">{name}</td>
                {nonNameCats.map((cat) => (
                  <td key={cat} className="py-2.5 px-3 font-semibold text-zinc-700">
                    {row[cat]}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// --- Main component ----------------------------------------------------------
export default function LogicGridGame({ onMainMenu, onGameStart, onGameFinished, submitting, resultMeta, errorText, challengeAction = null, challengePuzzleId = null }) {
  const [screen, setScreen] = useState('select') // select | intro | puzzle | result
  const [puzzle, setPuzzle] = useState(null)
  const [grid, setGrid] = useState({})
  const [struckClues, setStruck] = useState({})
  const [checked, setChecked] = useState(false)
  const [checkResult, setCheckResult] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [activeTab, setActiveTab] = useState(0)
  const [completionMeta, setMeta] = useState(null)
  const [isSubmittingResult, setIsSubmittingResult] = useState(false)
  const timerRef = useRef(null)
  const isChallenge = Boolean(challengePuzzleId)

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  useEffect(() => {
    if (screen !== 'puzzle') {
      clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [screen])

  // Only Name x OtherCategory tabs so user always sees names on left
  const gridTabs = useMemo(() => {
    if (!puzzle) return []
    return puzzle.categories.filter((c) => c !== 'name').map((cat) => ({ catA: 'name', catB: cat }))
  }, [puzzle])

  const challengePuzzle = useMemo(() => {
    if (!challengePuzzleId) return null
    return PUZZLES.find((p) => p.id === challengePuzzleId) || null
  }, [challengePuzzleId])

  const selectPuzzle = useCallback((p) => {
    setPuzzle(p)
    setGrid(buildEmptyGrid(p))
    setStruck({})
    setChecked(false)
    setCheckResult(null)
    setElapsed(0)
    setActiveTab(0)
    setMeta(null)
    setIsSubmittingResult(false)
    setScreen('intro')
  }, [])

  useEffect(() => {
    if (!challengePuzzle || screen !== 'select') {
      return
    }
    selectPuzzle(challengePuzzle)
  }, [challengePuzzle, screen, selectPuzzle])

  const startPuzzle = useCallback(async () => {
    if (onGameStart) await onGameStart()
    setScreen('puzzle')
  }, [onGameStart])

  const toggle = useCallback((a, b) => {
    setGrid((prev) => {
      const k = cellKey(a, b)
      return { ...prev, [k]: cycleState(prev[k] || EMPTY) }
    })
  }, [])

  const handleCheck = useCallback(async () => {
    if (!puzzle) return
    const result = checkSolution(puzzle, grid)
    setCheckResult(result)
    setChecked(true)
    if (result.perfect) {
      clearInterval(timerRef.current)
      let meta = null
      setIsSubmittingResult(true)
      if (onGameFinished) meta = await onGameFinished({ score: 1, elapsed, metric: Math.round(elapsed * 1000), puzzleId: puzzle.id })
      setIsSubmittingResult(false)
      setMeta(meta)
      setScreen('result')
      fireConfetti()
    }
  }, [puzzle, grid, elapsed, onGameFinished])

  const handleReset = useCallback(() => {
    if (!puzzle) return
    setGrid(buildEmptyGrid(puzzle))
    setChecked(false)
    setCheckResult(null)
  }, [puzzle])

  // --- SELECT ---------------------------------------------------------------
  if (screen === 'select') {
    const groups = { easy: [], medium: [], hard: [] }
    PUZZLES.forEach((p) => groups[p.difficulty].push(p))

    return (
      <section className="space-y-5">
        <button
          type="button"
          onClick={onMainMenu}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100"
        >
          ← Back
        </button>

        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black tracking-tight text-zinc-950">Logic Grid</h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">Deduce. Eliminate. Solve.</p>
          <div className="mt-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">How it works</p>
            <p className="text-xs font-semibold text-zinc-600 leading-relaxed">
              Each person has exactly one of each attribute. Read the clues and mark ✓ (match) or ✕ (not a match) in the grid.
              Solve all attributes for every person to win.
            </p>
          </div>
        </div>

        {[
          ['easy', 'Beginner'],
          ['medium', 'Intermediate'],
          ['hard', 'Expert'],
        ].map(([diff, label]) => (
          <div key={diff} className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</p>
            {groups[diff].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPuzzle(p)}
                className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-zinc-400 hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-zinc-900">{p.title}</p>
                    <p className="mt-0.5 text-xs font-semibold text-zinc-500 leading-relaxed">{p.goal}</p>
                  </div>
                  <DiffBadge d={diff} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600">
                    {p.items.name.length} people
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600">
                    {p.clues.length} clues
                  </span>
                  {p.categories.slice(1).map((cat) => (
                    <span key={cat} className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600">
                      {p.labels[cat]}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        ))}
      </section>
    )
  }

  // --- INTRO ---------------------------------------------------------------
  if (screen === 'intro' && puzzle) {
    const nonNameCats = puzzle.categories.filter((c) => c !== 'name')
    return (
      <section className="space-y-4">
        <button
          type="button"
          onClick={() => {
            if (isChallenge) {
              if (onMainMenu) onMainMenu()
              return
            }
            setScreen('select')
          }}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100"
        >
          ← Back
        </button>

        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-center">
          <DiffBadge d={puzzle.difficulty} />
          <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950">{puzzle.title}</h2>
          <p className="mt-2 text-sm font-semibold text-zinc-600 leading-relaxed">{puzzle.goal}</p>
        </div>

        {/* People overview */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">People in this puzzle</p>
          <div className="space-y-2">
            {puzzle.items.name.map((name) => (
              <div key={name} className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-black text-white">{name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-zinc-900">{name}</p>
                  <p className="text-[10px] font-semibold text-zinc-400 mt-0.5">unknown: {nonNameCats.map((c) => puzzle.labels[c]).join(' · ')}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {nonNameCats.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-md border border-dashed border-zinc-300 bg-white px-1.5 py-0.5 text-[10px] font-bold text-zinc-400"
                    >
                      ?
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Available attributes */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">Attributes to assign</p>
          {nonNameCats.map((cat) => (
            <div key={cat} className="mb-3 last:mb-0">
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400">{puzzle.labels[cat]}</p>
              <div className="flex flex-wrap gap-1.5">
                {puzzle.items[cat].map((val) => (
                  <span key={val} className="rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-xs font-bold text-zinc-700">
                    {val}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">How to use the grid</p>
          <div className="space-y-1.5 text-xs font-semibold text-amber-900 leading-relaxed">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-emerald-400 bg-emerald-50 text-[10px] font-black text-emerald-600">
                ✓
              </span>
              <span>
                <strong>Tap once</strong> - this person HAS this attribute
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-red-300 bg-red-50 text-[10px] font-black text-red-400">
                ✕
              </span>
              <span>
                <strong>Tap again</strong> - this person does NOT have it
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-zinc-300 bg-white text-[10px] font-black text-zinc-300">
                ○
              </span>
              <span>
                <strong>Tap again</strong> - back to unknown
              </span>
            </div>
            <p className="pt-1 text-amber-700">
              Each row and each column must have exactly <strong>one ✓</strong>. When every person's row is fully marked, check your solution.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={startPuzzle}
          className="w-full rounded-2xl bg-zinc-900 px-4 py-3.5 text-sm font-black text-white transition hover:bg-zinc-800 active:scale-[0.99]"
        >
          Start Puzzle →
        </button>
      </section>
    )
  }

  // --- RESULT --------------------------------------------------------------
  if (screen === 'result' && puzzle) {
    return (
      <section className="space-y-4">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-2">
          <div className="text-4xl">🧠</div>
          <h3 className="text-2xl font-black text-zinc-950">Puzzle Solved!</h3>
          <p className="text-sm font-semibold text-zinc-600">{puzzle.title}</p>
          <div className="flex justify-center gap-6 pt-1">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Time</p>
              <p className="text-xl font-black text-zinc-900">{fmt(elapsed)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">XP</p>
              <p className="text-xl font-black text-zinc-900">+{completionMeta?.xp_awarded ?? completionMeta?.xpAwarded ?? '-'}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Your Complete Solution</p>
          <AnswerTable puzzle={puzzle} grid={grid} />
        </div>

        {completionMeta?.cappedByDailyLimit && <p className="text-xs font-semibold text-amber-600 text-center">Daily cap reached ✓</p>}
        {errorText && <p className="text-xs font-semibold text-red-600 text-center">{errorText}</p>}
        {challengeAction ? <div className="pt-1">{challengeAction}</div> : null}

        <div className={`grid gap-3 ${isChallenge ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {!isChallenge && (
            <button
              type="button"
              onClick={() => setScreen('select')}
              className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-900 transition hover:bg-zinc-100"
            >
              More Puzzles
            </button>
          )}
          <button
            type="button"
            onClick={onMainMenu}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
          >
            Main Menu
          </button>
        </div>
      </section>
    )
  }

  // --- PUZZLE --------------------------------------------------------------
  if (screen !== 'puzzle' || !puzzle) return null

  // Progress = how many solution cells the user has marked YES correctly
  const totalSol = Object.values(puzzle.solution).reduce((s, m) => s + Object.keys(m).length, 0)
  const solvedSol = Object.entries(puzzle.solution).reduce((sum, [cat, mapping]) => {
    return (
      sum +
      Object.entries(mapping).filter(([nameKey, val]) => {
        const name = puzzle.items.name.find((n) => n.toLowerCase() === nameKey)
        return name && grid[cellKey(name, val)] === YES
      }).length
    )
  }, 0)
  const progressPct = totalSol > 0 ? Math.round((solvedSol / totalSol) * 100) : 0
  const currentTab = gridTabs[activeTab]

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setScreen('intro')}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <DiffBadge d={puzzle.difficulty} />
          <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[11px] font-black text-zinc-700 tabular-nums">⏱ {fmt(elapsed)}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-black text-zinc-700">{puzzle.title}</p>
          <span className="text-[10px] font-black text-zinc-400">{solvedSol}/{totalSol} matched</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full rounded-full bg-zinc-900 transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Goal reminder */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-0.5">Goal</p>
        <p className="text-xs font-semibold text-blue-800 leading-relaxed">{puzzle.goal}</p>
      </div>

      {/* Clues */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Clues ({puzzle.clues.length}) - tap a clue to strike it out once used
        </p>
        <div className="space-y-1.5">
          {puzzle.clues.map((clue, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStruck((prev) => ({ ...prev, [i]: !prev[i] }))}
              className={`w-full rounded-xl border px-3 py-2 text-left text-xs font-semibold transition leading-relaxed ${
                struckClues[i]
                  ? 'border-zinc-100 bg-zinc-50 text-zinc-400 line-through decoration-zinc-300'
                  : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              <span
                className="mr-2 not-italic"
                style={{ textDecoration: 'none', fontWeight: 900, fontSize: 10, color: '#a1a1aa' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              {clue}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        {/* Category tabs */}
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {gridTabs.map((tab, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider transition ${
                activeTab === i
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400'
              }`}
            >
              {puzzle.labels[tab.catB]}
            </button>
          ))}
        </div>

        {/* Context label */}
        {currentTab && (
          <p className="mb-3 text-[10px] font-semibold text-zinc-500 leading-relaxed">
            Rows = <strong className="text-zinc-700">people</strong>. Columns ={' '}
            <strong className="text-zinc-700">{puzzle.labels[currentTab.catB]}</strong> options. Mark ✓ where they match.
          </p>
        )}

        {/* The grid itself */}
        {currentTab && (
          <GridTable
            rowLabel={puzzle.labels[currentTab.catA]}
            colLabel={puzzle.labels[currentTab.catB]}
            rowItems={puzzle.items[currentTab.catA]}
            colItems={puzzle.items[currentTab.catB]}
            grid={grid}
            onToggle={toggle}
          />
        )}

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded border-2 border-emerald-400 bg-emerald-50 flex items-center justify-center text-[10px] font-black text-emerald-600">
              ✓
            </div>
            <span className="text-[10px] font-semibold text-zinc-500">Match (tap once)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded border-2 border-red-300 bg-red-50 flex items-center justify-center text-[10px] font-black text-red-400">
              ✕
            </div>
            <span className="text-[10px] font-semibold text-zinc-500">Not a match (tap twice)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded border border-zinc-300 bg-white" />
            <span className="text-[10px] font-semibold text-zinc-500">Unknown</span>
          </div>
        </div>
      </div>

      {/* Partial feedback */}
      {checked && checkResult && !checkResult.perfect && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-bold text-amber-800">
            {checkResult.correct}/{checkResult.total} correct - keep going!
          </p>
          <p className="mt-0.5 text-xs font-semibold text-amber-700">Some matches are wrong or missing. Re-read the clues carefully.</p>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100"
        >
          Reset Grid
        </button>
        <button
          type="button"
          onClick={handleCheck}
          disabled={submitting}
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60"
        >
          {submitting ? 'Submitting...' : 'Check Solution'}
        </button>
      </div>

      {errorText && <p className="text-xs font-semibold text-red-600">{errorText}</p>}

      {(isSubmittingResult || submitting) ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl text-center space-y-2">
            <h3 className="text-xl font-black text-zinc-950">Submitting..</h3>
            <p className="text-sm font-semibold text-zinc-500">Validating your result and XP.</p>
          </div>
        </div>
      ) : null}
    </section>
  )
}
