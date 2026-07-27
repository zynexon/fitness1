import { useEffect, useState, useMemo } from 'react'
import confetti from 'canvas-confetti'

// ─── Constants ────────────────────────────────────────────────────────────────
// Mood labels per score
const MOOD_LABELS  = ['', 'Lost the day', 'Struggled', 'Held the line', 'Solid day', 'Crushed it']
const ENERGY_LABELS = ['', 'Completely drained', 'Low energy', 'Moderate', 'High energy', 'Locked in']

// Dot color by average score
function dotColor(avg) {
  if (avg === 0) return { bg: '#27272a', border: '#3f3f46' }
  if (avg <= 2)  return { bg: '#7f1d1d', border: '#ef4444' }
  if (avg <= 3)  return { bg: '#78350f', border: '#f59e0b' }
  return              { bg: '#14532d', border: '#22c55e' }
}

function scoreToTextColor(score) {
  if (!score) return 'text-zinc-600'
  if (score <= 2) return 'text-red-400'
  if (score <= 3) return 'text-amber-400'
  return 'text-emerald-400'
}

function formatLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Day labels for 7-day row
function getLast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso  = formatLocalDateKey(d)
    const day  = d.toLocaleDateString('en-US', { weekday: 'short' })
    days.push({ iso, day })
  }
  return days
}

function normalizeHistoryEntries(entries) {
  const mapped = {}
  ;(entries || []).forEach((entry) => {
    mapped[entry.date] = {
      mood: Number(entry.mood_score) || 0,
      energy: Number(entry.energy_score) || 0,
      objective: entry.objective || '',
    }
  })
  return mapped
}

function fireJournalConfetti() {
  confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.62 },
    zIndex: 11000,
  })

  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 110,
      origin: { y: 0.5 },
      zIndex: 11000,
    })
  }, 260)
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────
function Sparkline({ data, color, width = 220, height = 36 }) {
  if (!data || data.length < 2) return null
  const valid = data.filter((v) => v > 0)
  if (valid.length < 2) return null

  const pad = 4
  const w = width - pad * 2
  const h = height - pad * 2
  const step = w / (data.length - 1)

  const points = data.map((v, i) => {
    const x = pad + i * step
    const y = v === 0
      ? pad + h  // push zero values to bottom
      : pad + h - ((v - 1) / 4) * h
    return { x, y, v }
  })

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')

  // Area fill
  const areaD = `${pathD} L ${points[points.length - 1].x} ${pad + h} L ${points[0].x} ${pad + h} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={areaD} fill={`url(#grad-${color})`} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, i) =>
        p.v > 0 ? (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="#09090b" strokeWidth="1.5" />
        ) : null
      )}
    </svg>
  )
}

