import { useState, useMemo } from 'react'

// ── All 10 games ──────────────────────────────────────────────────────────────
const ALL_GAMES = [
  {
    id: 'quick_math',
    title: 'Mental Arithmetic',
    route: '/game/quick-math',
    desc: 'Solve as many as you can in 30 seconds.',
    difficulty: { label: 'Easy', bars: 1 },
    maxXp: 50,
    gameType: 'quick_math',
    category: 'speed_reaction',
    skillKey: 'speed',
    typeIcon: '⚡',
    typeName: 'Speed',
    resultLabel: 'Quick Math',
    step: 'warm-up',
  },
  {
    id: 'focus_tap',
    title: 'Focus Tap',
    route: '/game/focus-tap',
    desc: 'Tap the right color. Avoid distractions.',
    difficulty: { label: 'Easy', bars: 1 },
    maxXp: 50,
    gameType: 'focus_tap',
    category: 'speed_reaction',
    skillKey: 'focus',
    typeIcon: '⚡',
    typeName: 'Speed',
    resultLabel: 'Focus Tap',
    step: 'focus',
  },
  {
    id: 'reaction_tap',
    title: 'Reaction Tap',
    route: '/game/reaction-tap',
    desc: 'Tap the instant WAIT changes to TAP.',
    difficulty: { label: 'Easy', bars: 1 },
    maxXp: 50,
    gameType: 'reaction_tap',
    category: 'speed_reaction',
    skillKey: 'speed',
    typeIcon: '⚡',
    typeName: 'Speed',
    resultLabel: 'Reaction Tap',
    step: 'speed',
  },
  {
    id: 'number_recall',
    title: 'Number Recall',
    route: '/game/number-recall',
    desc: 'Memorize 7 digits. Reproduce perfectly.',
    difficulty: { label: 'Medium', bars: 2 },
    maxXp: 50,
    gameType: 'number_recall',
    category: 'memory_pattern',
    skillKey: 'memory',
    typeIcon: '🧠',
    typeName: 'Memory',
    resultLabel: 'Number Recall',
    step: 'memory',
  },
  {
    id: 'color_count_focus',
    title: 'Color Count',
    route: '/game/color-count-focus',
    desc: 'Count target color flashes across 8 rounds.',
    difficulty: { label: 'Medium', bars: 2 },
    maxXp: 60,
    gameType: 'color_count_focus',
    category: 'memory_pattern',
    skillKey: 'focus',
    typeIcon: '🧠',
    typeName: 'Memory',
    resultLabel: 'Color Count Focus',
    step: 'focus',
  },
  {
    id: 'pattern_sequence',
    title: 'Pattern Sequence',
    route: '/game/pattern-sequence',
    desc: 'See 3 items. Spot the rule. Pick the 4th.',
    difficulty: { label: 'Medium', bars: 2 },
    maxXp: 80,
    gameType: 'pattern_sequence',
    category: 'logic_reasoning',
    skillKey: 'logic',
    typeIcon: '🎯',
    typeName: 'Logic',
    resultLabel: 'Pattern Sequence',
    step: 'memory',
  },
  {
    id: 'speed_pattern',
    title: 'Speed Pattern',
    route: '/game/speed-pattern',
    desc: 'Memorize 5x5 patterns across 3 rounds.',
    difficulty: { label: 'Hard', bars: 3 },
    maxXp: 100,
    gameType: 'speed_pattern',
    category: 'memory_pattern',
    skillKey: 'memory',
    typeIcon: '🧠',
    typeName: 'Memory',
    resultLabel: 'Speed Pattern',
    step: 'boss',
  },
  {
    id: 'number_stack',
    title: 'Number Stack',
    route: '/game/number-stack',
    desc: 'Follow 3 rules and pick the final stack.',
    difficulty: { label: 'Hard', bars: 3 },
    maxXp: 75,
    gameType: 'number_stack',
    category: 'memory_pattern',
    skillKey: 'logic',
    typeIcon: '🧠',
    typeName: 'Memory',
    resultLabel: 'Number Stack',
    step: 'boss',
  },
  {
    id: 'reverse_order',
    title: 'Reverse Order',
    route: '/game/reverse-order',
    desc: 'Apply ordered rules. Pick final sequence.',
    difficulty: { label: 'Hard', bars: 3 },
    maxXp: 75,
    gameType: 'reverse_order',
    category: 'logic_reasoning',
    skillKey: 'logic',
    typeIcon: '🎯',
    typeName: 'Logic',
    resultLabel: 'Reverse Order',
    step: 'boss',
  },
  {
    id: 'logic_grid',
    title: 'Logic Grid',
    route: '/game/logic-grid',
    desc: 'Use clues to solve each logic matrix puzzle.',
    difficulty: { label: 'Hard', bars: 3 },
    maxXp: 100,
    gameType: 'logic_grid',
    category: 'logic_reasoning',
    skillKey: 'logic',
    typeIcon: '🎯',
    typeName: 'Logic',
    resultLabel: 'Logic Grid',
    step: 'boss',
  },
]

