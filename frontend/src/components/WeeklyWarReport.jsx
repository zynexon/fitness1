import { useCallback, useEffect, useRef, useState } from 'react'
import branding from '../config/branding'

// ─── VAPID public key — generate once and put in your .env ───────────────────
// Run: npx web-push generate-vapid-keys
// Set VITE_VAPID_PUBLIC_KEY in frontend/.env
// Set VAPID_PRIVATE_KEY + VAPID_EMAIL in Railway env vars
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

// ─── Helpers ──────────────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

function gradeColor(grade) {
  if (grade === 'S') return { text: 'text-amber-400',   bg: 'bg-amber-950',   border: 'border-amber-700' }
  if (grade === 'A') return { text: 'text-emerald-400', bg: 'bg-emerald-950', border: 'border-emerald-700' }
  if (grade === 'B') return { text: 'text-blue-400',    bg: 'bg-blue-950',    border: 'border-blue-700' }
  if (grade === 'C') return { text: 'text-amber-500',   bg: 'bg-amber-950',   border: 'border-amber-800' }
  return               { text: 'text-red-400',    bg: 'bg-red-950',     border: 'border-red-800' }
}

function gradeMessage(grade) {
  if (grade === 'S') return 'LEGENDARY'
  if (grade === 'A') return 'STRONG'
  if (grade === 'B') return 'DECENT'
  if (grade === 'C') return 'SURVIVED'
  return 'LOST'
}

// TODO: Unify GAME_LABELS war_mode_* entries with branding.copyPack.sessionModeLabels in a future pass
const GAME_LABELS = {
  quick_math:        'Quick Math',
  focus_tap:         'Focus Tap',
  reaction_tap:      'Reaction Tap',
  number_recall:     'Number Recall',
  color_count_focus: 'Color Count',
  speed_pattern:     'Speed Pattern',
  reverse_order:     'Reverse Order',
  number_stack:      'Number Stack',
  logic_grid:        'Logic Grid',
  war_mode_skirmish: 'Skirmish',
  war_mode_battle:   'Battle',
  war_mode_full_war: 'Full War',
}

function StatBar({ label, value, max, color = 'bg-white' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
        <span className="text-[10px] font-black text-zinc-300">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function XPSlice({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  if (value <= 0) return null
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-zinc-800 last:border-0">
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-xs font-semibold text-zinc-300">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-black text-zinc-200">+{value}</span>
        <span className="text-[10px] font-semibold text-zinc-600">{pct}%</span>
      </div>
    </div>
  )
}

// ─── Push notification hook ───────────────────────────────────────────────────
function usePushNotifications(authedFetch) {
  const [pushStatus, setPushStatus] = useState('unknown') // unknown | unsupported | denied | granted | subscribed
  const [pushLoading, setPushLoading] = useState(false)
  const subRef = useRef(null)

  useEffect(() => {
    async function checkStatus() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushStatus('unsupported')
        return
      }
      const perm = Notification.permission
      if (perm === 'denied') { setPushStatus('denied'); return }

      try {
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        if (existing) {
          subRef.current = existing
          setPushStatus('subscribed')
        } else {
          setPushStatus(perm === 'granted' ? 'granted' : 'unknown')
        }
      } catch {
        setPushStatus('unknown')
      }
    }
    checkStatus()
  }, [])

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) {
      console.warn('VITE_VAPID_PUBLIC_KEY not set — push notifications disabled')
      return
    }
    setPushLoading(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setPushStatus('denied'); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      subRef.current = sub

      const key  = sub.getKey('p256dh')
      const auth = sub.getKey('auth')

      await authedFetch('/api/push/subscribe/', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh:   key  ? btoa(String.fromCharCode(...new Uint8Array(key)))  : '',
          auth:     auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : '',
        }),
      })
      setPushStatus('subscribed')
    } catch (err) {
      console.error('Push subscribe failed:', err)
      setPushStatus('unknown')
    } finally {
      setPushLoading(false)
    }
  }, [authedFetch])

  const unsubscribe = useCallback(async () => {
    setPushLoading(true)
    try {
      if (subRef.current) {
        await authedFetch('/api/push/subscribe/', {
          method: 'DELETE',
          body: JSON.stringify({ endpoint: subRef.current.endpoint }),
        })
        await subRef.current.unsubscribe()
        subRef.current = null
      }
      setPushStatus('unknown')
    } catch (err) {
      console.error('Push unsubscribe failed:', err)
    } finally {
      setPushLoading(false)
    }
  }, [authedFetch])

  return { pushStatus, pushLoading, subscribe, unsubscribe }
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) return
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
      else setVal(target)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return val
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function dayLabel(isoDate) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const d = new Date(isoDate + 'T00:00:00')
  return days[d.getDay()]
}

