import { useEffect, useMemo, useRef, useState } from 'react'
import LegacyArtifactVault from '../LegacyArtifactVault'
import branding, { getLevelTitle } from '../../config/branding'

// Keep in sync with App.jsx.
const MAX_STREAK_SHIELDS = 3

const LEVEL_TITLES = branding.copyPack.levelTitles

const BADGES = [
  { id: 'streak_5', icon: '🔥', title: branding.copyPack.badgeDefinitions.streak_5.title, desc: branding.copyPack.badgeDefinitions.streak_5.desc, check: (s) => s.streak >= 5 },
  { id: 'streak_10', icon: '⚡', title: branding.copyPack.badgeDefinitions.streak_10.title, desc: branding.copyPack.badgeDefinitions.streak_10.desc, check: (s) => s.streak >= 10 },
  { id: 'streak_30', icon: '💀', title: branding.copyPack.badgeDefinitions.streak_30.title, desc: branding.copyPack.badgeDefinitions.streak_30.desc, check: (s) => s.streak >= 20 },
  { id: 'tasks_10', icon: '✅', title: branding.copyPack.badgeDefinitions.tasks_10.title, desc: branding.copyPack.badgeDefinitions.tasks_10.desc, check: (s) => s.totalTasksCompleted >= 10 },
  { id: 'tasks_50', icon: '⚔️', title: branding.copyPack.badgeDefinitions.tasks_50.title, desc: branding.copyPack.badgeDefinitions.tasks_50.desc, check: (s) => s.totalTasksCompleted >= 50 },
  { id: 'tasks_100', icon: '🛡️', title: branding.copyPack.badgeDefinitions.tasks_100.title, desc: branding.copyPack.badgeDefinitions.tasks_100.desc, check: (s) => s.totalTasksCompleted >= 100 },
  { id: 'level_5', icon: '🥉', title: branding.copyPack.badgeDefinitions.level_5.title, desc: branding.copyPack.badgeDefinitions.level_5.desc, check: (s) => s.level >= 5 },
  { id: 'level_10', icon: '🥈', title: branding.copyPack.badgeDefinitions.level_10.title, desc: branding.copyPack.badgeDefinitions.level_10.desc, check: (s) => s.level >= 10 },
  { id: 'level_20', icon: '🏆', title: branding.copyPack.badgeDefinitions.level_20.title, desc: branding.copyPack.badgeDefinitions.level_20.desc, check: (s) => s.level >= 20 },
  { id: 'level_30', icon: '🏴', title: branding.copyPack.badgeDefinitions.level_30.title, desc: branding.copyPack.badgeDefinitions.level_30.desc, check: (s) => s.level >= 30, rare: true },
  { id: 'war_1', icon: '🪖', title: branding.copyPack.badgeDefinitions.war_1.title, desc: branding.copyPack.badgeDefinitions.war_1.desc, check: (s) => s.warModeSessions >= 1 },
  { id: 'war_5', icon: '🔫', title: branding.copyPack.badgeDefinitions.war_5.title, desc: branding.copyPack.badgeDefinitions.war_5.desc, check: (s) => s.warModeSessions >= 5 },
  { id: 'war_full_5', icon: '💣', title: branding.copyPack.badgeDefinitions.war_full_5.title, desc: branding.copyPack.badgeDefinitions.war_full_5.desc, check: (s) => s.fullWarSessions >= 5, rare: true },
  { id: 'xp_500', icon: '💰', title: branding.copyPack.badgeDefinitions.xp_500.title, desc: branding.copyPack.badgeDefinitions.xp_500.desc, check: (s) => s.xp >= 500 },
  { id: 'xp_1000', icon: '💎', title: branding.copyPack.badgeDefinitions.xp_1000.title, desc: branding.copyPack.badgeDefinitions.xp_1000.desc, check: (s) => s.xp >= 1000 },
  { id: 'shield_max', icon: '🛡️', title: branding.copyPack.badgeDefinitions.shield_max.title, desc: branding.copyPack.badgeDefinitions.shield_max.desc, check: (s) => s.streak_shields >= 3 },
  { id: 'journal_7', icon: '📖', title: branding.copyPack.badgeDefinitions.journal_7.title, desc: branding.copyPack.badgeDefinitions.journal_7.desc, check: (s) => s.journalEntries >= 7 },
]