// ─── Score Picker — 5 tap circles ────────────────────────────────────────────
function ScorePicker({ value, onChange, color }) {
  return (
    <div className="flex items-center gap-2.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            className="transition-all duration-150 active:scale-90"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: `2px solid ${filled ? color : '#3f3f46'}`,
              backgroundColor: filled ? color : 'transparent',
              boxShadow: filled ? `0 0 10px ${color}55` : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {filled && (
              <div
                style={{
                  width: 10, height: 10,
                  borderRadius: '50%',
                  backgroundColor: '#09090b',
                  opacity: 0.6,
                }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Main Journal Page ────────────────────────────────────────────────────────
export default function JournalPage({
  authedFetch,
  onJournalSaved,
  onXpEarned, // callback(xpAmount, totalXp, level, streak) from App
}) {
  const today = formatLocalDateKey(new Date())
  const last7 = useMemo(() => getLast7Days(), [])

  // Entry state
  const [mood,      setMood]      = useState(0)
  const [energy,    setEnergy]    = useState(0)
  const [objective, setObjective] = useState('')
  const [savedToday, setSavedToday] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saveText,   setSaveText]   = useState('')
  const [loading,    setLoading]    = useState(true)

  // History from backend journal/history endpoint
  const [history, setHistory] = useState({})

  // Selected dot for detail popup
  const [selectedDot, setSelectedDot] = useState(null)

  // Load today's entry from backend on mount
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [journalData, historyData] = await Promise.all([
          authedFetch('/api/journal/'),
          authedFetch('/api/journal/history/').catch(() => []),
        ])

        if (Array.isArray(historyData)) {
          setHistory(normalizeHistoryEntries(historyData))
        }

        if (journalData.entry) {
          const entryDate = journalData.entry.date || today
          const m = Number(journalData.entry.mood_score)
          const e = Number(journalData.entry.energy_score)
          const o = journalData.entry.objective || ''
          if (!isNaN(m) && m >= 1 && m <= 5) setMood(m)
          if (!isNaN(e) && e >= 1 && e <= 5) setEnergy(e)
          setObjective(o)
          setSavedToday(entryDate === today)
          setHistory((current) => ({
            ...current,
            [entryDate]: {
              mood: !isNaN(m) && m >= 1 && m <= 5 ? m : 0,
              energy: !isNaN(e) && e >= 1 && e <= 5 ? e : 0,
              objective: o,
            },
          }))
        } else {
          setSavedToday(false)
        }
      } catch {
        // silently fail — user can still fill today
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [today])

  async function handleSave() {
    if (mood === 0 && energy === 0) {
      setSaveText('Set at least one score before saving.')
      return
    }

    const isFirstEntryToday = !savedToday
    setSaving(true)
    setSaveText('')
    try {
      const data = await authedFetch('/api/journal/', {
        method: 'POST',
        body: JSON.stringify({
          mood_score: mood > 0 ? mood : null,
          energy_score: energy > 0 ? energy : null,
          objective: objective.trim(),
        }),
      })
      setSavedToday(true)

      if (data.entry) {
        const entryDate = data.entry.date || today
        const nextMood = Number(data.entry.mood_score)
        const nextEnergy = Number(data.entry.energy_score)
        const nextObjective = data.entry.objective || objective.trim()
        setHistory((current) => ({
          ...current,
          [entryDate]: {
            mood: !isNaN(nextMood) && nextMood >= 1 && nextMood <= 5 ? nextMood : 0,
            energy: !isNaN(nextEnergy) && nextEnergy >= 1 && nextEnergy <= 5 ? nextEnergy : 0,
            objective: nextObjective,
          },
        }))
      }

      try {
        const historyData = await authedFetch('/api/journal/history/')
        if (Array.isArray(historyData)) {
          setHistory(normalizeHistoryEntries(historyData))
        }
      } catch {
        // Keep current local state if history refresh fails.
      }

      onJournalSaved?.()

      if (isFirstEntryToday) {
        fireJournalConfetti()
      }

      if (data.xp_awarded > 0) {
        setSaveText(`+${data.xp_awarded} XP earned`)
        onXpEarned?.(data.xp_awarded, data.total_xp, data.level, data.streak)
      } else {
        setSaveText('Entry updated.')
      }
    } catch (err) {
      setSaveText(err.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  // Build sparkline data arrays from history (last 7 days)
  const moodData   = last7.map((d) => history[d.iso]?.mood   || 0)
  const energyData = last7.map((d) => history[d.iso]?.energy || 0)

  // Insights from last 7 days
  const insights = useMemo(() => {
    const results = []
    const validMood   = moodData.filter((v) => v > 0)
    const validEnergy = energyData.filter((v) => v > 0)

    if (validEnergy.length >= 3) {
      const minIdx = energyData.reduce((acc, v, i) => (v > 0 && (acc === -1 || v < energyData[acc])) ? i : acc, -1)
      if (minIdx >= 0) results.push(`Energy lowest on ${last7[minIdx].day}`)
    }
    if (validMood.length >= 3) {
      const avg = Math.round(validMood.reduce((a, b) => a + b, 0) / validMood.length)
      results.push(`Avg mood this week: ${MOOD_LABELS[avg]}`)
    }
    if (validEnergy.length >= 2 && validMood.length >= 2) {
      const lastTwo = energyData.filter((v) => v > 0).slice(-2)
      if (lastTwo[1] > lastTwo[0]) results.push('Energy trending up ↑')
      else if (lastTwo[1] < lastTwo[0]) results.push('Energy trending down ↓')
    }
    return results.slice(0, 2)
  }, [moodData, energyData, last7])

  // Streak count from history
  const journalStreak = useMemo(() => {
    let streak = 0
    for (let i = 6; i >= 0; i--) {
      const entry = history[last7[i]?.iso]
      if (entry && (entry.mood > 0 || entry.energy > 0)) streak++
      else if (i < 6) break
    }
    return streak
  }, [history, last7])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm font-semibold text-zinc-400">Loading journal...</p>
      </div>
    )
  }

  return (
    <div className="lg:grid lg:grid-cols-[1fr_1fr] lg:gap-8 lg:items-start pb-6 space-y-5 lg:space-y-0">
      <div className="space-y-5">
      {/* ── Header ── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
              Daily Debrief
            </p>
            <h1 className="mt-1 text-xl font-black text-white leading-tight">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </h1>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-white">{journalStreak}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Day streak</p>
          </div>
        </div>

        {/* 7-day dot row */}
        <div className="mt-4 flex items-end justify-between">
          {last7.map((d) => {
            const entry = history[d.iso]
            const avg = entry
              ? (entry.mood > 0 && entry.energy > 0
                  ? (entry.mood + entry.energy) / 2
                  : entry.mood || entry.energy)
              : 0
            const isToday = d.iso === today
            const { bg, border } = dotColor(avg)
            return (
              <button
                key={d.iso}
                type="button"
                onClick={() => setSelectedDot(selectedDot === d.iso ? null : d.iso)}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div
                  style={{
                    width: isToday ? 14 : 12,
                    height: isToday ? 14 : 12,
                    borderRadius: '50%',
                    backgroundColor: bg,
                    border: `2px solid ${isToday ? '#ffffff' : border}`,
                    boxShadow: isToday ? '0 0 0 2px rgba(255,255,255,0.15)' : 'none',
                    transition: 'all 0.2s',
                  }}
                />
                <span className={`text-[9px] font-black uppercase ${isToday ? 'text-white' : 'text-zinc-600'}`}>
                  {d.day}
                </span>
              </button>
            )
          })}
        </div>

        {/* Dot detail popup */}
        {selectedDot && history[selectedDot] && (
          <div className="mt-3 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">
              {new Date(selectedDot + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <div className="flex gap-4">
              {history[selectedDot].mood > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase">Mood</p>
                  <p className={`text-xs font-black ${scoreToTextColor(history[selectedDot].mood)}`}>
                    {history[selectedDot].mood}/5 — {MOOD_LABELS[history[selectedDot].mood]}
                  </p>
                </div>
              )}
              {history[selectedDot].energy > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase">Energy</p>
                  <p className={`text-xs font-black ${scoreToTextColor(history[selectedDot].energy)}`}>
                    {history[selectedDot].energy}/5 — {ENERGY_LABELS[history[selectedDot].energy]}
                  </p>
                </div>
              )}
            </div>
            {history[selectedDot].objective ? (
              <p className="mt-1.5 text-[11px] font-semibold text-zinc-400 italic">
                "{history[selectedDot].objective}"
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Sparkline charts — only after 2+ days of data ── */}
      {(moodData.filter((v) => v > 0).length >= 2 || energyData.filter((v) => v > 0).length >= 2) && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 space-y-4 hidden lg:block">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">7-Day Trends</p>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="space-y-1">
              {insights.map((insight, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-zinc-500 shrink-0" />
                  <p className="text-xs font-semibold text-zinc-400">{insight}</p>
                </div>
              ))}
            </div>
          )}

          {/* Mood sparkline */}
          {moodData.filter((v) => v > 0).length >= 2 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Mood</p>
                <p className="text-[10px] font-bold text-zinc-600">
                  {MOOD_LABELS[moodData.filter((v) => v > 0).slice(-1)[0]]} today
                </p>
              </div>
              <Sparkline data={moodData} color="#22c55e" width={300} height={40} />
              <div className="mt-1 flex justify-between">
                {last7.map((d) => (
                  <span key={d.iso} className="text-[8px] font-bold text-zinc-700 w-[14.28%] text-center">
                    {d.day[0]}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Energy sparkline */}
          {energyData.filter((v) => v > 0).length >= 2 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Energy</p>
                <p className="text-[10px] font-bold text-zinc-600">
                  {ENERGY_LABELS[energyData.filter((v) => v > 0).slice(-1)[0]]} today
                </p>
              </div>
              <Sparkline data={energyData} color="#60a5fa" width={300} height={40} />
              <div className="mt-1 flex justify-between">
                {last7.map((d) => (
                  <span key={d.iso} className="text-[8px] font-bold text-zinc-700 w-[14.28%] text-center">
                    {d.day[0]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      </div>
      <div className="space-y-5">
      {/* ── Mood score ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Today's Mood</p>
            <p className={`mt-0.5 text-sm font-black transition-colors duration-200 ${scoreToTextColor(mood)}`}>
              {mood > 0 ? `${mood}/5 — ${MOOD_LABELS[mood]}` : 'Tap to set'}
            </p>
          </div>
          {mood > 0 && (
            <span className="text-2xl font-black" style={{ color: mood <= 2 ? '#ef4444' : mood <= 3 ? '#f59e0b' : '#22c55e' }}>
              {mood <= 2 ? '😔' : mood <= 3 ? '😐' : mood <= 4 ? '💪' : '🔥'}
            </span>
          )}
        </div>
        <ScorePicker value={mood} onChange={setMood} color={mood <= 2 ? '#ef4444' : mood <= 3 ? '#f59e0b' : '#22c55e'} />
      </div>

      {/* ── Energy score ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Today's Energy</p>
            <p className={`mt-0.5 text-sm font-black transition-colors duration-200 ${scoreToTextColor(energy)}`}>
              {energy > 0 ? `${energy}/5 — ${ENERGY_LABELS[energy]}` : 'Tap to set'}
            </p>
          </div>
          {energy > 0 && (
            <span className="text-2xl font-black">
              {energy <= 2 ? '🪫' : energy <= 3 ? '⚡' : energy <= 4 ? '⚡' : '💥'}
            </span>
          )}
        </div>
        <ScorePicker value={energy} onChange={setEnergy} color={energy <= 2 ? '#ef4444' : energy <= 3 ? '#f59e0b' : '#60a5fa'} />
      </div>

      {/* ── Tomorrow's objective ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">
          Tomorrow's Objective
        </p>
        <p className="text-xs font-semibold text-zinc-400 mb-3">
          One specific thing you will do.
        </p>
        <input
          type="text"
          maxLength={80}
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="e.g. Study for 2 hours without phone"
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-400 placeholder:text-zinc-300 transition"
        />
        <p className="mt-1.5 text-right text-[10px] font-semibold text-zinc-300">{objective.length}/80</p>
      </div>

      {/* ── Save button ── */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-2xl bg-zinc-900 py-3.5 text-sm font-black uppercase tracking-widest text-white transition hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-60"
      >
        {saving ? 'Saving...' : savedToday ? 'Update Entry' : 'Save Entry'}
      </button>

      {saveText ? (
        <p className={`text-center text-xs font-bold ${saveText.includes('XP') ? 'text-emerald-600' : 'text-zinc-500'}`}>
          {saveText}
        </p>
      ) : null}

      {/* Sparkline charts for mobile (shown at bottom) */}
      {(moodData.filter((v) => v > 0).length >= 2 || energyData.filter((v) => v > 0).length >= 2) && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 space-y-4 lg:hidden mt-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">7-Day Trends</p>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="space-y-1">
              {insights.map((insight, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-zinc-500 shrink-0" />
                  <p className="text-xs font-semibold text-zinc-400">{insight}</p>
                </div>
              ))}
            </div>
          )}

          {/* Mood sparkline */}
          {moodData.filter((v) => v > 0).length >= 2 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Mood</p>
                <p className="text-[10px] font-bold text-zinc-600">
                  {MOOD_LABELS[moodData.filter((v) => v > 0).slice(-1)[0]]} today
                </p>
              </div>
              <Sparkline data={moodData} color="#22c55e" width={300} height={40} />
              <div className="mt-1 flex justify-between">
                {last7.map((d) => (
                  <span key={d.iso} className="text-[8px] font-bold text-zinc-700 w-[14.28%] text-center">
                    {d.day[0]}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Energy sparkline */}
          {energyData.filter((v) => v > 0).length >= 2 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Energy</p>
                <p className="text-[10px] font-bold text-zinc-600">
                  {ENERGY_LABELS[energyData.filter((v) => v > 0).slice(-1)[0]]} today
                </p>
              </div>
              <Sparkline data={energyData} color="#60a5fa" width={300} height={40} />
              <div className="mt-1 flex justify-between">
                {last7.map((d) => (
                  <span key={d.iso} className="text-[8px] font-bold text-zinc-700 w-[14.28%] text-center">
                    {d.day[0]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      </div>
    </div>
  )
}