// ─── Main component ───────────────────────────────────────────────────────────
function WeeklyWarReport({ authedFetch, onClose, userName }) {
  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [tab, setTab]         = useState('overview') // overview | xp | games | journal
  const { pushStatus, pushLoading, subscribe, unsubscribe } = usePushNotifications(authedFetch)

  // Animated numbers
  const animXP     = useCountUp(report?.total_xp_earned  || 0)
  const animTasks  = useCountUp(report?.tasks_completed   || 0)
  const animGames  = useCountUp(report?.games_played      || 0)
  const animScore  = useCountUp(report?.performance_score || 0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await authedFetch('/api/weekly-report/')
        setReport(data)
      } catch (err) {
        setError(err.message || 'Could not load weekly report.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authedFetch])

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-4">
          <div className="text-3xl font-black tracking-[0.18em] text-white">{branding.copyPack.weeklyReportCopy.loadingTitle}</div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">{branding.copyPack.weeklyReportCopy.loadingSubtitle}</p>
          <div className="flex gap-1.5 justify-center">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-white"
                style={{ animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
        </div>
        <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-8px);opacity:1}}`}</style>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950 p-6">
        <div className="text-center space-y-4">
          <p className="text-zinc-300 font-semibold">{error}</p>
          <button type="button" onClick={onClose}
            className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-bold text-zinc-200 hover:bg-zinc-800 transition">
            Close
          </button>
        </div>
      </div>
    )
  }

  if (!report) return null

  const gc     = gradeColor(report.grade)
  const total  = report.total_xp_earned || 1 // avoid div/0 in slices

  // Build a week grid (Mon–Sun) showing active days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(report.week_start + 'T00:00:00')
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  function pushIcon() {
    if (pushStatus === 'subscribed') return '🔔'
    if (pushStatus === 'denied') return '🚫'
    if (pushStatus === 'unsupported') return '⚠️'
    return '🔕'
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-zinc-950">
      <div className="mx-auto max-w-md lg:max-w-3xl px-4 pb-24 pt-4 space-y-4">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-500">
              {fmtDate(report.week_start)} — {fmtDate(report.week_end)}
            </p>
            <h1 className="text-lg font-black text-white">{branding.copyPack.weeklyReportCopy.reportTitle}</h1>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white transition">
            ✕
          </button>
        </div>

        {/* ── Hero grade card ── */}
        <div className={`rounded-3xl border ${gc.border} ${gc.bg} p-5 relative overflow-hidden`}>
          {/* Background text watermark */}
          <div className="pointer-events-none absolute -right-4 -top-6 text-[120px] font-black leading-none opacity-10 select-none"
            style={{ color: 'white' }}>
            {report.grade}
          </div>

          <div className="relative z-10">
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-400">
              {userName ? `${userName}'s` : 'Your'} Performance
            </p>
            <div className="mt-2 flex items-end gap-4">
              <div>
                <div className={`text-7xl font-black leading-none ${gc.text}`}>{report.grade}</div>
                <div className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-zinc-300">
                  {gradeMessage(report.grade)}
                </div>
              </div>
              <div className="flex-1 space-y-1 pb-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Score</span>
                  <span className="text-sm font-black text-white">{animScore}/100</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      report.grade === 'S' ? 'bg-amber-400' :
                      report.grade === 'A' ? 'bg-emerald-400' :
                      report.grade === 'B' ? 'bg-blue-400' :
                      report.grade === 'C' ? 'bg-amber-500' : 'bg-red-400'
                    }`}
                    style={{ width: `${animScore}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-300 italic">
              "{report.verdict}"
            </p>
          </div>
        </div>

        {/* ── Quick stats row ── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'XP Earned',   value: animXP,    suffix: '' },
            { label: 'Tasks Done',  value: animTasks,  suffix: '' },
            { label: 'Games Played',value: animGames,  suffix: '' },
          ].map(({ label, value, suffix }) => (
            <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-center">
              <p className="text-2xl font-black text-white tabular-nums">{value}{suffix}</p>
              <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Week activity heatmap ── */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">Days Active This Week</p>
          <div className="flex gap-2 justify-between">
            {weekDays.map((date) => {
              // We don't have per-day data from the API yet, but we track active_days count
              // For now show Mon-Sun labels with the active_days count filled from left
              const dayIdx   = weekDays.indexOf(date)
              const isActive = dayIdx < report.active_days
              return (
                <div key={date} className="flex flex-col items-center gap-1.5">
                  <div className={`h-8 w-8 rounded-lg border transition-all ${
                    isActive
                      ? 'border-emerald-600 bg-emerald-900/60'
                      : 'border-zinc-700 bg-zinc-800'
                  }`} />
                  <span className={`text-[9px] font-bold ${isActive ? 'text-emerald-400' : 'text-zinc-600'}`}>
                    {dayLabel(date)}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-[10px] font-semibold text-zinc-600">
            {report.active_days}/7 days active
          </p>
        </div>

        {/* ── Tab navigation ── */}
        <div className="grid grid-cols-4 gap-1 rounded-2xl border border-zinc-800 bg-zinc-900 p-1">
          {[
            ['overview', 'Overview'],
            ['xp',       'XP'],
            ['games',    'Games'],
            ['journal',  'Journal'],
          ].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`rounded-xl py-1.5 text-[10px] font-black uppercase tracking-wider transition ${
                tab === key ? 'bg-white text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}

        {tab === 'overview' && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Performance Breakdown</p>
            <StatBar label="Tasks (max 35/wk)" value={report.tasks_completed} max={35} color="bg-blue-400" />
            <StatBar label="Games (max 14/wk)"  value={report.games_played}   max={14} color="bg-purple-400" />
            <StatBar label="Journal (max 7/wk)" value={report.journal_entries} max={7}  color="bg-amber-400" />
            <StatBar label="XP (max 500/wk)"    value={report.total_xp_earned} max={500} color="bg-emerald-400" />

            <div className="mt-2 border-t border-zinc-800 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400">Current Streak</span>
                <span className="text-sm font-black text-white">🔥 {report.current_streak} days</span>
              </div>
              {report.current_rank && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Weekly Rank</span>
                  <span className="text-sm font-black text-white">#{report.current_rank} of {report.total_users}</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400">Total XP</span>
                <span className="text-sm font-black text-white">{report.current_xp} XP</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400">Level</span>
                <span className="text-sm font-black text-white">Level {report.current_level}</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'xp' && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">XP Sources</p>
              <p className="text-lg font-black text-white">+{report.total_xp_earned} total</p>
            </div>

            {/* Stacked bar */}
            {report.total_xp_earned > 0 ? (
              <div className="h-3 w-full flex rounded-full overflow-hidden gap-0.5">
                {report.xp_from_tasks > 0 && (
                  <div className="bg-blue-400 transition-all" style={{ width: `${report.xp_from_tasks / total * 100}%` }} />
                )}
                {report.xp_from_games > 0 && (
                  <div className="bg-purple-400 transition-all" style={{ width: `${report.xp_from_games / total * 100}%` }} />
                )}
                {report.xp_from_journal > 0 && (
                  <div className="bg-amber-400 transition-all" style={{ width: `${report.xp_from_journal / total * 100}%` }} />
                )}
                {report.xp_from_challenges > 0 && (
                  <div className="bg-emerald-400 transition-all" style={{ width: `${report.xp_from_challenges / total * 100}%` }} />
                )}
              </div>
            ) : (
              <div className="h-3 w-full rounded-full bg-zinc-800" />
            )}

            <div className="border-t border-zinc-800 pt-2 space-y-0">
              <XPSlice label="Tasks"           value={report.xp_from_tasks}      total={total} color="bg-blue-400" />
              <XPSlice label="Games"           value={report.xp_from_games}      total={total} color="bg-purple-400" />
              <XPSlice label="Journal"         value={report.xp_from_journal}    total={total} color="bg-amber-400" />
              <XPSlice label="Daily Challenges" value={report.xp_from_challenges} total={total} color="bg-emerald-400" />
              {report.total_xp_earned === 0 && (
                <p className="py-4 text-center text-xs font-semibold text-zinc-600">No XP earned this week.</p>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Best source this week</p>
              <p className="mt-1 text-sm font-black text-white">
                {Math.max(
                  report.xp_from_tasks,
                  report.xp_from_games,
                  report.xp_from_journal,
                  report.xp_from_challenges,
                ) === report.xp_from_tasks ? '📋 Tasks' :
                  Math.max(report.xp_from_tasks, report.xp_from_games, report.xp_from_journal) === report.xp_from_games
                    ? '🎮 Games' : report.xp_from_journal >= report.xp_from_challenges ? '📖 Journal' : '⚔️ Challenges'
                }
              </p>
            </div>
          </div>
        )}

        {tab === 'games' && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Games This Week</p>
              <p className="text-lg font-black text-white">{report.games_played} sessions</p>
            </div>

            {report.game_type_breakdown?.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-zinc-600">Most played</p>
                {report.game_type_breakdown.map(({ game_type, count }, i) => (
                  <div key={game_type} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-[10px] font-black text-zinc-400">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-bold text-zinc-200">
                      {GAME_LABELS[game_type] || game_type}
                    </span>
                    <span className="text-sm font-black text-white">{count}×</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-xs font-semibold text-zinc-600">No games played this week.</p>
            )}

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">From games</p>
              <p className="text-lg font-black text-white">+{report.xp_from_games} XP</p>
            </div>
          </div>
        )}

        {tab === 'journal' && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Journal This Week</p>
              <p className="text-lg font-black text-white">{report.journal_entries}/7 days</p>
            </div>

            {/* Journal consistency visual */}
            <div className="flex gap-2">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className={`flex-1 h-10 rounded-lg border transition-all ${
                  i < report.journal_entries
                    ? 'border-amber-600 bg-amber-900/40'
                    : 'border-zinc-700 bg-zinc-800'
                }`} />
              ))}
            </div>
            <p className="text-[10px] font-semibold text-zinc-600">
              {report.journal_entries === 7
                ? 'Perfect journal week 🔥'
                : report.journal_entries === 0
                  ? 'No journal entries this week.'
                  : `${7 - report.journal_entries} missed day${7 - report.journal_entries > 1 ? 's' : ''}`}
            </p>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">From journal</p>
              <p className="text-lg font-black text-white">+{report.xp_from_journal} XP</p>
            </div>

            <div className="rounded-xl border border-amber-800/40 bg-amber-950/30 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Why it matters</p>
              <p className="text-xs font-semibold text-amber-200 leading-relaxed">
                The journal forces you to face what you did and didn't do. That honesty compounds over weeks.
              </p>
            </div>
          </div>
        )}

        {/* ── Push notification toggle ── */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-zinc-200">
                {pushIcon()} Sunday Notifications
              </p>
              <p className="mt-0.5 text-[10px] font-semibold text-zinc-500 leading-relaxed">
                {pushStatus === 'subscribed'
                  ? 'You\'ll get your weekly report every Sunday at 8pm.'
                  : pushStatus === 'denied'
                    ? 'Notifications blocked. Enable in browser settings.'
                    : pushStatus === 'unsupported'
                      ? 'Your browser doesn\'t support push notifications.'
                      : branding.copyPack.weeklyReportCopy.pushPrompt}
              </p>
            </div>
            {pushStatus !== 'unsupported' && pushStatus !== 'denied' && (
              <button
                type="button"
                disabled={pushLoading}
                onClick={pushStatus === 'subscribed' ? unsubscribe : subscribe}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition disabled:opacity-60 ${
                  pushStatus === 'subscribed'
                    ? 'border-zinc-600 bg-transparent text-zinc-400 hover:border-red-700 hover:text-red-400'
                    : 'border-white bg-white text-zinc-950 hover:bg-zinc-200'
                }`}
              >
                {pushLoading ? '...' : pushStatus === 'subscribed' ? 'Turn Off' : 'Enable'}
              </button>
            )}
          </div>
          {!VAPID_PUBLIC_KEY && (
            <p className="mt-2 text-[10px] font-semibold text-amber-600">
              ⚠ Add VITE_VAPID_PUBLIC_KEY to frontend/.env to enable push notifications.
            </p>
          )}
        </div>

        {/* ── Motivational closer ── */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500 mb-2">Next Week</p>
          <p className="text-sm font-black text-white leading-relaxed">
            {report.grade === 'S' || report.grade === 'A'
              ? 'Defend your standard. The streak is watching.'
              : report.grade === 'B'
                ? 'Close the gaps. One more notch and you break through.'
                : 'The week is done. Forget it. Win the next one.'}
          </p>
        </div>

      </div>
    </div>
  )
}

export default WeeklyWarReport