const FOCUS_OPTIONS = [
  { key: 'study', icon: '📚', label: 'Study / Learning', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'fitness', icon: '💪', label: 'Fitness', color: '#10b981', bg: '#f0fdf4' },
  { key: 'discipline', icon: '🧠', label: 'Discipline / Focus', color: '#f97316', bg: '#fff7ed' },
  { key: 'work', icon: '💼', label: 'Work / Productivity', color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'logic', icon: '⚡', label: 'Logic', color: '#f43f5e', bg: '#fff1f2' },
]

// getLevelTitle is imported from '../../config/branding'

function getBadgeIcon(badgeId) {
  return BADGES.find((b) => b.id === badgeId)?.icon || null
}

function toLocalDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function LevelBar({ xp, level }) {
  const currentLevelXp = level <= 1 ? 0 : level * level * 50
  const nextLevelXp = (level + 1) * (level + 1) * 50
  const progressXp = Math.max(0, xp - currentLevelXp)
  const neededXp = Math.max(1, nextLevelXp - currentLevelXp)
  const pct = Math.min(100, Math.round((progressXp / neededXp) * 100))
  const isMax = level >= 30

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          {isMax ? 'MAX RANK' : `Level ${level} -> ${level + 1}`}
        </span>
        <span className="text-[10px] font-bold text-zinc-400 tabular-nums">
          {isMax ? `${xp} XP total` : `${progressXp} / ${neededXp} XP`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${isMax ? 'bg-amber-400' : 'bg-white'}`}
          style={{ width: `${isMax ? 100 : pct}%` }}
        />
      </div>
    </div>
  )
}

function ShieldRow({ count }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: MAX_STREAK_SHIELDS }).map((_, i) => (
        i < count
          ? <span key={i} className="text-base leading-none">🛡️</span>
          : <div key={i} className="h-4 w-4 rounded-full border-2 border-zinc-700" />
      ))}
      <span className="text-[10px] font-bold text-zinc-500">{count}/{MAX_STREAK_SHIELDS}</span>
    </div>
  )
}

function StreakCalendar({ activeDates = [] }) {
  const activeSet = useMemo(() => new Set(activeDates), [activeDates])

  const days = useMemo(() => {
    const result = []
    for (let i = 27; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const iso = toLocalDateKey(d)
      const dow = d.getDay()
      result.push({ iso, dow, day: d.getDate(), isToday: i === 0 })
    }
    return result
  }, [])

  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const activeCount = days.filter((d) => activeSet.has(d.iso)).length

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">28-Day Activity</p>
        <span className="text-[10px] font-bold text-zinc-400">{activeCount}/28 days active</span>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {DAY_LABELS.map((l, i) => (
          <div key={i} className="text-center text-[9px] font-bold text-zinc-600">{l}</div>
        ))}
      </div>

      {(() => {
        const firstDow = days[0].dow
        const padded = [
          ...Array.from({ length: firstDow }, (_, i) => ({ iso: `pad-${i}`, pad: true })),
          ...days,
        ]
        return (
          <div className="grid grid-cols-7 gap-1">
            {padded.map((d) => {
              if (d.pad) return <div key={d.iso} />
              const isActive = activeSet.has(d.iso)
              return (
                <div
                  key={d.iso}
                  title={d.iso}
                  className={`flex h-7 w-full items-center justify-center rounded-md text-[9px] font-bold transition-all ${
                    d.isToday
                      ? isActive
                        ? 'bg-white text-zinc-950 ring-2 ring-white ring-offset-1 ring-offset-zinc-950'
                        : 'border border-zinc-600 text-zinc-400'
                      : isActive
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-800'
                        : 'bg-zinc-900 text-zinc-700'
                  }`}
                >
                  {d.day}
                </div>
              )
            })}
          </div>
        )
      })()}

      <div className="mt-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-emerald-500/20 border border-emerald-800" />
          <span className="text-[9px] font-semibold text-zinc-500">Active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-zinc-900" />
          <span className="text-[9px] font-semibold text-zinc-500">Missed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm border border-zinc-600" />
          <span className="text-[9px] font-semibold text-zinc-500">Today</span>
        </div>
      </div>
    </div>
  )
}

function FocusStats({ focusStats = [], currentFocus }) {
  const total = focusStats.reduce((s, f) => s + f.count, 0)

  if (focusStats.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Task Breakdown</p>
        <p className="text-xs font-semibold text-zinc-600">Complete tasks to see your category breakdown.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Task Breakdown</p>
        <span className="text-[10px] font-bold text-zinc-400">{total} total</span>
      </div>

      {total > 0 && (
        <div className="flex h-2.5 w-full overflow-hidden rounded-full gap-0.5">
          {focusStats.map(({ category, count }) => {
            const opt = FOCUS_OPTIONS.find((f) => f.key === category)
            if (!opt || count === 0) return null
            return (
              <div
                key={category}
                style={{ width: `${(count / total) * 100}%`, background: opt.color }}
                className="rounded-full transition-all duration-700"
              />
            )
          })}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {focusStats.map(({ category, count }) => {
          const opt = FOCUS_OPTIONS.find((f) => f.key === category)
          if (!opt) return null
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const isCurrent = category === currentFocus
          return (
            <div key={category} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${isCurrent ? 'border border-zinc-700 bg-zinc-900' : ''}`}>
              <span className="text-base leading-none">{opt.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isCurrent ? 'text-zinc-200' : 'text-zinc-400'}`}>
                    {opt.label}
                    {isCurrent && <span className="ml-1.5 text-[8px] text-zinc-500">CURRENT</span>}
                  </span>
                  <span className="text-[10px] font-black text-zinc-300">{count}</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: opt.color }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BadgeShowcase({ earnedBadges, lockedBadges, equippedBadge, onToggleBadge, badgeStats }) {
  const equippedMeta = BADGES.find((b) => b.id === equippedBadge)

  function getProgress(badge) {
    if (badge.id === 'streak_5') return { current: badgeStats.streak, target: 5, label: 'streak days' }
    if (badge.id === 'streak_10') return { current: badgeStats.streak, target: 10, label: 'streak days' }
    if (badge.id === 'streak_30') return { current: badgeStats.streak, target: 30, label: 'streak days' }
    if (badge.id === 'tasks_10') return { current: badgeStats.totalTasksCompleted, target: 10, label: 'tasks' }
    if (badge.id === 'tasks_50') return { current: badgeStats.totalTasksCompleted, target: 50, label: 'tasks' }
    if (badge.id === 'tasks_100') return { current: badgeStats.totalTasksCompleted, target: 100, label: 'tasks' }
    if (badge.id === 'level_5') return { current: badgeStats.level, target: 5, label: 'level' }
    if (badge.id === 'level_10') return { current: badgeStats.level, target: 10, label: 'level' }
    if (badge.id === 'level_20') return { current: badgeStats.level, target: 20, label: 'level' }
    if (badge.id === 'level_30') return { current: badgeStats.level, target: 30, label: 'level' }
    if (badge.id === 'xp_500') return { current: badgeStats.xp, target: 500, label: 'XP' }
    if (badge.id === 'xp_1000') return { current: badgeStats.xp, target: 1000, label: 'XP' }
    if (badge.id === 'war_1') return { current: badgeStats.warModeSessions, target: 1, label: 'war sessions' }
    if (badge.id === 'war_5') return { current: badgeStats.warModeSessions, target: 5, label: 'war sessions' }
    if (badge.id === 'war_full_5') return { current: badgeStats.fullWarSessions, target: 5, label: 'full wars' }
    if (badge.id === 'journal_7') return { current: badgeStats.journalEntries, target: 7, label: 'journal entries' }
    return null
  }

  return (
    <div className="space-y-4">
      {equippedMeta && (
        <div className="rounded-2xl border border-zinc-700 bg-zinc-950 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Currently Displaying</p>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-3xl">
              {equippedMeta.icon}
            </div>
            <div className="flex-1">
              <p className="text-base font-black text-white">{equippedMeta.title}</p>
              <p className="text-xs font-semibold text-zinc-400 mt-0.5">{equippedMeta.desc}</p>
              {equippedMeta.rare && (
                <span className="mt-1 inline-block rounded-full border border-amber-700 bg-amber-950 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-400">
                  Rare
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onToggleBadge(equippedMeta.id, true)}
              className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition"
            >
              Unequip
            </button>
          </div>
        </div>
      )}

      {earnedBadges.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
            Earned - {earnedBadges.length}/{BADGES.length}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {earnedBadges.map((badge) => {
              const isEquipped = equippedBadge === badge.id
              return (
                <button
                  key={badge.id}
                  type="button"
                  onClick={() => onToggleBadge(badge.id, true)}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition active:scale-[0.98] ${
                    isEquipped
                      ? 'border-white/20 bg-white/10'
                      : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
                  }`}
                >
                  <span className="text-xl leading-none shrink-0">{badge.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-zinc-100 truncate">{badge.title}</p>
                    <p className="text-[9px] font-semibold text-zinc-500 leading-snug mt-0.5 truncate">{badge.desc}</p>
                    {badge.rare && (
                      <span className="text-[8px] font-black uppercase tracking-wider text-amber-500">Rare</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {lockedBadges.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">Locked</p>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {lockedBadges.map((badge) => {
              const prog = getProgress(badge)
              const pct = prog ? Math.min(100, Math.round((Math.min(prog.current, prog.target) / prog.target) * 100)) : 0
              return (
                <div key={badge.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 opacity-60">
                  <span className="text-lg leading-none grayscale shrink-0">{badge.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-zinc-400">{badge.title}</p>
                      {prog && (
                        <span className="text-[9px] font-bold text-zinc-600">
                          {Math.min(prog.current, prog.target)}/{prog.target}
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] font-semibold text-zinc-600 mt-0.5">{badge.desc}</p>
                    {prog && pct > 0 && (
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                        <div className="h-full rounded-full bg-zinc-600 transition-all"
                          style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfilePage({
  user,
  userName,
  userEmail,
  level,
  xp,
  streakDays,
  streakShields,
  equippedBadge,
  onToggleBadge,
  onBack,
  onLogout,
  onEditName,
  isEditingName,
  nameInput,
  setNameInput,
  onSaveName,
  nameUpdating,
  onForgotPassword,
  authedFetch,
  focusCategory,
  onVaultVisibilityChange,
}) {
  const [calendarDates, setCalendarDates] = useState([])
  const [focusStats, setFocusStats] = useState([])
  const [profileLoading, setProfileLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [weeklyReport, setWeeklyReport] = useState(null)
  const authedFetchRef = useRef(authedFetch)
  const profileOwnerId = user?.id || null

  useEffect(() => {
    authedFetchRef.current = authedFetch
  }, [authedFetch])

  useEffect(() => {
    onVaultVisibilityChange?.(activeTab === 'vault')

    return () => {
      onVaultVisibilityChange?.(false)
    }
  }, [activeTab, onVaultVisibilityChange])

  useEffect(() => {
    if (!profileOwnerId || !authedFetchRef.current) return

    let isCancelled = false

    async function load() {
      setProfileLoading(true)
      try {
        const fetcher = authedFetchRef.current
        const [calData, focData, weekData] = await Promise.allSettled([
          fetcher('/api/profile/calendar/'),
          fetcher('/api/profile/focus-stats/'),
          fetcher('/api/weekly-report/'),
        ])
        if (isCancelled) return
        if (calData.status === 'fulfilled') setCalendarDates(calData.value.active_dates || [])
        if (focData.status === 'fulfilled') setFocusStats(focData.value.stats || [])
        if (weekData.status === 'fulfilled') setWeeklyReport(weekData.value)
      } catch {
        // Keep profile usable even if secondary analytics fail.
      } finally {
        if (!isCancelled) {
          setProfileLoading(false)
        }
      }
    }

    void load()

    return () => {
      isCancelled = true
    }
  }, [profileOwnerId])

  const badgeStats = {
    level,
    xp,
    streak: streakDays,
    streak_shields: streakShields,
    totalTasksCompleted: user?.total_tasks_completed || 0,
    warModeSessions: user?.war_mode_sessions || 0,
    fullWarSessions: user?.full_war_sessions || 0,
    journalEntries: user?.journal_entries || 0,
  }

  const earnedBadges = BADGES.filter((b) => b.check(badgeStats))
  const lockedBadges = BADGES.filter((b) => !b.check(badgeStats))

  const rankTitle = getLevelTitle(level)
  const isMaxRank = level >= 30
  const focusMeta = FOCUS_OPTIONS.find((f) => f.key === focusCategory)
  const displayName = userName || user?.name || 'Warrior'
  const initials = displayName.charAt(0).toUpperCase()

  if (activeTab === 'vault') {
    return (
      <LegacyArtifactVault
        authedFetch={authedFetch}
        onBack={() => setActiveTab('profile')}
        user={user}
        level={level}
        xp={xp}
      />
    )
  }

  return (
    <section className="space-y-5">
      <div className="relative flex items-center justify-center pt-1">
        <h2 className="text-xl font-black tracking-tight text-zinc-900">Profile</h2>
      </div>

      <div className="rounded-3xl border border-zinc-900 bg-zinc-950 overflow-hidden">
        {focusMeta && (
          <div className="h-1 w-full" style={{ background: focusMeta.color }} />
        )}
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-2xl font-black text-white">
                {initials}
              </div>
              {equippedBadge && (
                <div className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-950 bg-zinc-800 text-sm">
                  {getBadgeIcon(equippedBadge)}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {!isEditingName ? (
                <>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-black text-white leading-tight truncate">{displayName}</p>
                    <button type="button" onClick={onEditName}
                      className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition shrink-0">
                      Edit
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={onSaveName} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    maxLength={30}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm font-bold text-white outline-none focus:border-zinc-500"
                    autoFocus
                  />
                  <button type="submit" disabled={nameUpdating}
                    className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-black text-zinc-950 disabled:opacity-60">
                    {nameUpdating ? '...' : 'Save'}
                  </button>
                  <button type="button" onClick={() => onEditName(false)}
                    className="text-[10px] font-bold text-zinc-600 hover:text-zinc-400">
                    Cancel
                  </button>
                </form>
              )}

              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  isMaxRank
                    ? 'border-amber-700 bg-amber-950 text-amber-400'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                }`}>
                  Lv.{level} {rankTitle}
                </span>
                {focusMeta && (
                  <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                    {focusMeta.icon} {focusMeta.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <LevelBar xp={xp} level={level} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'Streak', value: `${streakDays}d`, icon: '🔥' },
              { label: 'Total XP', value: xp, icon: '⚡' },
              { label: 'Tasks', value: user?.total_tasks_completed || 0, icon: '✅' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 px-2 py-2.5 text-center">
                <p className="text-base leading-none">{icon}</p>
                <p className="mt-1.5 text-base font-black text-white tabular-nums leading-none">{value}</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Streak Shields</p>
            <ShieldRow count={streakShields} />
          </div>

          <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
            Warrior since {user?.created_at
              ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : '-'}
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/3 via-zinc-950 to-zinc-950 p-5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-zinc-950/70 via-zinc-950/30 to-transparent" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">Legacy System</p>
            <h3 className="mt-1 text-2xl font-black text-white">Enter the Vault</h3>
            <p className="mt-1 text-sm font-semibold text-amber-100/70">
              Unlock permanent artifacts, equip your legacy, and track your prestige path.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('vault')}
            className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-sm font-black uppercase tracking-wider text-zinc-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-orange-400"
          >
            Open Vault
          </button>
        </div>
      </div>

      {weeklyReport && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">This Week</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 lg:gap-3">
            {[
              { label: 'Weekly XP', value: `+${weeklyReport.total_xp_earned}` },
              { label: 'Weekly Rank', value: weeklyReport.current_rank ? `#${weeklyReport.current_rank}` : '-' },
              { label: 'Tasks Done', value: weeklyReport.tasks_completed },
              { label: 'Games', value: weeklyReport.games_played },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
                <p className="mt-1 text-lg font-black text-white tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Grade</p>
              <p className={`mt-0.5 text-2xl font-black ${
                weeklyReport.grade === 'S' ? 'text-amber-400' :
                weeklyReport.grade === 'A' ? 'text-emerald-400' :
                weeklyReport.grade === 'B' ? 'text-blue-400' :
                weeklyReport.grade === 'C' ? 'text-amber-500' : 'text-red-400'
              }`}>{weeklyReport.grade}</p>
            </div>
            <div className="flex-1 ml-3">
              <p className="text-xs font-semibold text-zinc-400 leading-relaxed italic">"{weeklyReport.verdict}"</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Lifetime Stats</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: 'Tasks Completed', value: user?.total_tasks_completed || 0, icon: '📋' },
            { label: 'Journal Entries', value: user?.journal_entries || 0, icon: '📖' },
            { label: 'War Mode Sessions', value: user?.war_mode_sessions || 0, icon: '⚔️' },
            { label: 'Full Wars', value: user?.full_war_sessions || 0, icon: '💣' },
            { label: 'Best Streak', value: `${streakDays}d`, icon: '🔥' },
            { label: 'Total XP', value: xp, icon: '⚡' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5">
              <span className="text-lg leading-none shrink-0">{icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-black text-white tabular-nums truncate">{value}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {profileLoading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-zinc-900" />
      ) : (
        <StreakCalendar activeDates={calendarDates} />
      )}

      {profileLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-zinc-900" />
      ) : (
        <FocusStats focusStats={focusStats} currentFocus={focusCategory} />
      )}

      <BadgeShowcase
        earnedBadges={earnedBadges}
        lockedBadges={lockedBadges}
        equippedBadge={equippedBadge}
        onToggleBadge={onToggleBadge}
        badgeStats={badgeStats}
      />

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Account</p>

        <div className="flex items-center justify-between py-1 border-b border-zinc-100">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Email</p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-700 truncate">{userEmail}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onForgotPassword}
          className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 text-left"
        >
          Change Password -&gt;
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
        >
          Sign Out
        </button>
      </div>
    </section>
  )
}