// Hard games pool for boss round rotation
const HARD_GAMES = ALL_GAMES.filter((g) => g.difficulty.bars === 3)
const EASY_GAMES = ALL_GAMES.filter((g) => g.difficulty.bars === 1)
const MED_GAMES  = ALL_GAMES.filter((g) => g.difficulty.bars === 2)

// Training path template: [warm-up, focus, speed, memory, boss]
// Rotates daily — same for everyone on a given day
function getDailyTrainingPath() {
  const dayNumber = Math.floor(Date.now() / 86400000)

  const warmUp = EASY_GAMES[dayNumber % EASY_GAMES.length]
  const focus  = EASY_GAMES[(dayNumber + 1) % EASY_GAMES.length]
  const speed  = EASY_GAMES[(dayNumber + 2) % EASY_GAMES.length]
  const memory = MED_GAMES[dayNumber % MED_GAMES.length]
  const boss   = HARD_GAMES[dayNumber % HARD_GAMES.length]

  return [
    { ...warmUp, stepLabel: 'Warm-up',    stepIcon: '🔥', stepColor: 'text-orange-500',  stepBg: 'bg-white border-zinc-200' },
    { ...focus,  stepLabel: 'Focus',      stepIcon: '🎯', stepColor: 'text-blue-500',    stepBg: 'bg-white border-zinc-200' },
    { ...speed,  stepLabel: 'Speed',      stepIcon: '⚡', stepColor: 'text-yellow-500',  stepBg: 'bg-white border-zinc-200' },
    { ...memory, stepLabel: 'Memory',     stepIcon: '🧠', stepColor: 'text-purple-500',  stepBg: 'bg-white border-zinc-200' },
    { ...boss,   stepLabel: 'Boss Round', stepIcon: '💀', stepColor: 'text-red-500',     stepBg: 'bg-white border-zinc-200' },
  ]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function diffColor(bars) {
  if (bars === 1) return { ring: '#10b981', text: 'text-emerald-500' }
  if (bars === 2) return { ring: '#f59e0b', text: 'text-amber-500' }
  return { ring: '#ef4444', text: 'text-red-500' }
}

function getXpDisplay(game, gameRemainingXpByType, lastTrainingResult) {
  const entry = gameRemainingXpByType?.[game.gameType]
  const rem = Number(entry?.remaining_today)
  if (Number.isFinite(rem)) {
    return rem <= 0
      ? { text: 'Cap reached ✓', capped: true }
      : { text: `${rem} XP left`, capped: false }
  }
  if (lastTrainingResult?.label === game.resultLabel) {
    const r = Number(lastTrainingResult.remainingToday)
    if (Number.isFinite(r)) {
      return r <= 0
        ? { text: 'Cap reached ✓', capped: true }
        : { text: `${r} XP left`, capped: false }
    }
  }
  return { text: `Up to ${game.maxXp} XP`, capped: false }
}

// Signal bars
function DiffBars({ bars, small = false }) {
  const { ring } = diffColor(bars)
  return (
    <div className="flex items-end gap-[3px]">
      {[1, 2, 3].map((b) => (
        <div
          key={b}
          style={{
            width: small ? 4 : 5,
            height: b === 1 ? (small ? 4 : 5) : b === 2 ? (small ? 6 : 8) : (small ? 9 : 11),
            borderRadius: 1,
            backgroundColor: b <= bars ? ring : '#3f3f46',
          }}
        />
      ))}
    </div>
  )
}

// ── TRAIN TAB ─────────────────────────────────────────────────────────────────
function TrainTab({ onNavigate, gameRemainingXpByType, lastTrainingResult }) {
  const path = useMemo(() => getDailyTrainingPath(), [])
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="space-y-4">
      {/* Date + intro */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{today}</p>
        <h2 className="mt-1 text-lg font-black text-white leading-tight">Today's Training Path</h2>
        <p className="mt-1 text-xs font-semibold text-zinc-500">
          5 missions. Complete them in order for maximum gains.
        </p>

        {/* Path flow indicator */}
        <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1">
          {path.map((game, i) => (
            <div key={game.id} className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-black text-zinc-600">{game.stepIcon}</span>
              {i < path.length - 1 && (
                <span className="text-zinc-700 text-[10px]">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Training path steps */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {path.map((game, i) => {
          const xp = getXpDisplay(game, gameRemainingXpByType, lastTrainingResult)
          const { text: diffText } = diffColor(game.difficulty.bars)
          const isBoss = game.stepLabel === 'Boss Round'

          return (
            <div
              key={`${game.id}-${i}`}
              className={`relative rounded-2xl border overflow-hidden ${game.stepBg}`}
            >
              {/* Step number rail */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-current opacity-40"
                style={{ backgroundColor: isBoss ? '#ef4444' : undefined }}
              />

              <div className="pl-4 pr-4 py-3.5 flex items-center gap-3">
                {/* Step number */}
                <div className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full border ${
                  isBoss ? 'border-red-700 bg-red-950' : 'border-zinc-700 bg-zinc-900'
                }`}>
                  <span className="text-[11px] font-black text-zinc-300">{i + 1}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${game.stepColor}`}>
                      {game.stepIcon} {game.stepLabel}
                    </span>
                    {isBoss && (
                      <span className="rounded border border-red-800 bg-red-950 px-1.5 py-[2px] text-[8px] font-black uppercase tracking-[0.15em] text-red-400">
                        Classified
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-black text-zinc-900 leading-tight truncate">{game.title}</p>
                  <p className={`text-[10px] font-bold mt-0.5 ${xp.capped ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {xp.text}
                  </p>
                </div>

                {/* Diff bars + launch */}
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <DiffBars bars={game.difficulty.bars} small />
                  <button
                    type="button"
                    onClick={() => onNavigate(game.route)}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition active:scale-95 ${
                      isBoss
                        ? 'bg-red-500 text-white hover:bg-red-400'
                        : 'bg-zinc-900 text-white hover:bg-zinc-800'
                    }`}
                  >
                    {xp.capped ? 'Replay' : 'Start'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Motivational footer */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-center">
        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">
          Complete all 5 → Win Today
        </p>
      </div>
    </div>
  )
}

// ── EXPLORE TAB ───────────────────────────────────────────────────────────────
const EXPLORE_SECTIONS = [
  { id: 'speed_reaction', label: 'Speed & Reaction' },
  { id: 'memory_pattern', label: 'Memory & Pattern' },
  { id: 'logic_reasoning', label: 'Logic & Reasoning' },
]

function ExploreTab({ onNavigate, gameRemainingXpByType, lastTrainingResult }) {
  return (
    <div className="space-y-5">
      {EXPLORE_SECTIONS.map((section) => {
        const games = ALL_GAMES.filter((g) => g.category === section.id)
        return (
          <div key={section.id} className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              {section.label}
            </p>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {games.map((game) => {
                const xp = getXpDisplay(game, gameRemainingXpByType, lastTrainingResult)
                const { text: diffText } = diffColor(game.difficulty.bars)

                return (
                  <div
                    key={game.id}
                    onClick={() => onNavigate(game.route)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate(game.route) }}
                    className="rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 lg:px-5 lg:py-4 cursor-pointer transition-all duration-150 active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg shrink-0">{game.typeIcon}</span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-black leading-tight text-zinc-900">
                            {game.title}
                          </h3>
                          <p className="mt-0.5 text-[11px] font-semibold text-zinc-500 leading-snug line-clamp-1">
                            {game.desc}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <DiffBars bars={game.difficulty.bars} small />
                          <span className={`text-[10px] font-black ${diffText}`}>
                            {game.difficulty.label}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold ${xp.capped ? 'text-emerald-500' : 'text-zinc-500'}`}>
                          {xp.text}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── PROGRESS TAB ──────────────────────────────────────────────────────────────
// Skill bars derived from XP remaining vs cap per game type
function computeSkillScores(gameRemainingXpByType) {
  // Map each skill to its contributing game types and their caps
  const skillGames = {
    focus:  ['focus_tap', 'color_count_focus'],
    speed:  ['quick_math', 'reaction_tap'],
    memory: ['number_recall', 'speed_pattern', 'number_stack'],
    logic:  ['pattern_sequence', 'reverse_order', 'logic_grid'],
  }
  const caps = {
    quick_math: 50, focus_tap: 50, reaction_tap: 50,
    number_recall: 50, color_count_focus: 60, pattern_sequence: 80,
    speed_pattern: 100, number_stack: 75, reverse_order: 75, logic_grid: 100,
  }

  const scores = {}
  Object.entries(skillGames).forEach(([skill, types]) => {
    let earned = 0
    let total = 0
    types.forEach((gt) => {
      const cap = caps[gt] || 50
      const rem = Number(gameRemainingXpByType?.[gt]?.remaining_today)
      const xpEarned = Number.isFinite(rem) ? Math.max(0, cap - rem) : 0
      earned += xpEarned
      total  += cap
    })
    scores[skill] = total > 0 ? Math.round((earned / total) * 100) : 0
  })
  return scores
}

const SKILL_META = {
  focus:  { label: 'Focus',  icon: '🎯', color: '#60a5fa', desc: 'Attention & distraction resistance' },
  speed:  { label: 'Speed',  icon: '⚡', color: '#fbbf24', desc: 'Reaction & mental arithmetic' },
  memory: { label: 'Memory', icon: '🧠', color: '#a78bfa', desc: 'Recall & pattern retention' },
  logic:  { label: 'Logic',  icon: '🔍', color: '#34d399', desc: 'Reasoning & rule application' },
}

function getBrainProfile(scores) {
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const [strongest] = entries[0]
  const [weakest]   = entries[entries.length - 1]
  const meta = SKILL_META[strongest]

  const profiles = {
    focus:  'Focused Operator',
    speed:  'Speed-Dominant Thinker',
    memory: 'Memory Architect',
    logic:  'Logical Strategist',
  }

  return {
    title:    profiles[strongest] || 'Balanced Warrior',
    strongest: SKILL_META[strongest],
    weakest:   SKILL_META[weakest],
    strongestKey: strongest,
    weakestKey:   weakest,
  }
}

function SkillBar({ skill, score, color }) {
  const meta = SKILL_META[skill]
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{meta.icon}</span>
          <span className="text-xs font-black text-zinc-200 uppercase tracking-wider">{meta.label}</span>
        </div>
        <span className="text-xs font-black text-zinc-300 tabular-nums">{score}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${score}%`,
            backgroundColor: color,
            boxShadow: score > 0 ? `0 0 8px ${color}66` : 'none',
          }}
        />
      </div>
      <p className="text-[10px] font-semibold text-zinc-600">{meta.desc}</p>
    </div>
  )
}

function ProgressTab({ user, streakDays, level, xp, gameRemainingXpByType, lastTrainingResult }) {
  const scores  = useMemo(() => computeSkillScores(gameRemainingXpByType), [gameRemainingXpByType])
  const profile = useMemo(() => getBrainProfile(scores), [scores])

  // XP to next level using backend formula: level = floor(sqrt(xp/50))
  const currentLevelXp = level <= 1 ? 0 : level * level * 50
  const nextLevelXp    = (level + 1) * (level + 1) * 50
  const progressXp     = Math.max(0, xp - currentLevelXp)
  const neededXp       = Math.max(1, nextLevelXp - currentLevelXp)
  const levelPct       = Math.min(100, Math.round((progressXp / neededXp) * 100))

  // Today's XP earned across all game types
  const todayXp = useMemo(() => {
    let total = 0
    ALL_GAMES.forEach((g) => {
      const entry = gameRemainingXpByType?.[g.gameType]
      const rem   = Number(entry?.remaining_today)
      const cap   = Number(entry?.daily_cap)
      if (Number.isFinite(rem) && Number.isFinite(cap)) {
        total += Math.max(0, cap - rem)
      }
    })
    return total
  }, [gameRemainingXpByType])

  const allZero = Object.values(scores).every((s) => s === 0)

  return (
    <div className="space-y-4">

      {/* ── Identity card ── */}
      <div className="rounded-2xl border border-zinc-700 bg-zinc-950 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Brain Profile</p>
        <h2 className="mt-1.5 text-xl font-black text-white leading-tight">
          {allZero ? 'Start Training to Reveal' : profile.title}
        </h2>
        {!allZero && (
          <div className="mt-2 flex gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Strongest</p>
              <p className="text-xs font-black mt-0.5" style={{ color: profile.strongest.color }}>
                {profile.strongest.icon} {profile.strongest.label}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Needs Work</p>
              <p className="text-xs font-black mt-0.5" style={{ color: profile.weakest.color }}>
                {profile.weakest.icon} {profile.weakest.label}
              </p>
            </div>
          </div>
        )}
        {!allZero && (
          <p className="mt-2.5 text-xs font-semibold text-zinc-500 leading-relaxed">
            Train <span className="text-white font-black">{profile.weakest.label}</span> games to become a more complete warrior.
          </p>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Streak',    value: `${streakDays}d`, icon: '🔥' },
          { label: 'Level',     value: level,            icon: '⚔️' },
          { label: 'Today XP',  value: `+${todayXp}`,   icon: '⚡' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-center">
            <p className="text-base">{icon}</p>
            <p className="mt-1 text-lg font-black text-white leading-none">{value}</p>
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Level progress ── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Level {level} → {level + 1}</p>
          <p className="text-[10px] font-black text-zinc-400">{progressXp} / {neededXp} XP</p>
        </div>
        <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-white transition-all duration-700"
            style={{ width: `${levelPct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] font-semibold text-zinc-600">
          {neededXp - progressXp} XP to next level
        </p>
      </div>

      {/* ── Skill bars ── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Skill Breakdown — Today
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(SKILL_META).map(([key, meta]) => (
            <SkillBar
              key={key}
              skill={key}
              score={scores[key]}
              color={meta.color}
            />
          ))}
        </div>
        {allZero && (
          <p className="text-center text-xs font-semibold text-zinc-600 pt-1">
            Play games to see your skill breakdown.
          </p>
        )}
      </div>

      {/* ── Recommendation ── */}
      {!allZero && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
            Recommended Next
          </p>
          {(() => {
            const weakGames = ALL_GAMES.filter((g) => g.skillKey === profile.weakestKey)
            const pick = weakGames[Math.floor(Date.now() / 86400000) % weakGames.length]
            if (!pick) return null
            return (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">{pick.title}</p>
                  <p className="text-[11px] font-semibold text-zinc-500 mt-0.5">
                    Trains your weakest skill — {profile.weakest.label}
                  </p>
                </div>
                <span className="text-lg shrink-0">{pick.typeIcon}</span>
              </div>
            )
          })()}
        </div>
      )}

    </div>
  )
}

// ── Main GameHubPage ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'train',   label: '🔥 Train'   },
  { id: 'explore', label: '🔍 Explore' },
  { id: 'progress',label: '📈 Progress'},
]

export default function GameHubPage({
  onBack,
  onNavigate,
  dailyTrainingGameLabel,
  lastTrainingResult,
  gameRemainingXpByType,
  user,
  streakDays,
  level,
  xp,
}) {
  const [activeTab, setActiveTab] = useState('train')

  return (
    <section className="flex flex-col gap-4">

      {/* Back + header */}
      <div className="flex items-center pt-1">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100"
        >
          ← Back
        </button>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Training Hub</p>
        <h1 className="mt-0.5 text-2xl font-black tracking-tight text-zinc-900">Sharpen the weapon.</h1>
      </div>

      {/* Tab bar */}
      <div className="flex rounded-2xl border border-zinc-200 bg-zinc-100 p-1 gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-xl py-2 text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'train' && (
        <TrainTab
          onNavigate={onNavigate}
          gameRemainingXpByType={gameRemainingXpByType}
          lastTrainingResult={lastTrainingResult}
        />
      )}
      {activeTab === 'explore' && (
        <ExploreTab
          onNavigate={onNavigate}
          gameRemainingXpByType={gameRemainingXpByType}
          lastTrainingResult={lastTrainingResult}
        />
      )}
      {activeTab === 'progress' && (
        <ProgressTab
          user={user}
          streakDays={streakDays}
          level={level}
          xp={xp}
          gameRemainingXpByType={gameRemainingXpByType}
          lastTrainingResult={lastTrainingResult}
        />
      )}

      <div className="h-2" />
    </section>
  )
}
