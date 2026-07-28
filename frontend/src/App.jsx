import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import JoinCoachPage from './components/pages/JoinCoachPage'
import CoachShell from './components/layout/CoachShell'
import CoachRosterPage from './components/pages/CoachRosterPage'
import CoachClientDetailPage from './components/pages/CoachClientDetailPage'
import CoachExerciseLibraryPage from './components/pages/coach/CoachExerciseLibraryPage'
import CoachProgramsPage from './components/pages/coach/CoachProgramsPage'
import CoachProgramBuilderPage from './components/pages/coach/CoachProgramBuilderPage'
import confetti from 'canvas-confetti'
import ConfirmationModal from './components/ConfirmationModal'
import AddTaskModal from './components/AddTaskModal'
import ColorCountFocusGame from './components/ColorCountFocusGame'
import DisciplineBeast from './components/DisciplineBeast'
import FocusTapGame from './components/FocusTapGame'
import LogicGridGame from './components/LogicGridGame'
import Navbar from './components/Navbar'
import ClientShell from './components/layout/ClientShell'
import NumberRecallGame from './components/NumberRecallGame'
import NumberStackGame from './components/NumberStackGame'
import PatternSequenceGame from './components/PatternSequenceGame'
import ReactionTapGame from './components/ReactionTapGame'
import ReverseOrderGame from './components/ReverseOrderGame'
import SpeedPatternGame from './components/SpeedPatternGame'
import WeeklyWarReport from './components/WeeklyWarReport'
import { ChallengeCreateButton, ChallengeLandingPage, MyChallengeDashboard } from './components/ChallengeFlow'
import AuthPage from './components/pages/AuthPage'
import GuestQuickMath from './components/pages/GuestQuickMath'
import GameHubPage from './components/pages/GameHubPage'
import JournalPage from './components/pages/JournalPage'
import LandingPage from './components/pages/LandingPage'
import WorkoutPage from './components/pages/WorkoutPage'
import ProfilePage from './components/pages/ProfilePage'
import TasksPage from './components/pages/TasksPage'
import useAuth from './hooks/useAuth'
import useGameSession from './hooks/useGameSession'
import useTasks from './hooks/useTasks'
import branding, { interpolate, getLevelTitle } from './config/branding'

const ACCESS_TOKEN_KEY = 'zynexon_access_token'
const REFRESH_TOKEN_KEY = 'zynexon_refresh_token'
const BEST_GAME_SCORE_KEY = 'zynexon_best_quick_math_score'
const LAST_TRAINING_RESULT_KEY = 'zynexon_last_training_result'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const GAME_DAILY_MAX_XP = 50
const DAILY_WISDOM = branding.copyPack.dailyWisdomLines
const DAILY_TRAINING_GAMES = [
  'Quick Math',
  'Focus Tap',
  'Reaction Tap',
  'Number Recall',
  'Color Count Focus',
  'Speed Pattern',
  'Reverse Order',
  'Number Stack',
  'Pattern Sequence',
  'Logic Grid',
]
const FOCUS_OPTIONS = [
  { key: 'study', icon: '📚', label: 'Study / Learning', desc: 'Deep work, reading, skill building' },
  { key: 'fitness', icon: '💪', label: 'Fitness', desc: 'Training, nutrition, recovery' },
  { key: 'discipline', icon: '🧠', label: 'Discipline / Focus', desc: 'Habits, mindset, consistency' },
  { key: 'work', icon: '💼', label: 'Work / Productivity', desc: 'Output, goals, execution' },
  { key: 'logic', icon: '⚡', label: 'Logic', desc: 'Problem solving, strategy, reasoning' },
]
const LEVEL_TITLES = branding.copyPack.levelTitles
const LEADERBOARD_CHASE_WARNING_XP = 100
// Keep this in sync with backend/api/services.py MAX_STREAK_SHIELDS.
const MAX_STREAK_SHIELDS = 3
const WAR_MODE_OPTIONS = {
  skirmish: {
    title: branding.copyPack.sessionModeLabels.skirmish.title,
    label: branding.copyPack.sessionModeLabels.skirmish.label,
    minutes: 25,
    gameType: 'war_mode_skirmish',
    uiXp: 30,
  },
  battle: {
    title: branding.copyPack.sessionModeLabels.battle.title,
    label: branding.copyPack.sessionModeLabels.battle.label,
    minutes: 45,
    gameType: 'war_mode_battle',
    uiXp: 60,
  },
  full_war: {
    title: branding.copyPack.sessionModeLabels.full_war.title,
    label: branding.copyPack.sessionModeLabels.full_war.label,
    minutes: 60,
    gameType: 'war_mode_full_war',
    uiXp: 100,
  },
}

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function getInstallContext() {
  const ua = navigator.userAgent || ''
  const isInstagram = ua.includes('Instagram')
  const isFacebook = ua.includes('FBAN') || ua.includes('FBAV')
  const isInAppBrowser = isInstagram || isFacebook || ua.includes('Twitter') || ua.includes('Line/') || ua.includes('TikTok')
  const isAndroid = ua.includes('Android')
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
  const isStandalone = isStandaloneMode()

  return { isInstagram, isInAppBrowser, isAndroid, isIOS, isStandalone }
}

function apiUrl(path) {
  if (!API_BASE_URL) {
    return path
  }
  return `${API_BASE_URL}${path}`
}

function getAvatarColor(name) {
  return 'bg-zinc-900'
}

// getLevelTitle is now imported from './config/branding'

const BADGES = [
  { id: 'streak_5', icon: '🔥', title: branding.copyPack.badgeDefinitions.streak_5.title, desc: branding.copyPack.badgeDefinitions.streak_5.desc, check: (s) => s.streak >= 5 },
  { id: 'streak_10', icon: '⚡', title: branding.copyPack.badgeDefinitions.streak_10.title, desc: branding.copyPack.badgeDefinitions.streak_10.desc, check: (s) => s.streak >= 10 },
  { id: 'streak_30', icon: '💀', title: branding.copyPack.badgeDefinitions.streak_30.title, desc: branding.copyPack.badgeDefinitions.streak_30.desc, check: (s) => s.streak >= 30 },
  { id: 'tasks_10', icon: '✅', title: branding.copyPack.badgeDefinitions.tasks_10.title, desc: branding.copyPack.badgeDefinitions.tasks_10.desc, check: (s) => s.totalTasksCompleted >= 10 },
  { id: 'tasks_50', icon: '⚔️', title: branding.copyPack.badgeDefinitions.tasks_50.title, desc: branding.copyPack.badgeDefinitions.tasks_50.desc, check: (s) => s.totalTasksCompleted >= 50 },
  { id: 'tasks_100', icon: '🛡️', title: branding.copyPack.badgeDefinitions.tasks_100.title, desc: branding.copyPack.badgeDefinitions.tasks_100.desc, check: (s) => s.totalTasksCompleted >= 100 },
  { id: 'level_5', icon: '🎖️', title: branding.copyPack.badgeDefinitions.level_5.title, desc: branding.copyPack.badgeDefinitions.level_5.desc, check: (s) => s.level >= 5 },
  { id: 'level_10', icon: '⭐', title: branding.copyPack.badgeDefinitions.level_10.title, desc: branding.copyPack.badgeDefinitions.level_10.desc, check: (s) => s.level >= 10 },
  { id: 'level_20', icon: '👑', title: branding.copyPack.badgeDefinitions.level_20.title, desc: branding.copyPack.badgeDefinitions.level_20.desc, check: (s) => s.level >= 20 },
  { id: 'level_30', icon: '🏴', title: branding.copyPack.badgeDefinitions.level_30.title, desc: branding.copyPack.badgeDefinitions.level_30.desc, check: (s) => s.level >= 30 },
  { id: 'war_1', icon: '🪖', title: branding.copyPack.badgeDefinitions.war_1.title, desc: branding.copyPack.badgeDefinitions.war_1.desc, check: (s) => s.warModeSessions >= 1 },
  { id: 'war_5', icon: '🔫', title: branding.copyPack.badgeDefinitions.war_5.title, desc: branding.copyPack.badgeDefinitions.war_5.desc, check: (s) => s.warModeSessions >= 5 },
  { id: 'war_full_5', icon: '💣', title: branding.copyPack.badgeDefinitions.war_full_5.title, desc: branding.copyPack.badgeDefinitions.war_full_5.desc, check: (s) => s.fullWarSessions >= 5 },
  { id: 'xp_500', icon: '💰', title: branding.copyPack.badgeDefinitions.xp_500.title, desc: branding.copyPack.badgeDefinitions.xp_500.desc, check: (s) => s.xp >= 500 },
  { id: 'xp_1000', icon: '💎', title: branding.copyPack.badgeDefinitions.xp_1000.title, desc: branding.copyPack.badgeDefinitions.xp_1000.desc, check: (s) => s.xp >= 1000 },
  { id: 'shield_max', icon: '🛡️', title: branding.copyPack.badgeDefinitions.shield_max.title, desc: branding.copyPack.badgeDefinitions.shield_max.desc, check: (s) => s.streak_shields >= 3 },
  { id: 'journal_7', icon: '📖', title: branding.copyPack.badgeDefinitions.journal_7.title, desc: branding.copyPack.badgeDefinitions.journal_7.desc, check: (s) => s.journalStreak >= 7 },
]

function getBadges(stats) {
  return BADGES.filter((badge) => badge.check(stats))
}

function getBadgeIcon(badgeId) {
  return BADGES.find((badge) => badge.id === badgeId)?.icon || null
}

function ArtifactIcon({ iconKey, size = 16, color = '#a78bfa' }) {
  const s = size
  const c = color

  const icons = {
    flame: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <path d="M24 4C24 4 32 14 32 22C32 27.5 28.5 32 24 34C22 30 20 26 21 21C21 21 16 26 16 32C16 38.6 19.6 43 24 44C30.6 44 36 38.6 36 32C36 24 29 14 24 4Z" fill={c} opacity="0.9"/>
        <path d="M24 28C24 28 27 31 27 34C27 36.8 25.7 38 24 38C22.3 38 21 36.8 21 34C21 31 24 28 24 28Z" fill="#fbbf24" opacity="0.8"/>
      </svg>
    ),
    phoenix: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <path d="M24 8L28 18L38 14L30 22L38 26L28 26L32 36L24 30L16 36L20 26L10 26L18 22L10 14L20 18L24 8Z" fill={c} opacity="0.9"/>
        <circle cx="24" cy="24" r="5" fill="#ef4444" opacity="0.7"/>
        <path d="M24 4L26 10L24 8L22 10L24 4Z" fill={c}/>
      </svg>
    ),
    crown: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <path d="M8 36L8 28L14 16L24 26L34 16L40 28L40 36Z" fill={c} opacity="0.85"/>
        <rect x="6" y="34" width="36" height="6" rx="3" fill={c}/>
        <circle cx="8" cy="28" r="3" fill="#e879f9" opacity="0.9"/>
        <circle cx="24" cy="22" r="3.5" fill="#e879f9" opacity="0.9"/>
        <circle cx="40" cy="28" r="3" fill="#e879f9" opacity="0.9"/>
      </svg>
    ),
    matrix: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        {[0, 1, 2, 3].map((row) => [0, 1, 2, 3].map((col) => (
          <rect key={`${row}-${col}`}
            x={8 + col * 9} y={8 + row * 9}
            width="7" height="7" rx="1"
            fill={c}
            opacity={(row + col) % 3 === 0 ? 0.9 : (row + col) % 3 === 1 ? 0.5 : 0.2}
          />
        )))}
        <rect x="14" y="14" width="20" height="20" rx="2" fill="none" stroke={c} strokeWidth="1.5" opacity="0.6"/>
      </svg>
    ),
    diamond: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <polygon points="24,4 40,20 24,44 8,20" fill={c} opacity="0.85"/>
        <polygon points="24,4 40,20 24,20" fill="#e0f2fe" opacity="0.4"/>
        <polygon points="8,20 24,20 24,44" fill={c} opacity="0.5"/>
        <line x1="24" y1="4" x2="24" y2="44" stroke="#fff" strokeWidth="0.5" opacity="0.3"/>
        <line x1="8" y1="20" x2="40" y2="20" stroke="#fff" strokeWidth="0.5" opacity="0.3"/>
      </svg>
    ),
    spine: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <rect x="20" y="4" width="8" height="8" rx="2" fill={c}/>
        {[14, 22, 30].map((y) => (
          <g key={y}>
            <rect x="18" y={y} width="12" height="7" rx="2" fill={c} opacity="0.9"/>
            <line x1="10" y1={y + 3.5} x2="18" y2={y + 3.5} stroke={c} strokeWidth="2" opacity="0.6"/>
            <line x1="30" y1={y + 3.5} x2="38" y2={y + 3.5} stroke={c} strokeWidth="2" opacity="0.6"/>
          </g>
        ))}
        <rect x="20" y="36" width="8" height="8" rx="2" fill={c}/>
      </svg>
    ),
    chain: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        {[0, 1, 2, 3].map((i) => (
          <g key={i} transform={`translate(0, ${i * 10})`}>
            <ellipse cx="24" cy="7" rx="9" ry="5" fill="none" stroke={c} strokeWidth="3" opacity="0.9"/>
          </g>
        ))}
        <ellipse cx="24" cy="7" rx="9" ry="5" fill="none" stroke={c} strokeWidth="3"/>
      </svg>
    ),
    eternal_flame: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <path d="M24 6C20 14 14 18 14 26C14 33.7 18.5 40 24 40C29.5 40 34 33.7 34 26C34 18 28 14 24 6Z" fill={c} opacity="0.9"/>
        <path d="M24 22C22 26 20 30 22 34C22.7 35.7 23.3 37 24 37C24.7 37 25.3 35.7 26 34C28 30 26 26 24 22Z" fill="#fbbf24" opacity="0.9"/>
        <circle cx="24" cy="8" r="4" fill="#fde68a" opacity="0.7"/>
        <path d="M18 8C18 8 12 4 10 8" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        <path d="M30 8C30 8 36 4 38 8" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      </svg>
    ),
    seal: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <polygon points="24,4 29,16 42,16 32,24 36,37 24,30 12,37 16,24 6,16 19,16" fill={c} opacity="0.9"/>
        <polygon points="24,12 27,20 36,20 29,25 32,33 24,28 16,33 19,25 12,20 21,20" fill="#09090b" opacity="0.3"/>
      </svg>
    ),
    relic: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <rect x="10" y="18" width="28" height="20" rx="4" fill={c} opacity="0.85"/>
        <rect x="16" y="10" width="16" height="10" rx="3" fill={c} opacity="0.7"/>
        <rect x="20" y="6" width="8" height="6" rx="2" fill={c} opacity="0.5"/>
        <line x1="10" y1="26" x2="38" y2="26" stroke="#fff" strokeWidth="1" opacity="0.3"/>
        <circle cx="24" cy="30" r="4" fill="#fbbf24" opacity="0.9"/>
      </svg>
    ),
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {icons[iconKey] || null}
    </span>
  )
}

const PRESTIGE_ARTIFACT_NAMES = branding.copyPack.prestigeArtifactNames
const PRESTIGE_COLORS = {
  1: { from: '#f97316', to: '#7c2d12', glow: '#f9731666', ring: '#f97316', label: branding.copyPack.prestigeColorLabels['1'] },
  2: { from: '#ef4444', to: '#450a0a', glow: '#ef444455', ring: '#ef4444', label: branding.copyPack.prestigeColorLabels['2'] },
  3: { from: '#a855f7', to: '#3b0764', glow: '#a855f766', ring: '#a855f7', label: branding.copyPack.prestigeColorLabels['3'] },
  4: { from: '#06b6d4', to: '#083344', glow: '#06b6d455', ring: '#06b6d4', label: branding.copyPack.prestigeColorLabels['4'] },
  5: { from: '#e879f9', to: '#4a044e', glow: '#e879f977', ring: '#e879f9', label: branding.copyPack.prestigeColorLabels['5'] },
}

function PrestigeIcon({ level, size = 32 }) {
  const c = PRESTIGE_COLORS[level] || PRESTIGE_COLORS[1]
  const s = size
  if (level === 1) return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <path d="M16 3C13 9 9 13 9 19C9 23.4 12.1 27 16 27C19.9 27 23 23.4 23 19C23 13 19 9 16 3Z" fill={c.from} opacity=".9"/>
      <ellipse cx="16" cy="21" rx="4" ry="3" fill={c.to} opacity=".7"/>
    </svg>
  )
  if (level === 2) return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <path d="M16 5L18 12L25 9L20 15L26 18L19 18L22 25L16 21L10 25L13 18L6 18L12 15L7 9L14 12L16 5Z" fill={c.from} opacity=".9"/>
      <circle cx="16" cy="16" r="3.5" fill={c.to} opacity=".6"/>
    </svg>
  )
  if (level === 3) return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <path d="M6 23L6 17L10 9L16 17L22 9L26 17L26 23Z" fill={c.from} opacity=".85"/>
      <rect x="4" y="22" width="24" height="5" rx="2.5" fill={c.from}/>
      <circle cx="6" cy="17" r="2.5" fill={c.to}/>
      <circle cx="16" cy="13" r="3" fill={c.to}/>
      <circle cx="26" cy="17" r="2.5" fill={c.to}/>
    </svg>
  )
  if (level === 4) return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      {[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c2) => (
        <rect key={`${r}-${c2}`} x={5 + c2 * 6} y={5 + r * 6} width="5" height="5" rx="1"
          fill={c.from} opacity={(r + c2) % 3 === 0 ? 0.9 : (r + c2) % 3 === 1 ? 0.45 : 0.15}/>
      )))}
      <rect x="10" y="10" width="12" height="12" rx="2" fill="none" stroke={c.from} strokeWidth="1.2" opacity=".6"/>
    </svg>
  )
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
      <polygon points="16,2 26,12 16,30 6,12" fill={c.from} opacity=".85"/>
      <polygon points="16,2 26,12 16,14" fill="#e0f2fe" opacity=".35"/>
      <polygon points="6,12 16,14 16,30" fill={c.from} opacity=".45"/>
      <line x1="16" y1="2" x2="16" y2="30" stroke="#fff" strokeWidth=".4" opacity=".25"/>
      <line x1="6" y1="12" x2="26" y2="12" stroke="#fff" strokeWidth=".4" opacity=".25"/>
    </svg>
  )
}

function PrestigeParticles() {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const particlesRef = useRef([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.offsetWidth || 400
    const H = canvas.offsetHeight || 800
    canvas.width = W
    canvas.height = H

    const COLORS = ['#f97316', '#ef4444', '#a855f7', '#06b6d4', '#e879f9', '#fbbf24']
    particlesRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(Math.random() * 0.5 + 0.1),
      alpha: Math.random() * 0.5 + 0.1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      pulse: Math.random() * Math.PI * 2,
    }))

    function draw() {
      ctx.clearRect(0, 0, W, H)
      particlesRef.current.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.pulse += 0.02
        if (p.y < -4) p.y = H + 4
        if (p.x < -4) p.x = W + 4
        if (p.x > W + 4) p.x = -4
        const a = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse))
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color + Math.round(a * 255).toString(16).padStart(2, '0')
        ctx.fill()
      })
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      opacity: 0.55,
    }} />
  )
}

function PrestigeCard({ entry, rank, isCurrentUser, onClick }) {
  const [hovered, setHovered] = useState(false)
  const pc = PRESTIGE_COLORS[entry.prestige_level] || PRESTIGE_COLORS[1]
  const isTop3 = rank <= 3

  return (
    <div
      onClick={() => onClick(entry)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        cursor: 'pointer',
        borderRadius: isTop3 ? 18 : 14,
        marginBottom: isTop3 ? 14 : 8,
        transform: hovered ? 'translateX(3px)' : 'translateX(0)',
        transition: 'transform 0.22s cubic-bezier(0.23,1,0.32,1)',
        overflow: 'hidden',
      }}
    >
      {isTop3 && (
        <div style={{
          position: 'absolute',
          inset: -2,
          borderRadius: 20,
          background: `${pc.glow}`,
          filter: 'blur(10px)',
          zIndex: 0,
          opacity: hovered ? 1 : 0.6,
          transition: 'opacity 0.3s',
        }} />
      )}

      <div style={{
        position: 'relative',
        zIndex: 1,
        background: isTop3
          ? 'linear-gradient(135deg, #0f0f10 0%, #18101a 50%, #0c0e18 100%)'
          : '#0f0f10',
        border: `1px solid ${isTop3 ? pc.ring + '55' : (isCurrentUser ? pc.ring + '44' : '#1e1e22')}`,
        borderRadius: isTop3 ? 18 : 14,
        padding: isTop3 ? '18px 18px' : '13px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        {isTop3 && (
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 18,
            background: `linear-gradient(105deg, ${pc.from}0a 0%, transparent 40%, ${pc.from}08 70%, transparent 100%)`,
            pointerEvents: 'none',
          }} />
        )}

        <div style={{
          flexShrink: 0,
          width: isTop3 ? 44 : 32,
          height: isTop3 ? 44 : 32,
          borderRadius: '50%',
          background: isTop3
            ? `linear-gradient(135deg, ${pc.from}, ${pc.to})`
            : '#1a1a1e',
          border: `1px solid ${isTop3 ? pc.ring + '88' : '#2a2a2e'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isTop3 ? `0 0 12px ${pc.glow}` : 'none',
        }}>
          {isTop3 ? (
            <span style={{
              fontSize: isTop3 ? 15 : 12,
              fontWeight: 900,
              color: '#fff',
              fontFamily: "'Georgia', serif",
              letterSpacing: '-0.02em',
            }}>
              {rank}
            </span>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#52525b' }}>{rank}</span>
          )}
        </div>

        <div style={{
          flexShrink: 0,
          width: isTop3 ? 40 : 32,
          height: isTop3 ? 40 : 32,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, ${pc.from}44, ${pc.to}cc)`,
          border: `1.5px solid ${pc.ring}66`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isTop3 ? `0 0 16px ${pc.glow}, inset 0 1px 0 ${pc.from}44` : `0 0 8px ${pc.glow}`,
        }}>
          <PrestigeIcon level={entry.prestige_level} size={isTop3 ? 22 : 18} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: isTop3 ? 16 : 14,
              fontWeight: isTop3 ? 800 : 700,
              color: isCurrentUser ? pc.from : '#f4f4f5',
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {entry.name || branding.copyPack.prestigeCopy.defaultName}
            </span>
            {isCurrentUser && (
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: pc.from,
                background: pc.from + '1a',
                border: `0.5px solid ${pc.ring}55`,
                borderRadius: 5,
                padding: '1px 6px',
                flexShrink: 0,
              }}>You</span>
            )}
            {entry.equipped_badge && getBadgeIcon(entry.equipped_badge) && (
              <span style={{ fontSize: 12, flexShrink: 0 }}>{getBadgeIcon(entry.equipped_badge)}</span>
            )}
            {entry.equipped_artifact ? (
              <span title={entry.equipped_artifact.name || 'Equipped artifact'} style={{ display: 'inline-flex' }}>
                <ArtifactIcon
                  iconKey={entry.equipped_artifact.icon_key}
                  color={entry.equipped_artifact.color_primary}
                  size={14}
                />
              </span>
            ) : null}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{
              fontSize: 11,
              color: pc.ring,
              fontWeight: 700,
              letterSpacing: '0.06em',
            }}>
              Ψ{entry.prestige_level} — {PRESTIGE_ARTIFACT_NAMES[entry.prestige_level] || branding.copyPack.prestigeCopy.defaultRankName}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: '#52525b' }}>
              Lv.{entry.level} {getLevelTitle(entry.level)}
            </span>
            <span style={{ fontSize: 10, color: '#52525b' }}>
              🔥 {entry.streak}d
            </span>
            <span style={{ fontSize: 10, color: '#52525b' }}>
              {(entry.total_xp || entry.xp || 0).toLocaleString()} XP total
            </span>
          </div>
        </div>

        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <div style={{
            fontSize: isTop3 ? 11 : 9,
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: pc.ring,
            background: `${pc.from}15`,
            border: `0.5px solid ${pc.ring}44`,
            borderRadius: 8,
            padding: isTop3 ? '4px 10px' : '3px 8px',
            whiteSpace: 'nowrap',
          }}>
            {pc.label}
          </div>
          {entry.season_label && (
            <p style={{ margin: '3px 0 0', fontSize: 9, color: '#3f3f46', textAlign: 'center' }}>
              {entry.season_label}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function PrestigeHero({ entry }) {
  const pc = PRESTIGE_COLORS[entry.prestige_level] || PRESTIGE_COLORS[1]
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 50)
    return () => clearInterval(id)
  }, [])

  const pulse = 0.5 + 0.5 * Math.sin(tick * 0.08)

  return (
    <div style={{
      position: 'relative',
      borderRadius: 24,
      overflow: 'hidden',
      marginBottom: 24,
      padding: 2,
      background: `linear-gradient(135deg, ${pc.from}, ${pc.to}, ${pc.from})`,
      boxShadow: `0 0 40px ${pc.glow}, 0 0 80px ${pc.glow}`,
    }}>
      <div style={{
        position: 'relative',
        background: 'linear-gradient(145deg, #0f0a00, #0c0010, #000c14)',
        borderRadius: 22,
        padding: '28px 20px 24px',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 300,
          height: 300,
          transform: 'translate(-50%,-50%)',
          background: `radial-gradient(circle, ${pc.from}${Math.round(pulse * 18 + 5).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 19px, ${pc.ring}0d 19px, ${pc.ring}0d 20px),
                            repeating-linear-gradient(90deg, transparent, transparent 19px, ${pc.ring}0d 19px, ${pc.ring}0d 20px)`,
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <p style={{
            margin: '0 0 16px',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: pc.ring + 'bb',
          }}>
            {branding.copyPack.prestigeCopy.hallTitle}
          </p>

          <div style={{
            width: 88,
            height: 88,
            margin: '0 auto 16px',
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, ${pc.from}66, ${pc.to})`,
            border: `2px solid ${pc.ring}88`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 32px ${pc.glow}, 0 0 60px ${pc.from}33, inset 0 1px 0 ${pc.from}55`,
          }}>
            <PrestigeIcon level={entry.prestige_level} size={48} />
          </div>

          <div style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: pc.ring,
            marginBottom: 8,
          }}>
            ✦ RANK 1 — {pc.label.toUpperCase()} ✦
          </div>

          <h2 style={{
            margin: '0 0 6px',
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: '-0.03em',
            color: '#f4f4f5',
            fontFamily: "'Georgia', serif",
          }}>
            {entry.name || branding.copyPack.prestigeCopy.defaultName}
          </h2>

          <p style={{
            margin: '0 0 14px',
            fontSize: 14,
            color: pc.ring,
            fontWeight: 700,
          }}>
            Ψ{entry.prestige_level} — {PRESTIGE_ARTIFACT_NAMES[entry.prestige_level]}
          </p>

          <div style={{
            display: 'inline-flex',
            gap: 20,
            background: 'rgba(0,0,0,0.4)',
            border: `0.5px solid ${pc.ring}33`,
            borderRadius: 12,
            padding: '10px 20px',
          }}>
            {[
              { label: 'Prestige', val: `Ψ${entry.prestige_level}` },
              { label: 'Level', val: entry.level },
              { label: 'Streak', val: `${entry.streak}d` },
              { label: 'XP', val: (entry.total_xp || entry.xp || 0).toLocaleString() },
            ].map(({ label, val }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#f4f4f5' }}>{val}</p>
                <p style={{ margin: '2px 0 0', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#52525b' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function PrestigeEmpty({ currentLevel }) {
  const needed = Math.max(0, 20 - currentLevel)
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{
        width: 80,
        height: 80,
        margin: '0 auto 20px',
        borderRadius: '50%',
        background: '#1c1917',
        border: '1px solid #27272a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path d="M18 4C14 11 9 16 9 23C9 28.5 13 33 18 33C23 33 27 28.5 27 23C27 16 22 11 18 4Z" fill="#27272a"/>
        </svg>
      </div>
      <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#3f3f46' }}>
        {branding.copyPack.prestigeCopy.emptyTitle}
      </p>
      <p style={{ margin: 0, fontSize: 13, color: '#27272a', lineHeight: 1.7 }}>
        {needed > 0
          ? interpolate(branding.copyPack.prestigeCopy.notEligibleMsg, { needed })
          : branding.copyPack.prestigeCopy.eligibleMsg}
      </p>
    </div>
  )
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

function getWeeklyResetCountdownLabel(nowMs = Date.now()) {
  const now = new Date(nowMs)
  const day = now.getDay()
  const daysUntilMonday = day === 0 ? 1 : 8 - day
  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + daysUntilMonday)
  nextMonday.setHours(0, 0, 0, 0)

  const diffMs = Math.max(0, nextMonday.getTime() - now.getTime())
  const totalHours = Math.floor(diffMs / 3600000)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  return interpolate(branding.copyPack.weeklyResetLabel, { days, hours })
}

function getTodayStorageKeyDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDailyChallengeTitle(challenge) {
  if (!challenge) {
    return 'Daily Challenge'
  }

  const parsedDate = new Date(challenge.date)
  const dayLabel = Number.isNaN(parsedDate.getTime())
    ? 'Today'
    : parsedDate.toLocaleDateString('en-US', { weekday: 'long' })
  const typePrefix = {
    complete_3_tasks: 'Lock In',
    earn_20_xp_from_games: 'Grind',
    write_journal_entry: 'Clarity',
    complete_morning_task_before_10am: 'First Strike',
  }

  return `${typePrefix[challenge.type] || 'Challenge'} ${dayLabel}`
}

async function readApiPayload(response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  try {
    const text = await response.text()
    if (!text) {
      return null
    }

    const looksLikeHtml = /<\s*!doctype\s+html|<\s*html/i.test(text)
    if (looksLikeHtml) {
      return { detail: 'Server error. Please try again.' }
    }

    return { detail: text }
  } catch {
    return null
  }
}

function mapDailyTasksToUi(dailyTasks) {
  return (dailyTasks || []).map((task) => ({
    id: task.id,
    name: task.task_title,
    xp: task.task_xp,
    completed: task.completed,
    category: task.task_category || 'general',
    is_custom: Boolean(task.is_custom),
  }))
}

function App() {
  const location = useLocation()
  const reactRouterNavigate = useNavigate()

  const {
    user,
    setUser,
    loading,
    setLoading,
    level,
    setLevel,
    xp,
    setXp,
    streakDays,
    setStreakDays,
    userEmail,
    setUserEmail,
    accessToken,
    setAccessToken,
    authMode,
    setAuthMode,
    nameInput,
    setNameInput,
    emailInput,
    setEmailInput,
    passwordInput,
    setPasswordInput,
    isLoading,
    setIsLoading,
    errorText,
    setErrorText,
    authLoading,
    setAuthLoading,
    authNotice,
    setAuthNotice,
    userName,
    setUserName,
    nameUpdating,
    setNameUpdating,
    isProfileEditingName,
    setIsProfileEditingName,
    resetPasswordToken,
    setResetPasswordToken,
    resetPasswordConfirmInput,
    setResetPasswordConfirmInput,
  } = useAuth(ACCESS_TOKEN_KEY)

  const {
    selectedTask,
    setSelectedTask,
    justCompletedId,
    setJustCompletedId,
    tasks,
    setTasks,
    completedCount,
    dailyStatusMessage,
  } = useTasks()

  const {
    activeTab,
    setActiveTab,
    gameRoute,
    setGameRoute,
    gameSessionId,
    setGameSessionId,
    gameStarted,
    setGameStarted,
    timeLeft,
    setTimeLeft,
    score,
    setScore,
    bestGameScore,
    setBestGameScore,
    lastTrainingResult,
    setLastTrainingResult,
    currentQuestion,
    setCurrentQuestion,
    userAnswer,
    setUserAnswer,
    gameSubmitting,
    setGameSubmitting,
    gameResult,
    setGameResult,
    animatedGameXp,
    setAnimatedGameXp,
    focusTapSessionId,
    setFocusTapSessionId,
    focusTapSubmitting,
    setFocusTapSubmitting,
    focusTapXpAwarded,
    setFocusTapXpAwarded,
    focusTapResult,
    setFocusTapResult,
    focusTapError,
    setFocusTapError,
    numberRecallSessionId,
    setNumberRecallSessionId,
    numberRecallSubmitting,
    setNumberRecallSubmitting,
    numberRecallXpAwarded,
    setNumberRecallXpAwarded,
    numberRecallResult,
    setNumberRecallResult,
    numberRecallError,
    setNumberRecallError,
    colorCountSessionId,
    setColorCountSessionId,
    colorCountSubmitting,
    setColorCountSubmitting,
    colorCountXpAwarded,
    setColorCountXpAwarded,
    colorCountResult,
    setColorCountResult,
    colorCountError,
    setColorCountError,
    speedPatternSessionId,
    setSpeedPatternSessionId,
    speedPatternSubmitting,
    setSpeedPatternSubmitting,
    speedPatternXpAwarded,
    setSpeedPatternXpAwarded,
    speedPatternResult,
    setSpeedPatternResult,
    speedPatternError,
    setSpeedPatternError,
    deferredPrompt,
    setDeferredPrompt,
    showInstallPopup,
    setShowInstallPopup,
    installEligible,
    setInstallEligible,
    isInstalled,
    setIsInstalled,
    prevLevel,
    setPrevLevel,
    showLevelUp,
    setShowLevelUp,
    pendingLevelUpLevel,
    setPendingLevelUpLevel,
  } = useGameSession(BEST_GAME_SCORE_KEY, LAST_TRAINING_RESULT_KEY)

  const [leaderboardEntries, setLeaderboardEntries] = useState([])
  const [prestigeEntries, setPrestigeEntries] = useState([])
  const [gameRemainingXpByType, setGameRemainingXpByType] = useState({})
  const [dailyChallenge, setDailyChallenge] = useState(null)
  const [showDailyChallenge, setShowDailyChallenge] = useState(false)
  const [guestMode, setGuestMode] = useState(false)
  const [guestScore, setGuestScore] = useState(null)
  const [showGuestSignup, setShowGuestSignup] = useState(false)
  const [guestRunId, setGuestRunId] = useState(0)
  const [activeChallengeId, setActiveChallengeId] = useState(null)
  const [challengeResultPending, setChallengeResultPending] = useState(null)
  const [guestChallengeResult, setGuestChallengeResult] = useState(null)
  const [showChallengeDashboard, setShowChallengeDashboard] = useState(false)
  const [showFocusPicker, setShowFocusPicker] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showDisciplineBeast, setShowDisciplineBeast] = useState(false)
  const [focusUpdating, setFocusUpdating] = useState(false)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [prestigeLoading, setPrestigeLoading] = useState(false)
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('weekly')
  const [leaderboardNowMs, setLeaderboardNowMs] = useState(Date.now())
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [yourRank, setYourRank] = useState(null)
  const [prestigeMeta, setPrestigeMeta] = useState({ total: 0, yourRank: null })
  const [selectedPrestigeEntry, setSelectedPrestigeEntry] = useState(null)
  const [profileVaultOpen, setProfileVaultOpen] = useState(false)
  const [warModeSelection, setWarModeSelection] = useState('')
  const [warModeSessionId, setWarModeSessionId] = useState('')
  const [warModeEndAt, setWarModeEndAt] = useState(0)
  const [warModeRemainingSeconds, setWarModeRemainingSeconds] = useState(0)
  const [warModeSubmitting, setWarModeSubmitting] = useState(false)
  const [warModeError, setWarModeError] = useState('')
  const [warModeCompletionReady, setWarModeCompletionReady] = useState(false)
  const [warModeHonestyMessage, setWarModeHonestyMessage] = useState('')
  const [warModeSurrenderConfirmOpen, setWarModeSurrenderConfirmOpen] = useState(false)
  const [warModeResult, setWarModeResult] = useState(null)
  const [reverseOrderSessionId, setReverseOrderSessionId] = useState('')
  const [reverseOrderSubmitting, setReverseOrderSubmitting] = useState(false)
  const [reverseOrderXpAwarded, setReverseOrderXpAwarded] = useState(null)
  const [reverseOrderResult, setReverseOrderResult] = useState(null)
  const [reverseOrderError, setReverseOrderError] = useState('')
  const [numberStackSessionId, setNumberStackSessionId] = useState('')
  const [numberStackSubmitting, setNumberStackSubmitting] = useState(false)
  const [numberStackXpAwarded, setNumberStackXpAwarded] = useState(null)
  const [numberStackResult, setNumberStackResult] = useState(null)
  const [numberStackError, setNumberStackError] = useState('')
  const [patternSeqSessionId, setPatternSeqSessionId] = useState('')
  const [patternSeqSubmitting, setPatternSeqSubmitting] = useState(false)
  const [patternSeqXpAwarded, setPatternSeqXpAwarded] = useState(null)
  const [patternSeqResult, setPatternSeqResult] = useState(null)
  const [patternSeqError, setPatternSeqError] = useState('')
  const [logicGridSessionId, setLogicGridSessionId] = useState('')
  const [logicGridSubmitting, setLogicGridSubmitting] = useState(false)
  const [logicGridXpAwarded, setLogicGridXpAwarded] = useState(null)
  const [logicGridResult, setLogicGridResult] = useState(null)
  const [logicGridError, setLogicGridError] = useState('')
  const [reactionTapSessionId, setReactionTapSessionId] = useState('')
  const [reactionTapSubmitting, setReactionTapSubmitting] = useState(false)
  const [reactionTapXpAwarded, setReactionTapXpAwarded] = useState(null)
  const [reactionTapResult, setReactionTapResult] = useState(null)
  const [reactionTapError, setReactionTapError] = useState('')
  const [equippedBadge, setEquippedBadge] = useState(localStorage.getItem('badge') || null)
  const [bestStreak, setBestStreak] = useState(0)
  const [showShieldUsedBanner, setShowShieldUsedBanner] = useState(false)
  const [shieldEarnedNotice, setShieldEarnedNotice] = useState('')
  const [showShieldInfo, setShowShieldInfo] = useState(false)
  const [showLevelInfo, setShowLevelInfo] = useState(false)
  const [showWarModeInfo, setShowWarModeInfo] = useState(false)
  const [showWeeklyReport, setShowWeeklyReport] = useState(false)
  const previousCompletedCountRef = useRef(null)
  const shouldFireTaskConfettiRef = useRef(false)
  const shouldFireQuickMathConfettiRef = useRef(false)
  const isInitialLoadRef = useRef(false)
  const hasLoadedRef = useRef(false)
  const speedPatternSessionIdRef = useRef('')
  const numberStackSessionIdRef = useRef('')
  const warModeCompletionGuardRef = useRef(false)
  const pendingChallengeAcceptRef = useRef(null)

  const handleChallengeInitialResultHandled = useCallback(() => {
    setChallengeResultPending(null)
  }, [])

  const requiresNameSetup = Boolean(user && !user.name)
  const profileDisplayName = userName || user?.name || 'User'
  const profileAvatarLetter = profileDisplayName.charAt(0).toUpperCase()
  const homeGreetingName = (userName || user?.name || '').trim()
  const homeGreetingFirstName = homeGreetingName ? homeGreetingName.split(/\s+/)[0] : ''
  const bestStreakStorageKey = user?.id ? `zynexon_best_streak_${user.id}` : 'zynexon_best_streak'
  // Backend level formula: level = max(1, floor(sqrt(xp / 50))).
  // Level 1 spans 0-199 XP, so its lower bound is 0 instead of 50.
  const profileCurrentLevelXp = level <= 1 ? 0 : level * level * 50
  const profileNextLevelXp = (level + 1) * (level + 1) * 50
  const profileProgressXp = Math.max(0, xp - profileCurrentLevelXp)
  const profileNeededXp = Math.max(1, profileNextLevelXp - profileCurrentLevelXp)
  const profileProgressPercent = Math.min(100, Math.max(0, (profileProgressXp / profileNeededXp) * 100))
  const streakShields = Math.max(0, Math.min(MAX_STREAK_SHIELDS, user?.streak_shields || 0))
  const totalTasksCompleted = Number.isFinite(user?.total_tasks_completed)
    ? user.total_tasks_completed
    : tasks.filter((task) => task.completed).length
  const badgeStats = {
    level,
    xp,
    streak: streakDays,
    streak_shields: streakShields,
    totalTasksCompleted: user?.total_tasks_completed || 0,
    warModeSessions: user?.war_mode_sessions || 0,
    fullWarSessions: user?.full_war_sessions || 0,
    journalStreak: user?.journal_entries || 0,
  }
  const earnedBadges = getBadges(badgeStats)
  const earnedBadgeIds = new Set(earnedBadges.map((badge) => badge.id))
  const earnedBadgeList = BADGES.filter((badge) => earnedBadgeIds.has(badge.id))
  const lockedBadgeList = BADGES.filter((badge) => !earnedBadgeIds.has(badge.id))
  const showQuickMathResult = activeTab === 'Game' && gameRoute === '/game/quick-math' && (Boolean(gameResult) || gameSubmitting)
  const showFocusTapResult = activeTab === 'Game' && gameRoute === '/game/focus-tap' && (Boolean(focusTapResult) || focusTapSubmitting)
  const showNumberRecallResult = activeTab === 'Game' && gameRoute === '/game/number-recall' && (Boolean(numberRecallResult) || numberRecallSubmitting)
  const showColorCountResult = activeTab === 'Game' && gameRoute === '/game/color-count-focus' && (Boolean(colorCountResult) || colorCountSubmitting)
  const showSpeedPatternResult = activeTab === 'Game' && gameRoute === '/game/speed-pattern' && (Boolean(speedPatternResult) || speedPatternSubmitting)
  const showLogicGridResult = activeTab === 'Game' && gameRoute === '/game/logic-grid' && (Boolean(logicGridResult) || logicGridSubmitting)
  const logicGridChallengeSeed = pendingChallengeAcceptRef.current?.gamePath === '/game/logic-grid'
    ? pendingChallengeAcceptRef.current?.seed
    : null
  const logicGridChallengePuzzleId = logicGridChallengeSeed?.puzzle_id || null
  const showGameResult = showQuickMathResult || showFocusTapResult || showNumberRecallResult || showColorCountResult || showSpeedPatternResult || showLogicGridResult
  const shouldLockBodyScroll = showLevelUp || showDailyChallenge || showWeeklyReport || (showGameResult && !showLogicGridResult)
  const taskCounterColorClass = completedCount === 0
    ? 'text-zinc-500'
    : completedCount >= 5
      ? 'text-emerald-600'
      : 'text-blue-600'
  const homeTaskTotal = tasks.length > 0 ? tasks.length : 5
  const homeTaskCompleted = Math.min(completedCount, homeTaskTotal)
  const tasksLeft = Math.max(0, 5 - completedCount)
  const homeProgressContext = !lastTrainingResult
    ? "You haven't trained yet."
    : tasksLeft > 0
      ? `${tasksLeft} task${tasksLeft === 1 ? '' : 's'} left to win today.`
      : 'All tasks cleared. Win secured for today.'
  const dailyChallengeCompleted = Boolean(dailyChallenge?.completed)
  const dailyChallengeProgressCurrent = Number(dailyChallenge?.progress?.current || 0)
  const dailyChallengeProgressTarget = Math.max(
    1,
    Number(dailyChallenge?.progress?.target || dailyChallenge?.challenge?.target_value || 1),
  )
  const dailyChallengeProgressPercent = Math.min(
    100,
    Math.max(0, (Math.min(dailyChallengeProgressCurrent, dailyChallengeProgressTarget) / dailyChallengeProgressTarget) * 100),
  )
  const activeDailyChallenge = dailyChallenge?.challenge || null
  const dailyChallengeTitle = getDailyChallengeTitle(activeDailyChallenge)
  const dailyChallengeRewardXp = Number(activeDailyChallenge?.reward_xp || 30)
  const dailyWisdom = useMemo(() => {
    const dayNumber = Math.floor(Date.now() / 86400000)
    return DAILY_WISDOM[dayNumber % DAILY_WISDOM.length]
  }, [])
  const dailyTrainingGameLabel = useMemo(() => {
    const dayNumber = Math.floor(Date.now() / 86400000)
    return DAILY_TRAINING_GAMES[dayNumber % DAILY_TRAINING_GAMES.length]
  }, [])
  const leaderboardXpForPeriod = (entry) => (leaderboardPeriod === 'weekly' ? (entry?.weekly_xp || 0) : (entry?.xp || 0))
  const currentUserLeaderboardEntry = leaderboardEntries.find((entry) => entry.is_current_user)
  const secondPlaceEntry = leaderboardEntries.find((entry) => entry.rank === 2)
  const leaderboardChaseGap = (currentUserLeaderboardEntry && secondPlaceEntry)
    ? Math.max(0, leaderboardXpForPeriod(currentUserLeaderboardEntry) - leaderboardXpForPeriod(secondPlaceEntry))
    : 0
  const showLeaderboardChaseWarning = Boolean(
    currentUserLeaderboardEntry
    && currentUserLeaderboardEntry.rank === 1
    && secondPlaceEntry
    && leaderboardChaseGap <= LEADERBOARD_CHASE_WARNING_XP,
  )
  const shieldUsedToday = Boolean(user?.shield_used_today)
  const streakCompletedToday = Boolean(user?.last_active_date) && user.last_active_date === getTodayStorageKeyDate()
  const shieldBannerStorageKey = user?.id
    ? `zynexon_shield_banner_seen_${user.id}_${getTodayStorageKeyDate()}`
    : ''

  const handleDismissShieldBanner = () => {
    if (shieldBannerStorageKey) {
      localStorage.setItem(shieldBannerStorageKey, '1')
    }
    setShowShieldUsedBanner(false)
  }

  useEffect(() => {
    const parsedStoredBest = Number(localStorage.getItem(bestStreakStorageKey) || '0')
    const storedBest = Number.isFinite(parsedStoredBest) && parsedStoredBest > 0 ? parsedStoredBest : 0
    const nextBest = Math.max(storedBest, streakDays)

    setBestStreak((prev) => (prev === nextBest ? prev : nextBest))

    if (nextBest !== storedBest) {
      localStorage.setItem(bestStreakStorageKey, String(nextBest))
    }
  }, [bestStreakStorageKey, streakDays])

  useEffect(() => {
    if (!user?.id || !shieldUsedToday) {
      setShowShieldUsedBanner(false)
      return
    }

    const hasSeenBanner = shieldBannerStorageKey
      ? localStorage.getItem(shieldBannerStorageKey) === '1'
      : false
    if (!hasSeenBanner && shieldBannerStorageKey) {
      localStorage.setItem(shieldBannerStorageKey, '1')
    }
    setShowShieldUsedBanner(!hasSeenBanner)
  }, [user?.id, shieldUsedToday, shieldBannerStorageKey])

  useEffect(() => {
    if (!shieldEarnedNotice) {
      return
    }

    const timerId = window.setTimeout(() => setShieldEarnedNotice(''), 4000)
    return () => window.clearTimeout(timerId)
  }, [shieldEarnedNotice])

  function recordLastTrainingResult(label, scoreValue, remainingTodayValue, dailyCapValue, gameTypeValue) {
    const parsedScore = Number(scoreValue)
    if (!label || Number.isNaN(parsedScore)) {
      return
    }

    const parsedRemainingToday = Number(remainingTodayValue)
    const parsedDailyCap = Number(dailyCapValue)

    const payload = {
      label,
      score: parsedScore,
      remainingToday: Number.isFinite(parsedRemainingToday) ? parsedRemainingToday : null,
      dailyCap: Number.isFinite(parsedDailyCap) ? parsedDailyCap : null,
    }

    if (gameTypeValue && Number.isFinite(parsedRemainingToday) && Number.isFinite(parsedDailyCap)) {
      setGameRemainingXpByType((current) => ({
        ...current,
        [gameTypeValue]: {
          daily_cap: parsedDailyCap,
          remaining_today: Math.max(0, parsedRemainingToday),
        },
      }))
    }

    setLastTrainingResult(payload)
    localStorage.setItem(LAST_TRAINING_RESULT_KEY, JSON.stringify(payload))
  }

  function formatWarModeTimer(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  function resetWarModeState() {
    setWarModeSelection('')
    setWarModeSessionId('')
    setWarModeEndAt(0)
    setWarModeRemainingSeconds(0)
    setWarModeSubmitting(false)
    setWarModeError('')
    setWarModeCompletionReady(false)
    setWarModeHonestyMessage('')
    setWarModeSurrenderConfirmOpen(false)
    setWarModeResult(null)
    warModeCompletionGuardRef.current = false
  }

  function navigate(path) {
    const normalizedPath = (path || '').toLowerCase()

    window.history.pushState({}, '', path)
    const isWeeklyReportPath = normalizedPath === '/weekly-report' || normalizedPath === '/weekly-report/'
    setShowWeeklyReport(isWeeklyReportPath)

    if (isWeeklyReportPath) {
      setActiveTab('Home')
      return
    }

    if (normalizedPath === '/' || normalizedPath === '') {
      setActiveTab('Home')
      return
    }

    if (normalizedPath === '/journal') {
      setActiveTab('Journal')
      return
    }

    if (normalizedPath === '/leaderboard') {
      setActiveTab('Leaderboard')
      return
    }

    if (normalizedPath === '/profile') {
      setActiveTab('Profile')
      return
    }

    if (normalizedPath === '/tasks') {
      setActiveTab('Tasks')
      return
    }

    if (normalizedPath === '/workout') {
      setActiveTab('Workout')
      return
    }

    if (normalizedPath === '/game/pattern-sequence') {
      setGameRoute('/game/pattern-sequence')
      setActiveTab('Game')
      return
    }

    if (normalizedPath.startsWith('/game')) {
      setGameRoute(normalizedPath)
      setActiveTab('Game')
      return
    }

    setActiveTab('Home')
  }

  function closeWeeklyReport() {
    setShowWeeklyReport(false)

    const currentPath = window.location.pathname.toLowerCase()
    if (currentPath === '/weekly-report' || currentPath === '/weekly-report/') {
      window.history.replaceState({}, '', '/')
    }
  }

  function clearResetTokenParam() {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('reset_token')) {
      return
    }

    url.searchParams.delete('reset_token')
    const query = url.searchParams.toString()
    const nextPath = `${url.pathname}${query ? `?${query}` : ''}${url.hash}`
    window.history.replaceState({}, '', nextPath)
  }

  function clearChallengeParam() {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('challenge')) {
      return
    }

    url.searchParams.delete('challenge')
    const query = url.searchParams.toString()
    const nextPath = `${url.pathname}${query ? `?${query}` : ''}${url.hash}`
    window.history.replaceState({}, '', nextPath)
  }

  function clearPendingChallengeAccept(targetGamePath = null) {
    const pending = pendingChallengeAcceptRef.current
    if (!pending) {
      return
    }
    if (targetGamePath && pending.gamePath !== targetGamePath) {
      return
    }
    pendingChallengeAcceptRef.current = null
  }

  function resolvePendingChallengeAccept(gamePath, completionScore, completionMetric = null) {
    const pending = pendingChallengeAcceptRef.current
    if (!pending || pending.gamePath !== gamePath) {
      return
    }

    pendingChallengeAcceptRef.current = null
    setChallengeResultPending({
      challengeId: pending.challengeId,
      score: completionScore >= 1 ? 1 : 0,
      metric: completionMetric,
      mode: 'submit',
    })
    setActiveChallengeId(pending.challengeId)
  }

  function isGuestChallenge(gamePath) {
    return !user && pendingChallengeAcceptRef.current?.gamePath === gamePath
  }

  function isChallengeGame(gamePath) {
    return pendingChallengeAcceptRef.current?.gamePath === gamePath
  }

  function handleGameMainMenu(gamePath) {
    clearPendingChallengeAccept(gamePath)
    navigate('/game')
  }

  function rankMeta(rank) {
    if (rank === 1) {
      return {
        icon: '🥇',
        className: 'bg-amber-100 text-amber-700 ring-1 ring-amber-300 text-sm',
      }
    }
    if (rank === 2) {
      return {
        icon: '🥈',
        className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300',
      }
    }
    if (rank === 3) {
      return {
        icon: '🥉',
        className: 'bg-orange-100 text-orange-700 ring-1 ring-orange-300',
      }
    }

    if (rank >= 4 && rank <= 10) {
      return {
        icon: null,
        className: 'bg-zinc-900 text-white ring-1 ring-zinc-700',
      }
    }

    return {
      icon: null,
      className: 'bg-zinc-100 text-zinc-700',
    }
  }

  function persistTokens(access, refresh) {
    if (access) {
      localStorage.setItem(ACCESS_TOKEN_KEY, access)
      setAccessToken(access)
    }
    if (refresh) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
    }
  }

  async function refreshAccessToken() {
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refresh) {
      throw new Error('No refresh token available.')
    }

    const response = await fetch(apiUrl('/api/auth/refresh/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })

    const data = await readApiPayload(response)
    if (!response.ok || !data.access) {
      throw new Error(data?.detail || 'Session refresh failed.')
    }

    // Keep refresh silent: update storage only so gameplay state never re-renders.
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access)
    if (data.refresh) {
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh)
    }

    return data.access
  }

  async function authedFetch(path, options = {}, retryOnAuth = true) {
    const execute = async (token) => {
      return fetch(apiUrl(path), {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      })
    }

    const currentToken = localStorage.getItem(ACCESS_TOKEN_KEY) || ''
    let response = await execute(currentToken)

    if (response.status === 401 && retryOnAuth) {
      try {
        const newAccess = await refreshAccessToken()
        response = await execute(newAccess)
      } catch {
        handleLogout()
        throw new Error('Session expired. Please sign in again.')
      }
    }

    const data = await readApiPayload(response)

    if (!response.ok) {
      throw new Error(data?.detail || data?.error || 'Request failed.')
    }

    return data
  }

  async function silentRefreshUser() {
    try {
      const userData = await authedFetch('/api/auth/me/')
      setUser(userData)
      setStreakDays(userData.streak)
      setXp(userData.xp)
      setLevel(userData.level)
      setUserName(userData.name || '')
      const persistedBadge = userData.equipped_badge || null
      setEquippedBadge(persistedBadge)
      if (persistedBadge) {
        localStorage.setItem('badge', persistedBadge)
      } else {
        localStorage.removeItem('badge')
      }
    } catch {
      // Keep the active game/result UI stable even if profile refresh fails.
    }
  }

  async function refreshDailyChallengeStatus() {
    if (!accessToken) {
      return
    }

    try {
      const data = await authedFetch('/api/daily-challenge/')
      setDailyChallenge(data)

      if (typeof data.total_xp === 'number') {
        setXp(data.total_xp)
      }
      if (typeof data.level === 'number') {
        setLevel(data.level)
      }
      if (typeof data.total_xp === 'number' || typeof data.level === 'number' || typeof data.streak_shields === 'number') {
        setUser((currentUser) => (
          currentUser
            ? {
              ...currentUser,
              xp: typeof data.total_xp === 'number' ? data.total_xp : currentUser.xp,
              level: typeof data.level === 'number' ? data.level : currentUser.level,
              streak_shields: typeof data.streak_shields === 'number' ? data.streak_shields : currentUser.streak_shields,
            }
            : currentUser
        ))
      }
    } catch {
      // Keep the rest of the dashboard usable if challenge sync fails.
    }
  }

  useEffect(() => {
    async function loadDashboard() {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY) || ''

      if (!token) {
        hasLoadedRef.current = false
        setIsLoading(false)
        setLoading(false)
        return
      }

      if (hasLoadedRef.current) {
        return
      }
      hasLoadedRef.current = true

      setIsLoading(true)
      setLoading(true)
      setErrorText('')

      try {
        // Parallelize auth/me and daily-tasks fetches
        const [user, dailyTasks, gameRemaining, dailyChallengeData] = await Promise.all([
          authedFetch('/api/auth/me/'),
          authedFetch('/api/daily-tasks/'),
          authedFetch('/api/game/remaining/'),
          authedFetch('/api/daily-challenge/').catch(() => null),
        ])

        setUser(user)
        setUserName(user.name || '')
        setUserEmail(user.email)
        setEquippedBadge(user.equipped_badge || null)
        if (user.equipped_badge) {
          localStorage.setItem('badge', user.equipped_badge)
        } else {
          localStorage.removeItem('badge')
        }
        setLevel(user.level)
        setXp(user.xp)
        setStreakDays(user.streak)

        setTasks(mapDailyTasksToUi(dailyTasks))
        setShowFocusPicker(false)
        setGameRemainingXpByType(gameRemaining?.remaining_by_type || {})
        setDailyChallenge(dailyChallengeData)

        // Only on initial load, set prevLevel to user's current level so level-up popup doesn't trigger on refresh
        if (!isInitialLoadRef.current) {
          setPrevLevel(user.level)
          isInitialLoadRef.current = true
        }
      } catch (error) {
        hasLoadedRef.current = false
        setErrorText(error.message || 'Could not connect to backend.')
        if (error.message?.includes('Session expired')) {
          handleLogout()
        }
      } finally {
        setIsLoading(false)
        setLoading(false)
      }
    }

    loadDashboard()
  }, [accessToken])

  useEffect(() => {
    async function loadPublicSocialProof() {
      try {
        const leaderboard = await fetch(apiUrl('/api/leaderboard/?limit=1'))
        const data = await readApiPayload(leaderboard)
        if (!leaderboard.ok) {
          return
        }

        setTotalPlayers(data?.total_users || 0)
      } catch {
        // Leave social proof hidden if the request fails.
      }
    }

    loadPublicSocialProof()
  }, [])

  useEffect(() => {
    if (activeTab !== 'Leaderboard' || !user) {
      return
    }

    async function loadLeaderboard() {
      if (leaderboardPeriod === 'prestige') {
        setPrestigeLoading(true)
        try {
          const leaderboard = await authedFetch('/api/leaderboard/prestige/?limit=50')
          setPrestigeEntries(leaderboard.entries || [])
          setPrestigeMeta({
            total: leaderboard.total || 0,
            yourRank: leaderboard.your_rank || null,
          })
        } catch (error) {
          console.error('Failed to load prestige leaderboard:', error)
        } finally {
          setPrestigeLoading(false)
        }
        return
      }

      setLeaderboardLoading(true)
      try {
        const leaderboard = await authedFetch(`/api/leaderboard/?limit=30&period=${leaderboardPeriod}`)
        setLeaderboardEntries(leaderboard.top_users || leaderboard.entries || [])
        setTotalPlayers(leaderboard.total_users || 0)
        setYourRank(leaderboard.your_rank || leaderboard.current_user_rank?.rank || null)
      } catch (error) {
        console.error('Failed to load leaderboard:', error)
      } finally {
        setLeaderboardLoading(false)
      }
    }

    loadLeaderboard()
  }, [activeTab, user, leaderboardPeriod])

  useEffect(() => {
    if (activeTab !== 'Leaderboard' || leaderboardPeriod !== 'weekly') {
      return
    }

    setLeaderboardNowMs(Date.now())
    const interval = window.setInterval(() => {
      setLeaderboardNowMs(Date.now())
    }, 60000)

    return () => window.clearInterval(interval)
  }, [activeTab, leaderboardPeriod])

  useEffect(() => {
    if (gameRoute !== '/game/war-mode/timer' || !warModeEndAt || !warModeSessionId) {
      return
    }

    function syncRemaining() {
      const remaining = Math.max(0, Math.ceil((warModeEndAt - Date.now()) / 1000))
      setWarModeRemainingSeconds(remaining)
    }

    syncRemaining()
    const interval = window.setInterval(syncRemaining, 1000)
    return () => window.clearInterval(interval)
  }, [gameRoute, warModeEndAt, warModeSessionId])

  useEffect(() => {
    if (
      gameRoute !== '/game/war-mode/timer'
      || !warModeSessionId
      || warModeRemainingSeconds > 0
      || warModeSubmitting
      || warModeCompletionGuardRef.current
    ) {
      return
    }

    warModeCompletionGuardRef.current = true
    setWarModeCompletionReady(true)
  }, [gameRoute, warModeRemainingSeconds, warModeSessionId, warModeSubmitting])

  useEffect(() => {
    if (!gameStarted) {
      return
    }

    const interval = setInterval(() => {
      setTimeLeft((previous) => Math.max(0, previous - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [gameStarted])

  useEffect(() => {
    const previous = previousCompletedCountRef.current
    previousCompletedCountRef.current = completedCount

    if (
      shouldFireTaskConfettiRef.current
      && previous !== null
      && previous < 5
      && completedCount === 5
    ) {
      fireConfetti()
      shouldFireTaskConfettiRef.current = false
    }
  }, [completedCount])

  useEffect(() => {
    // Only show level-up if this is NOT the initial load.
    if (!isInitialLoadRef.current || level <= prevLevel) {
      return
    }

    setPrevLevel(level)

    if (showGameResult || Boolean(selectedTask) || showInstallPopup || showLevelUp) {
      setPendingLevelUpLevel(level)
      return
    }

    setShowLevelUp(true)
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      zIndex: 11000,
    })
  }, [level, prevLevel, showGameResult, selectedTask, showInstallPopup, showLevelUp])

  useEffect(() => {
    if (!pendingLevelUpLevel || showLevelUp || showGameResult || Boolean(selectedTask) || showInstallPopup) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShowLevelUp(true)
      setPendingLevelUpLevel(null)
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        zIndex: 11000,
      })
    }, 200)

    return () => window.clearTimeout(timeoutId)
  }, [pendingLevelUpLevel, showLevelUp, showGameResult, selectedTask, showInstallPopup])

  useEffect(() => {
    if (shouldLockBodyScroll) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [shouldLockBodyScroll])

  useEffect(() => {
    if (gameStarted && timeLeft === 0) {
      setGameStarted(false)
      setCurrentQuestion(null)
      void submitGameResult(score)
    }
  }, [gameStarted, timeLeft, score])

  useEffect(() => {
    const targetXp = gameResult?.xp_awarded || 0
    if (targetXp <= 0) {
      setAnimatedGameXp(0)
      return
    }

    setAnimatedGameXp(0)
    const durationMs = 500
    const stepMs = 30
    const steps = Math.max(1, Math.floor(durationMs / stepMs))
    const increment = targetXp / steps
    let current = 0

    const interval = setInterval(() => {
      current += increment
      if (current >= targetXp) {
        setAnimatedGameXp(targetXp)
        clearInterval(interval)
        return
      }
      setAnimatedGameXp(Math.floor(current))
    }, stepMs)

    return () => clearInterval(interval)
  }, [gameResult])

  useEffect(() => {
    if (shouldFireQuickMathConfettiRef.current && gameResult && gameResult.score > 0) {
      fireConfetti()
      shouldFireQuickMathConfettiRef.current = false
    }
  }, [gameResult])

  useEffect(() => {
    setIsInstalled(isStandaloneMode())

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    const onAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      setShowInstallPopup(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  useEffect(() => {
    const { isInAppBrowser, isAndroid, isIOS, isStandalone } = getInstallContext()

    if (isStandalone || isInstalled || !installEligible) {
      setShowInstallPopup(false)
      return
    }

    if (deferredPrompt) {
      setShowInstallPopup(true)
      return
    }

    if (isInAppBrowser && (isAndroid || isIOS)) {
      setShowInstallPopup(true)
      return
    }

    if (!deferredPrompt && (isIOS || isAndroid)) {
      setShowInstallPopup(true)
    }
  }, [installEligible, deferredPrompt, isInstalled])

  useEffect(() => {
    if (!user) {
      return
    }

    const serverBadge = user.equipped_badge || null
    setEquippedBadge(serverBadge)
    if (serverBadge) {
      localStorage.setItem('badge', serverBadge)
    } else {
      localStorage.removeItem('badge')
    }
  }, [user])

  useEffect(() => {
    if (!equippedBadge) {
      return
    }

    const stillEarned = earnedBadges.some((badge) => badge.id === equippedBadge)
    if (!stillEarned) {
      setEquippedBadge(null)
      localStorage.removeItem('badge')
    }
  }, [equippedBadge, earnedBadges])

  useEffect(() => {
    if (!user || !guestChallengeResult) {
      return
    }

    setChallengeResultPending({
      challengeId: guestChallengeResult.challengeId,
      score: guestChallengeResult.score,
      metric: guestChallengeResult.metric,
      mode: 'display',
    })
    setActiveChallengeId(guestChallengeResult.challengeId)
    setGuestChallengeResult(null)
  }, [user, guestChallengeResult])

  useEffect(() => {
    function syncRouteFromPath() {
      const path = window.location.pathname.toLowerCase()
      const isWeeklyReportPath = path === '/weekly-report' || path === '/weekly-report/'
      setShowWeeklyReport(isWeeklyReportPath)

      if (isWeeklyReportPath) {
        setActiveTab('Home')
        return
      }

      if (path === '/' || path === '') {
        setActiveTab('Home')
        return
      }
      if (path === '/journal') {
        setActiveTab('Journal')
        return
      }
      if (path === '/leaderboard') {
        setActiveTab('Leaderboard')
        return
      }
      if (path === '/profile') {
        setActiveTab('Profile')
        return
      }
      if (path === '/tasks') {
        setActiveTab('Tasks')
        return
      }
      if (path === '/workout') {
        setActiveTab('Workout')
        return
      }
      if (path === '/game/quick-math') {
        setActiveTab('Game')
        setGameRoute('/game/quick-math')
        return
      }
      if (path === '/game/focus-tap') {
        setActiveTab('Game')
        setGameRoute('/game/focus-tap')
        return
      }
      if (path === '/game/reaction-tap') {
        setActiveTab('Game')
        setGameRoute('/game/reaction-tap')
        return
      }
      if (path === '/game/number-recall') {
        setActiveTab('Game')
        setGameRoute('/game/number-recall')
        return
      }
      if (path === '/game/color-count-focus') {
        setActiveTab('Game')
        setGameRoute('/game/color-count-focus')
        return
      }
      if (path === '/game/speed-pattern') {
        setActiveTab('Game')
        setGameRoute('/game/speed-pattern')
        return
      }
      if (path === '/game/reverse-order') {
        setActiveTab('Game')
        setGameRoute('/game/reverse-order')
        return
      }
      if (path === '/game/number-stack') {
        setActiveTab('Game')
        setGameRoute('/game/number-stack')
        return
      }
      if (path === '/game/pattern-sequence') {
        setActiveTab('Game')
        setGameRoute('/game/pattern-sequence')
        return
      }
      if (path === '/game/war-mode') {
        setActiveTab('Game')
        setGameRoute('/game/war-mode')
        return
      }
      if (path === '/game/war-mode/timer') {
        setActiveTab('Game')
        setGameRoute('/game/war-mode/timer')
        return
      }
      if (path === '/game') {
        setActiveTab('Game')
        setGameRoute('/game')
      }
    }

    syncRouteFromPath()
    window.addEventListener('popstate', syncRouteFromPath)
    return () => window.removeEventListener('popstate', syncRouteFromPath)
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return undefined
    }

    function handleServiceWorkerMessage(event) {
      const data = event?.data
      if (!data || data.type !== 'NAVIGATE' || typeof data.url !== 'string' || !data.url.startsWith('/')) {
        return
      }

      window.history.pushState({}, '', data.url)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const challengeId = params.get('challenge')
    if (challengeId) {
      setActiveChallengeId(challengeId)
    }
  }, [])

  useEffect(() => {
    if (user) {
      return
    }

    const params = new URLSearchParams(window.location.search)
    const tokenFromUrl = params.get('reset_token')
    if (!tokenFromUrl) {
      return
    }

    if (authMode === 'reset_password' && resetPasswordToken === tokenFromUrl) {
      return
    }

    setGuestMode(false)
    setShowGuestSignup(false)
    setGuestScore(null)
    setErrorText('')
    setAuthNotice('Set your new password below.')
    setPasswordInput('')
    setResetPasswordConfirmInput('')
    setResetPasswordToken(tokenFromUrl)
    setAuthMode('reset_password')
  }, [
    user,
    authMode,
    resetPasswordToken,
    setErrorText,
    setAuthNotice,
    setPasswordInput,
    setResetPasswordConfirmInput,
    setResetPasswordToken,
    setAuthMode,
  ])

  async function handleAuthSubmit(event, inviteCode = null) {
    event.preventDefault()
    setAuthLoading(true)
    setErrorText('')
    setAuthNotice('')
    const targetMode = inviteCode ? 'register' : authMode
    const resolvedAuthMode = targetMode === 'register_intent' ? 'register' : targetMode

    try {
      if (resolvedAuthMode === 'forgot_password') {
        const forgotResponse = await fetch(apiUrl('/api/auth/forgot-password/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput }),
        })
        const forgotData = await readApiPayload(forgotResponse)
        if (!forgotResponse.ok) {
          throw new Error(forgotData?.email?.[0] || forgotData?.error || 'Could not send reset link.')
        }

        setAuthNotice(forgotData?.message || 'If an account exists for this email, a reset link has been sent.')
        let tokenFromResponse = forgotData?.reset_token || ''
        if (!tokenFromResponse && forgotData?.reset_url) {
          try {
            const parsed = new URL(forgotData.reset_url)
            tokenFromResponse = parsed.searchParams.get('reset_token') || ''
          } catch {
            tokenFromResponse = ''
          }
        }

        if (tokenFromResponse) {
          setResetPasswordToken(tokenFromResponse)
          setAuthNotice('Reset token loaded. Set your new password now.')
          setAuthMode('reset_password')
        } else {
          setAuthMode('login')
        }
        return
      }

      if (resolvedAuthMode === 'reset_password') {
        let normalizedResetToken = (resetPasswordToken || '').trim()

        if (normalizedResetToken) {
          try {
            const parsedUrl = new URL(normalizedResetToken)
            const fromUrl = parsedUrl.searchParams.get('reset_token')
            if (fromUrl) {
              normalizedResetToken = fromUrl
            }
          } catch {
            // Token may not be a full URL; continue with raw value.
          }

          if (normalizedResetToken.includes('reset_token=')) {
            const queryPart = normalizedResetToken.includes('?')
              ? normalizedResetToken.split('?')[1]
              : normalizedResetToken
            const params = new URLSearchParams(queryPart)
            const fromQuery = params.get('reset_token')
            if (fromQuery) {
              normalizedResetToken = fromQuery
            }
          }

          // Handle quoted-printable artifacts often seen in console-emitted emails.
          normalizedResetToken = normalizedResetToken
            .replace(/=\r?\n/g, '')
            .replace(/=([A-Fa-f0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
            .trim()

          if (normalizedResetToken.startsWith('3Dey')) {
            normalizedResetToken = normalizedResetToken.slice(2)
          }
          if (normalizedResetToken.startsWith('=3D')) {
            normalizedResetToken = normalizedResetToken.slice(3)
          }
          if (normalizedResetToken.startsWith('=')) {
            normalizedResetToken = normalizedResetToken.slice(1)
          }
        }

        if (!normalizedResetToken) {
          throw new Error('Reset token is required.')
        }
        if (passwordInput !== resetPasswordConfirmInput) {
          throw new Error('Passwords do not match.')
        }

        const resetResponse = await fetch(apiUrl('/api/auth/reset-password/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: normalizedResetToken, password: passwordInput }),
        })
        const resetData = await readApiPayload(resetResponse)
        if (!resetResponse.ok) {
          throw new Error(resetData?.error || 'Could not reset password.')
        }

        setAuthNotice(resetData?.message || 'Password reset successful. Please log in with your new password.')
        setPasswordInput('')
        setResetPasswordConfirmInput('')
        setResetPasswordToken('')
        clearResetTokenParam()
        setAuthMode('login')
        return
      }

      if (resolvedAuthMode === 'register') {
        const registerPayload = { name: nameInput, email: emailInput, password: passwordInput }
        if (inviteCode) {
          registerPayload.invite_code = inviteCode
        }
        const registerResponse = await fetch(apiUrl('/api/auth/register/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registerPayload),
        })
        const registerData = await readApiPayload(registerResponse)
        if (!registerResponse.ok) {
          throw new Error(
            registerData.invite_code?.[0] ||
            registerData.name?.[0] ||
            registerData.email?.[0] ||
            registerData.detail ||
            registerData.error ||
            'Registration failed.'
          )
        }
      }

      const loginResponse = await fetch(apiUrl('/api/auth/login/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: emailInput, password: passwordInput }),
      })
      const loginData = await readApiPayload(loginResponse)
      if (!loginResponse.ok) {
        throw new Error(loginData.detail || 'Login failed.')
      }

      persistTokens(loginData.access, loginData.refresh)
      hasLoadedRef.current = false
      setActiveTab('Home')
      reactRouterNavigate('/')
      setGameRoute('/game')
      setPasswordInput('')
      setResetPasswordConfirmInput('')
      setResetPasswordToken('')
      clearResetTokenParam()
      setShowGuestSignup(false)
      setGuestMode(false)
      setGuestScore(null)
      if (resolvedAuthMode === 'register') {
        setNameInput('')
      }
    } catch (error) {
      setErrorText(error.message || 'Authentication failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleUpdateName(event) {
    event.preventDefault()
    if (!accessToken) {
      return
    }

    setNameUpdating(true)
    try {
      setErrorText('')
      const data = await authedFetch('/api/user/update-name/', {
        method: 'PATCH',
        body: JSON.stringify({ name: nameInput }),
      })
      setUser(data)
      setUserName(data.name || '')
      setNameInput('')
    } catch (error) {
      setErrorText(error.message || 'Could not update name.')
    } finally {
      setNameUpdating(false)
    }
  }

  async function handleProfileSaveName(event) {
    event.preventDefault()
    if (!accessToken) {
      return
    }

    setNameUpdating(true)
    try {
      setErrorText('')
      const data = await authedFetch('/api/user/update-name/', {
        method: 'PATCH',
        body: JSON.stringify({ name: nameInput }),
      })
      setUser(data)
      setUserName(data.name || '')
      setNameInput('')
      setIsProfileEditingName(false)
    } catch (error) {
      setErrorText(error.message || 'Could not update name.')
    } finally {
      setNameUpdating(false)
    }
  }

  function handleProfileEditName(nextEditingState) {
    if (nextEditingState === false) {
      setIsProfileEditingName(false)
      setNameInput('')
      return
    }

    setNameInput(profileDisplayName)
    setIsProfileEditingName(true)
  }

  async function handleInstallClick() {
    if (!deferredPrompt) {
      return
    }

    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      console.log('PWA install accepted')
    }

    setDeferredPrompt(null)
    setShowInstallPopup(false)
  }

  function handleLogout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem('badge')
    hasLoadedRef.current = false
    setAccessToken('')
    setAuthNotice('')
    setResetPasswordToken('')
    setResetPasswordConfirmInput('')
    setAuthMode('landing')
    setUser(null)
    setDailyChallenge(null)
    setShowDailyChallenge(false)
    setGuestMode(false)
    setGuestScore(null)
    setShowGuestSignup(false)
    setGuestRunId(0)
    clearPendingChallengeAccept()
    setChallengeResultPending(null)
    setGuestChallengeResult(null)
    setShowChallengeDashboard(false)
    setActiveChallengeId(null)
    setShowFocusPicker(false)
    setFocusUpdating(false)
    setShowDisciplineBeast(false)
    setEquippedBadge(null)
    setTasks([])
    setUserName('')
    setUserEmail('')
    setLevel(1)
    setXp(0)
    setStreakDays(0)
    setLeaderboardEntries([])
    setGameRemainingXpByType({})
    setTotalPlayers(0)
    setYourRank(null)
    setActiveTab('Home')
    setGameRoute('/game')
    setGameSessionId('')
    setGameStarted(false)
    setTimeLeft(30)
    setScore(0)
    setCurrentQuestion(null)
    setUserAnswer('')
    setGameSubmitting(false)
    setGameResult(null)
    setFocusTapSessionId('')
    setFocusTapSubmitting(false)
    setFocusTapXpAwarded(null)
    setFocusTapResult(null)
    setFocusTapError('')
    setNumberRecallSessionId('')
    setNumberRecallSubmitting(false)
    setNumberRecallXpAwarded(null)
    setNumberRecallResult(null)
    setNumberRecallError('')
    setColorCountSessionId('')
    setColorCountSubmitting(false)
    setColorCountXpAwarded(null)
    setColorCountResult(null)
    setColorCountError('')
    setSpeedPatternSessionId('')
    setSpeedPatternSubmitting(false)
    setSpeedPatternXpAwarded(null)
    setSpeedPatternResult(null)
    setSpeedPatternError('')
    setReverseOrderSessionId('')
    setReverseOrderSubmitting(false)
    setReverseOrderXpAwarded(null)
    setReverseOrderResult(null)
    setReverseOrderError('')
    setNumberStackSessionId('')
    numberStackSessionIdRef.current = ''
    setNumberStackSubmitting(false)
    setNumberStackXpAwarded(null)
    setNumberStackResult(null)
    setNumberStackError('')
    setPatternSeqSessionId('')
    setPatternSeqSubmitting(false)
    setPatternSeqXpAwarded(null)
    setPatternSeqResult(null)
    setPatternSeqError('')
    setLogicGridSessionId('')
    setLogicGridSubmitting(false)
    setLogicGridXpAwarded(null)
    setLogicGridResult(null)
    setLogicGridError('')
    setReactionTapSessionId('')
    setReactionTapSubmitting(false)
    setReactionTapXpAwarded(null)
    setReactionTapResult(null)
    setReactionTapError('')
    resetWarModeState()
    isInitialLoadRef.current = false
    clearResetTokenParam()
    clearChallengeParam()
    setLoading(false)
  }

  function generateQuestion() {
    const num1 = Math.floor(Math.random() * 20) + 1
    const num2 = Math.floor(Math.random() * 20) + 1
    const operators = ['+', '-', '*']
    const operator = operators[Math.floor(Math.random() * operators.length)]

    let answer = 0
    if (operator === '+') {
      answer = num1 + num2
    } else if (operator === '-') {
      answer = num1 - num2
    } else {
      answer = num1 * num2
    }

    return { num1, num2, operator, answer }
  }

  async function submitWarModeCompletion() {
    if (!warModeSessionId || !warModeSelection) {
      return
    }

    setWarModeSubmitting(true)
    try {
      setWarModeError('')
      const data = await authedFetch('/api/game/submit/', {
        method: 'POST',
        body: JSON.stringify({
          session_id: warModeSessionId,
          score: 1,
        }),
      })

      setXp(data.total_xp)
      setLevel(data.level)
      await silentRefreshUser()
      setWarModeResult({
        xpAwarded: data.xp_awarded,
        cappedByDailyLimit: data.capped_by_daily_limit,
      })
      if ((data.total_shields_awarded || 0) > 0) {
        setShieldEarnedNotice(branding.copyPack.homeCopy.shieldEarnedMsg)
      }
      setWarModeSessionId('')
      setWarModeCompletionReady(false)
      setWarModeHonestyMessage('')
      setInstallEligible(true)
      void refreshDailyChallengeStatus()
      fireConfetti()
    } catch (error) {
      setWarModeError(error.message || 'Could not submit War Mode session.')
      warModeCompletionGuardRef.current = false
    } finally {
      setWarModeSubmitting(false)
    }
  }

  async function handleStartWarMode(durationKey) {
    const selected = WAR_MODE_OPTIONS[durationKey]
    if (!selected) {
      return
    }

    setWarModeSelection(durationKey)
    setWarModeResult(null)
    setWarModeError('')
    setWarModeCompletionReady(false)
    setWarModeHonestyMessage('')
    setWarModeSubmitting(false)
    warModeCompletionGuardRef.current = false

    try {
      const data = await authedFetch('/api/game/start/', {
        method: 'POST',
        body: JSON.stringify({ game_type: selected.gameType }),
      })

      const durationSeconds = selected.minutes * 60
      setWarModeSessionId(data.session_id)
      setWarModeRemainingSeconds(durationSeconds)
      setWarModeEndAt(Date.now() + (durationSeconds * 1000))
      navigate('/game/war-mode/timer')
    } catch (error) {
      setWarModeSessionId('')
      setWarModeEndAt(0)
      setWarModeRemainingSeconds(0)
      setWarModeError(error.message || 'Could not start War Mode.')
    }
  }

  function handleSurrenderWarMode() {
    setWarModeSurrenderConfirmOpen(false)
    resetWarModeState()
    navigate('/')
  }

  function handleWarModeHonestNoShow() {
    setWarModeSessionId('')
    setWarModeCompletionReady(false)
    setWarModeHonestyMessage(branding.copyPack.homeCopy.honestNoShowMsg)
  }

  async function handleStartGame() {
    if (gameStarted) {
      return
    }

    const question = generateQuestion()
    setGameStarted(true)
    setTimeLeft(30)
    setScore(0)
    setCurrentQuestion(question)
    setUserAnswer('')
    setGameResult(null)

    try {
      setErrorText('')
      const data = await authedFetch('/api/game/start/', {
        method: 'POST',
        body: JSON.stringify({ game_type: 'quick_math' }),
      })
      setGameSessionId(data.session_id)
    } catch (error) {
      setGameStarted(false)
      setCurrentQuestion(null)
      setTimeLeft(30)
      setErrorText(error.message || 'Could not start game session.')
    }
  }

  function handleSubmitAnswer(event) {
    event.preventDefault()

    if (!gameStarted || !currentQuestion) {
      return
    }

    const parsed = Number.parseInt(userAnswer, 10)
    if (!Number.isNaN(parsed) && parsed === currentQuestion.answer) {
      setScore((previous) => previous + 1)
    }

    setUserAnswer('')
    setCurrentQuestion(generateQuestion())
  }

  async function submitGameResult(finalScore, sessionId = gameSessionId) {
    if (!sessionId) {
      setErrorText('Game session was not created. Please start again.')
      return
    }

    setGameSubmitting(true)
    try {
      setErrorText('')
      const data = await authedFetch('/api/game/submit/', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          score: finalScore,
        }),
      })

      setXp(data.total_xp)
      setLevel(data.level)
      await silentRefreshUser()
      if (data.score > bestGameScore) {
        setBestGameScore(data.score)
        localStorage.setItem(BEST_GAME_SCORE_KEY, String(data.score))
      }
      setGameResult({
        score: data.score,
        xp_awarded: data.xp_awarded,
        daily_cap: data.daily_cap,
        remaining_today: data.remaining_today,
        capped_by_daily_limit: data.capped_by_daily_limit,
      })
      recordLastTrainingResult('Quick Math', data.score, data.remaining_today, data.daily_cap, data.game_type)
      void refreshDailyChallengeStatus()
      shouldFireQuickMathConfettiRef.current = true
      setInstallEligible(true)
      if (sessionId === gameSessionId) {
        setGameSessionId('')
      }
      setTimeLeft(30)
    } catch (error) {
      setErrorText(error.message || 'Could not submit game result.')
    } finally {
      setGameSubmitting(false)
    }
  }

  function handleAskComplete(task) {
    if (task.completed) {
      return
    }
    setSelectedTask(task)
  }

  async function handleConfirmYes() {
    if (!selectedTask) {
      return
    }

    const taskId = selectedTask.id
    const taskToComplete = selectedTask

    // Optimistic update — show completion instantly
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, completed: true } : task,
      ),
    )
    setJustCompletedId(taskId)
    setTimeout(() => setJustCompletedId(null), 1200)
    setSelectedTask(null)

    try {
      const data = await authedFetch('/api/complete-task/', {
        method: 'POST',
        body: JSON.stringify({ userTaskId: taskId }),
      })
      setXp(data.total_xp)
      setLevel(data.level)
      setStreakDays(data.streak)
      setUser((currentUser) => (
        currentUser
          ? {
            ...currentUser,
            xp: data.total_xp,
            level: data.level,
            streak: data.streak,
            streak_shields: data.streak_shields ?? currentUser.streak_shields,
            total_tasks_completed: typeof data.total_tasks_completed === 'number'
              ? data.total_tasks_completed
              : (currentUser.total_tasks_completed || 0) + 1,
          }
          : currentUser
      ))
      shouldFireTaskConfettiRef.current = true

      setJustCompletedId(taskId)
      setTimeout(() => setJustCompletedId(null), 1200)
      setErrorText('')
      setInstallEligible(true)
      if ((data.total_shields_awarded || 0) > 0) {
        setShieldEarnedNotice(interpolate(branding.copyPack.homeCopy.taskShieldAwardMsg, { count: data.total_shields_awarded }))
      }
      void refreshDailyChallengeStatus()
    } catch (error) {
      setErrorText(error.message || 'Task could not be completed.')
    }
  }

  function handleConfirmNo() {
    setSelectedTask(null)
  }

  async function handleDeleteTask(task) {
    if (!task?.id || task.completed) {
      return
    }

    try {
      setErrorText('')
      await authedFetch(`/api/tasks/${task.id}/`, { method: 'DELETE' })
      setTasks((currentTasks) => currentTasks.filter((item) => item.id !== task.id))
    } catch (error) {
      setErrorText(error.message || 'Task could not be deleted.')
    }
  }

  async function handleSelectFocus(categoryKey) {
    setFocusUpdating(true)
    try {
      setErrorText('')
      const data = await authedFetch('/api/user/update-focus/', {
        method: 'PATCH',
        body: JSON.stringify({ focus_category: categoryKey }),
      })

      setUser(data)
      if (typeof data.xp === 'number') {
        setXp(data.xp)
      }
      if (typeof data.level === 'number') {
        setLevel(data.level)
      }
      if (typeof data.streak === 'number') {
        setStreakDays(data.streak)
      }

      const dailyTasks = await authedFetch('/api/daily-tasks/')
      setTasks(mapDailyTasksToUi(dailyTasks))
      setShowFocusPicker(false)
    } catch (error) {
      setErrorText(error.message || 'Could not update focus.')
    } finally {
      setFocusUpdating(false)
    }
  }

  async function handleToggleBadge(badgeId, earned) {
    if (!earned) {
      return
    }

    const previousBadge = equippedBadge
    const nextBadge = equippedBadge === badgeId ? null : badgeId
    setEquippedBadge(nextBadge)
    if (nextBadge) {
      localStorage.setItem('badge', nextBadge)
    } else {
      localStorage.removeItem('badge')
    }

    try {
      const data = await authedFetch('/api/user/equip-badge/', {
        method: 'PATCH',
        body: JSON.stringify({ badge_id: nextBadge }),
      })

      const persisted = data?.equipped_badge || null
      setEquippedBadge(persisted)
      setUser((currentUser) => (
        currentUser
          ? { ...currentUser, equipped_badge: persisted }
          : currentUser
      ))
      if (persisted) {
        localStorage.setItem('badge', persisted)
      } else {
        localStorage.removeItem('badge')
      }
    } catch (error) {
      setEquippedBadge(previousBadge)
      if (previousBadge) {
        localStorage.setItem('badge', previousBadge)
      } else {
        localStorage.removeItem('badge')
      }
      setErrorText(error.message || 'Could not equip badge.')
    }
  }

  async function handleFocusTapStart() {
    try {
      if (isGuestChallenge('/game/focus-tap')) {
        setFocusTapError('')
        setFocusTapXpAwarded(null)
        setFocusTapResult(null)
        return
      }
      setFocusTapError('')
      setFocusTapXpAwarded(null)
      setFocusTapResult(null)
      const data = await authedFetch('/api/game/start/', {
        method: 'POST',
        body: JSON.stringify({ game_type: 'focus_tap' }),
      })
      setFocusTapSessionId(data.session_id)
    } catch (error) {
      setFocusTapSessionId('')
      setFocusTapError(error.message || 'Could not start Focus Tap session.')
    }
  }

  async function handleFocusTapFinish(result) {
    setInstallEligible(true)

    if (!result) {
      return
    }

    const challengeScore = result.outcome === 'won' ? 1 : 0
    const challengeMetric = Number.isFinite(result.metric) ? result.metric : null

    if (isGuestChallenge('/game/focus-tap')) {
      resolvePendingChallengeAccept('/game/focus-tap', challengeScore, challengeMetric)
      return
    }

    if (!focusTapSessionId) {
      return
    }

    setFocusTapSubmitting(true)
    try {
      setFocusTapError('')
      const data = await authedFetch('/api/game/submit/', {
        method: 'POST',
        body: JSON.stringify({
          session_id: focusTapSessionId,
          score: result.score,
          is_challenge: isChallengeGame('/game/focus-tap'),
        }),
      })

      setXp(data.total_xp)
      setLevel(data.level)
      await silentRefreshUser()
      setFocusTapXpAwarded(data.xp_awarded)
      setFocusTapResult({
        xpAwarded: data.xp_awarded,
        dailyCap: data.daily_cap,
        remainingToday: data.remaining_today,
        cappedByDailyLimit: data.capped_by_daily_limit,
        metric: challengeMetric,
      })
      recordLastTrainingResult('Focus Tap', result.score, data.remaining_today, data.daily_cap, data.game_type)
      void refreshDailyChallengeStatus()
      setFocusTapSessionId('')
    } catch (error) {
      setFocusTapError(error.message || 'Could not submit Focus Tap result.')
    } finally {
      setFocusTapSubmitting(false)
      resolvePendingChallengeAccept('/game/focus-tap', challengeScore, challengeMetric)
    }
  }

  async function handleReactionTapStart() {
    try {
      if (isGuestChallenge('/game/reaction-tap')) {
        setReactionTapError('')
        setReactionTapXpAwarded(null)
        setReactionTapResult(null)
        return true
      }
      setReactionTapError('')
      setReactionTapXpAwarded(null)
      setReactionTapResult(null)
      const data = await authedFetch('/api/game/start/', {
        method: 'POST',
        body: JSON.stringify({ game_type: 'reaction_tap' }),
      })
      setReactionTapSessionId(data.session_id)
      return true
    } catch (error) {
      setReactionTapSessionId('')
      setReactionTapError(error.message || 'Could not start Reaction Tap session.')
      return false
    }
  }

  async function handleReactionTapFinish(result) {
    if (!result) {
      return null
    }

    const challengeScore = result.score >= 1 ? 1 : 0
    const challengeMetric = Number.isFinite(result.metric)
      ? result.metric
      : (Number.isFinite(result.averageReaction) ? result.averageReaction : null)

    if (isGuestChallenge('/game/reaction-tap')) {
      resolvePendingChallengeAccept('/game/reaction-tap', challengeScore, challengeMetric)
      return null
    }

    if (!reactionTapSessionId) {
      return null
    }

    setReactionTapSubmitting(true)
    try {
      setReactionTapError('')
      const data = await authedFetch('/api/game/submit/', {
        method: 'POST',
        body: JSON.stringify({
          session_id: reactionTapSessionId,
          score: result.score,
          is_challenge: isChallengeGame('/game/reaction-tap'),
        }),
      })

      setXp(data.total_xp)
      setLevel(data.level)
      await silentRefreshUser()
      setReactionTapXpAwarded(data.xp_awarded)
      const meta = {
        xpAwarded: data.xp_awarded,
        dailyCap: data.daily_cap,
        remainingToday: data.remaining_today,
        cappedByDailyLimit: data.capped_by_daily_limit,
        todayGameXpBefore: data.today_game_xp_before,
        metric: challengeMetric,
      }
      setReactionTapResult(meta)
      setReactionTapSessionId('')
      if (data.xp_awarded > 0) {
        setInstallEligible(true)
      }
      const scoreForSummary = Number.isFinite(result.averageReaction)
        ? result.averageReaction
        : result.score
      recordLastTrainingResult('Reaction Tap', scoreForSummary, data.remaining_today, data.daily_cap, data.game_type)
      void refreshDailyChallengeStatus()
      return meta
    } catch (error) {
      setReactionTapError(error.message || 'Could not submit Reaction Tap result.')
      return null
    } finally {
      setReactionTapSubmitting(false)
      resolvePendingChallengeAccept('/game/reaction-tap', challengeScore, challengeMetric)
    }
  }

  async function handleNumberRecallStart() {
    try {
      if (isGuestChallenge('/game/number-recall')) {
        setNumberRecallError('')
        setNumberRecallXpAwarded(null)
        setNumberRecallResult(null)
        return true
      }
      setNumberRecallError('')
      setNumberRecallXpAwarded(null)
      setNumberRecallResult(null)
      const data = await authedFetch('/api/game/start/', {
        method: 'POST',
        body: JSON.stringify({ game_type: 'number_recall' }),
      })
      setNumberRecallSessionId(data.session_id)
      return true
    } catch (error) {
      setNumberRecallSessionId('')
      setNumberRecallError(error.message || 'Could not start Number Recall session.')
      return false
    }
  }

  async function handleNumberRecallFinish(result) {
    setInstallEligible(true)

    if (!result) {
      return
    }

    const challengeScore = result.outcome === 'win' ? 1 : 0
    const challengeMetric = Number.isFinite(result.metric) ? result.metric : null

    if (isGuestChallenge('/game/number-recall')) {
      resolvePendingChallengeAccept('/game/number-recall', challengeScore, challengeMetric)
      return
    }

    if (!numberRecallSessionId) {
      return
    }

    setNumberRecallSubmitting(true)
    try {
      setNumberRecallError('')
      const data = await authedFetch('/api/game/submit/', {
        method: 'POST',
        body: JSON.stringify({
          session_id: numberRecallSessionId,
          score: result.score,
          is_challenge: isChallengeGame('/game/number-recall'),
        }),
      })

      setXp(data.total_xp)
      setLevel(data.level)
      await silentRefreshUser()
      setNumberRecallXpAwarded(data.xp_awarded)
      setNumberRecallResult({
        xpAwarded: data.xp_awarded,
        dailyCap: data.daily_cap,
        remainingToday: data.remaining_today,
        cappedByDailyLimit: data.capped_by_daily_limit,
        metric: challengeMetric,
      })
      recordLastTrainingResult('Number Recall', result.score, data.remaining_today, data.daily_cap, data.game_type)
      void refreshDailyChallengeStatus()
      setNumberRecallSessionId('')
      if (result.outcome === 'win') {
        fireConfetti()
      }
    } catch (error) {
      setNumberRecallError(error.message || 'Could not submit Number Recall result.')
    } finally {
      setNumberRecallSubmitting(false)
      resolvePendingChallengeAccept('/game/number-recall', challengeScore, challengeMetric)
    }
  }

  async function handleColorCountStart() {
    try {
      if (isGuestChallenge('/game/color-count-focus')) {
        setColorCountError('')
        setColorCountXpAwarded(null)
        setColorCountResult(null)
        return true
      }
      setColorCountError('')
      setColorCountXpAwarded(null)
      setColorCountResult(null)
      const data = await authedFetch('/api/game/start/', {
        method: 'POST',
        body: JSON.stringify({ game_type: 'color_count_focus' }),
      })
      setColorCountSessionId(data.session_id)
      return true
    } catch (error) {
      setColorCountSessionId('')
      setColorCountError(error.message || 'Could not start Color Count Focus session.')
      return false
    }
  }

  async function handleColorCountFinish(result) {
    setInstallEligible(true)

    if (!result) {
      return
    }

    const challengeScore = result.outcome === 'win' ? 1 : 0
    const challengeMetric = Number.isFinite(result.metric) ? result.metric : null

    if (isGuestChallenge('/game/color-count-focus')) {
      resolvePendingChallengeAccept('/game/color-count-focus', challengeScore, challengeMetric)
      return
    }

    if (!colorCountSessionId) {
      return
    }

    setColorCountSubmitting(true)
    try {
      setColorCountError('')
      const data = await authedFetch('/api/game/submit/', {
        method: 'POST',
        body: JSON.stringify({
          session_id: colorCountSessionId,
          score: result.score,
          is_challenge: isChallengeGame('/game/color-count-focus'),
        }),
      })

      setXp(data.total_xp)
      setLevel(data.level)
      await silentRefreshUser()
      setColorCountXpAwarded(data.xp_awarded)
      setColorCountResult({
        xpAwarded: data.xp_awarded,
        dailyCap: data.daily_cap,
        remainingToday: data.remaining_today,
        cappedByDailyLimit: data.capped_by_daily_limit,
        metric: challengeMetric,
      })
      recordLastTrainingResult('Color Count Focus', result.score, data.remaining_today, data.daily_cap, data.game_type)
      void refreshDailyChallengeStatus()
      setColorCountSessionId('')
      if (result.outcome === 'win') {
        fireConfetti()
      }
    } catch (error) {
      setColorCountError(error.message || 'Could not submit Color Count Focus result.')
    } finally {
      setColorCountSubmitting(false)
      resolvePendingChallengeAccept('/game/color-count-focus', challengeScore, challengeMetric)
    }
  }

  async function handleSpeedPatternStart() {
    try {
      if (isGuestChallenge('/game/speed-pattern')) {
        setSpeedPatternError('')
        setSpeedPatternXpAwarded(null)
        setSpeedPatternResult(null)
        return true
      }
      setSpeedPatternError('')
      setSpeedPatternXpAwarded(null)
      setSpeedPatternResult(null)
      const data = await authedFetch('/api/game/start/', {
        method: 'POST',
        body: JSON.stringify({ game_type: 'speed_pattern' }),
      })
      setSpeedPatternSessionId(data.session_id)
      speedPatternSessionIdRef.current = data.session_id
      return true
    } catch (error) {
      setSpeedPatternSessionId('')
      speedPatternSessionIdRef.current = ''
      setSpeedPatternError(error.message || 'Could not start Speed Pattern session.')
      return false
    }
  }

  async function handleSpeedPatternFinish(result) {
    setInstallEligible(true)

    const activeSessionId = speedPatternSessionIdRef.current

    if (!result) {
      return false
    }

    const challengeScore = result.outcome === 'win' ? 1 : 0
    const challengeMetric = Number.isFinite(result.metric) ? result.metric : null

    if (isGuestChallenge('/game/speed-pattern')) {
      resolvePendingChallengeAccept('/game/speed-pattern', challengeScore, challengeMetric)
      return true
    }

    if (!activeSessionId) {
      setSpeedPatternError('No active session. Please restart the game.')
      return false
    }

    setSpeedPatternSubmitting(true)
    try {
      setSpeedPatternError('')
      const data = await authedFetch('/api/game/submit/', {
        method: 'POST',
        body: JSON.stringify({
          session_id: activeSessionId,
          score: result.score,
          is_challenge: isChallengeGame('/game/speed-pattern'),
        }),
      })

      setXp(data.total_xp)
      setLevel(data.level)
      await silentRefreshUser()
      setSpeedPatternXpAwarded(data.xp_awarded)
      setSpeedPatternResult({
        xpAwarded: data.xp_awarded,
        dailyCap: data.daily_cap,
        remainingToday: data.remaining_today,
        cappedByDailyLimit: data.capped_by_daily_limit,
        metric: challengeMetric,
      })
      recordLastTrainingResult('Speed Pattern', result.score, data.remaining_today, data.daily_cap, data.game_type)
      void refreshDailyChallengeStatus()
      setSpeedPatternSessionId('')
      speedPatternSessionIdRef.current = ''
      if (result.outcome === 'win') {
        fireConfetti()
      }
      return true
    } catch (error) {
      setSpeedPatternError(error.message || 'Could not submit Speed Pattern result.')
      return undefined
    } finally {
      setSpeedPatternSubmitting(false)
      resolvePendingChallengeAccept('/game/speed-pattern', challengeScore, challengeMetric)
    }
  }

  async function handleReverseOrderStart() {
    try {
      if (isGuestChallenge('/game/reverse-order')) {
        setReverseOrderError('')
        setReverseOrderXpAwarded(null)
        setReverseOrderResult(null)
        return true
      }
      setReverseOrderError('')
      setReverseOrderXpAwarded(null)
      setReverseOrderResult(null)
      const data = await authedFetch('/api/game/start/', {
        method: 'POST',
        body: JSON.stringify({ game_type: 'reverse_order' }),
      })
      setReverseOrderSessionId(data.session_id)
      return true
    } catch (error) {
      setReverseOrderSessionId('')
      setReverseOrderError(error.message || 'Could not start Reverse Order session.')
      return false
    }
  }

  async function handleReverseOrderFinish(result) {
    if (!result) {
      return null
    }

    const challengeScore = result.score >= 1 ? 1 : 0
    const challengeMetric = Number.isFinite(result.metric) ? result.metric : null

    if (isGuestChallenge('/game/reverse-order')) {
      resolvePendingChallengeAccept('/game/reverse-order', challengeScore, challengeMetric)
      return null
    }

    if (!reverseOrderSessionId) {
      return null
    }

    setReverseOrderSubmitting(true)
    try {
      setReverseOrderError('')
      const data = await authedFetch('/api/game/submit/', {
        method: 'POST',
        body: JSON.stringify({
          session_id: reverseOrderSessionId,
          score: result.score,
          is_challenge: isChallengeGame('/game/reverse-order'),
        }),
      })

      setXp(data.total_xp)
      setLevel(data.level)
      await silentRefreshUser()
      setReverseOrderXpAwarded(data.xp_awarded)
      const meta = {
        xpAwarded: data.xp_awarded,
        dailyCap: data.daily_cap,
        remainingToday: data.remaining_today,
        cappedByDailyLimit: data.capped_by_daily_limit,
        todayGameXpBefore: data.today_game_xp_before,
        metric: challengeMetric,
      }
      setReverseOrderResult(meta)
      setReverseOrderSessionId('')
      if (data.xp_awarded > 0) {
        setInstallEligible(true)
      }
      recordLastTrainingResult('Reverse Order', result.score, data.remaining_today, data.daily_cap, data.game_type)
      void refreshDailyChallengeStatus()
      return meta
    } catch (error) {
      setReverseOrderError(error.message || 'Could not submit Reverse Order result.')
      return null
    } finally {
      setReverseOrderSubmitting(false)
      resolvePendingChallengeAccept('/game/reverse-order', challengeScore, challengeMetric)
    }
  }

  async function handleNumberStackStart() {
    try {
      if (isGuestChallenge('/game/number-stack')) {
        setNumberStackError('')
        setNumberStackXpAwarded(null)
        setNumberStackResult(null)
        return true
      }
      setNumberStackError('')
      setNumberStackXpAwarded(null)
      setNumberStackResult(null)
      const data = await authedFetch('/api/game/start/', {
        method: 'POST',
        body: JSON.stringify({ game_type: 'number_stack' }),
      })
      setNumberStackSessionId(data.session_id)
      numberStackSessionIdRef.current = data.session_id
      return true
    } catch (error) {
      setNumberStackSessionId('')
      numberStackSessionIdRef.current = ''
      setNumberStackError(error.message || 'Could not start Number Stack session.')
      return false
    }
  }

  async function handleNumberStackFinish(result) {
    const activeSessionId = numberStackSessionIdRef.current

    if (!result) {
      return null
    }

    const challengeScore = result.score >= 1 ? 1 : 0
    const challengeMetric = Number.isFinite(result.metric) ? result.metric : null

    if (isGuestChallenge('/game/number-stack')) {
      resolvePendingChallengeAccept('/game/number-stack', challengeScore, challengeMetric)
      return null
    }

    if (!activeSessionId) {
      setNumberStackError('No active session. Please restart Number Stack.')
      return null
    }

    setNumberStackSubmitting(true)
    try {
      setNumberStackError('')
      const data = await authedFetch('/api/game/submit/', {
        method: 'POST',
        body: JSON.stringify({
          session_id: activeSessionId,
          score: result.score,
          is_challenge: isChallengeGame('/game/number-stack'),
        }),
      })

      setXp(data.total_xp)
      setLevel(data.level)
      await silentRefreshUser()
      setNumberStackXpAwarded(data.xp_awarded)
      const meta = {
        xpAwarded: data.xp_awarded,
        dailyCap: data.daily_cap,
        remainingToday: data.remaining_today,
        cappedByDailyLimit: data.capped_by_daily_limit,
        todayGameXpBefore: data.today_game_xp_before,
        metric: challengeMetric,
      }
      setNumberStackResult(meta)
      setNumberStackSessionId('')
      numberStackSessionIdRef.current = ''
      if (data.xp_awarded > 0) {
        setInstallEligible(true)
      }
      recordLastTrainingResult('Number Stack', result.score, data.remaining_today, data.daily_cap, data.game_type)
      void refreshDailyChallengeStatus()
      return meta
    } catch (error) {
      setNumberStackError(error.message || 'Could not submit Number Stack result.')
      return null
    } finally {
      setNumberStackSubmitting(false)
      resolvePendingChallengeAccept('/game/number-stack', challengeScore, challengeMetric)
    }
  }

  async function handlePatternSeqStart() {
    try {
      if (isGuestChallenge('/game/pattern-sequence')) {
        setPatternSeqError('')
        setPatternSeqXpAwarded(null)
        setPatternSeqResult(null)
        return true
      }
      setPatternSeqError('')
      setPatternSeqXpAwarded(null)
      setPatternSeqResult(null)
      const data = await authedFetch('/api/game/start/', {
        method: 'POST',
        body: JSON.stringify({ game_type: 'pattern_sequence' }),
      })
      setPatternSeqSessionId(data.session_id)
      return true
    } catch (error) {
      setPatternSeqSessionId('')
      setPatternSeqError(error.message || 'Could not start Pattern Sequence session.')
      return false
    }
  }

  async function handlePatternSeqFinish(result) {
    if (!result) {
      return null
    }

    const challengeScore = 1
    const challengeMetric = Number.isFinite(result.metric)
      ? result.metric
      : (Number.isFinite(result.elapsed) ? Math.round(result.elapsed * 1000) : null)

    if (isGuestChallenge('/game/pattern-sequence')) {
      resolvePendingChallengeAccept('/game/pattern-sequence', challengeScore, challengeMetric)
      return null
    }

    if (!patternSeqSessionId) {
      return null
    }

    setPatternSeqSubmitting(true)
    try {
      setPatternSeqError('')
      const data = await authedFetch('/api/game/submit/', {
        method: 'POST',
        body: JSON.stringify({
          session_id: patternSeqSessionId,
          score: result.score,
          is_challenge: isChallengeGame('/game/pattern-sequence'),
        }),
      })

      setXp(data.total_xp)
      setLevel(data.level)
      await silentRefreshUser()
      setPatternSeqXpAwarded(data.xp_awarded)
      const meta = {
        xpAwarded: data.xp_awarded,
        dailyCap: data.daily_cap,
        remainingToday: data.remaining_today,
        cappedByDailyLimit: data.capped_by_daily_limit,
        metric: challengeMetric,
      }
      setPatternSeqResult(meta)
      setPatternSeqSessionId('')
      recordLastTrainingResult('Pattern Sequence', result.score, data.remaining_today, data.daily_cap, data.game_type)
      void refreshDailyChallengeStatus()
      return meta
    } catch (error) {
      setPatternSeqError(error.message || 'Could not submit Pattern Sequence result.')
      return null
    } finally {
      setPatternSeqSubmitting(false)
      resolvePendingChallengeAccept('/game/pattern-sequence', challengeScore, challengeMetric)
    }
  }

  async function handleLogicGridStart() {
    try {
      if (isGuestChallenge('/game/logic-grid')) {
        setLogicGridError('')
        setLogicGridXpAwarded(null)
        setLogicGridResult(null)
        return true
      }
      setLogicGridError('')
      setLogicGridXpAwarded(null)
      setLogicGridResult(null)
      const data = await authedFetch('/api/game/start/', {
        method: 'POST',
        body: JSON.stringify({ game_type: 'logic_grid' }),
      })
      setLogicGridSessionId(data.session_id)
      return true
    } catch (error) {
      setLogicGridSessionId('')
      setLogicGridError(error.message || 'Could not start Logic Grid session.')
      return false
    }
  }

  async function handleLogicGridFinish(result) {
    if (!result) {
      return null
    }

    const challengeScore = 1
    const challengeMetric = Number.isFinite(result.metric)
      ? result.metric
      : (Number.isFinite(result.elapsed) ? Math.round(result.elapsed * 1000) : null)
    const puzzleId = result.puzzleId || null

    if (isGuestChallenge('/game/logic-grid')) {
      resolvePendingChallengeAccept('/game/logic-grid', challengeScore, challengeMetric)
      return null
    }

    if (!logicGridSessionId) {
      return null
    }

    setLogicGridSubmitting(true)
    try {
      setLogicGridError('')
      const data = await authedFetch('/api/game/submit/', {
        method: 'POST',
        body: JSON.stringify({
          session_id: logicGridSessionId,
          score: result.score,
          is_challenge: isChallengeGame('/game/logic-grid'),
        }),
      })

      setXp(data.total_xp)
      setLevel(data.level)
      await silentRefreshUser()
      setLogicGridXpAwarded(data.xp_awarded)
      const meta = {
        xpAwarded: data.xp_awarded,
        dailyCap: data.daily_cap,
        remainingToday: data.remaining_today,
        cappedByDailyLimit: data.capped_by_daily_limit,
        todayGameXpBefore: data.today_game_xp_before,
        metric: challengeMetric,
        puzzleId,
      }
      setLogicGridResult(meta)
      setLogicGridSessionId('')
      if (data.xp_awarded > 0) {
        setInstallEligible(true)
      }
      recordLastTrainingResult('Logic Grid', result.score, data.remaining_today, data.daily_cap, data.game_type)
      void refreshDailyChallengeStatus()
      return meta
    } catch (error) {
      setLogicGridError(error.message || 'Could not submit Logic Grid result.')
      return null
    } finally {
      setLogicGridSubmitting(false)
      resolvePendingChallengeAccept('/game/logic-grid', challengeScore, challengeMetric)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md lg:max-w-lg flex-col items-center justify-center px-5 py-8 bg-[#f8f6f1]">
        <div className="text-center space-y-6">
          <div className="text-3xl font-black tracking-[0.18em] text-zinc-900">
            {branding.appName}
          </div>
          <p className="text-[10px] lg:text-xs font-black uppercase tracking-[0.28em] text-zinc-400">
            {branding.appTagline}
          </p>
          <div className="flex gap-1.5 justify-center mt-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-zinc-900"
                style={{
                  animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`
                }}
              />
            ))}
          </div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Loading your war room...
          </p>
        </div>
        <style>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); opacity: 0.4; }
            50% { transform: translateY(-8px); opacity: 1; }
          }
        `}</style>
      </main>
    )
  }

  if (location.pathname.startsWith('/coach')) {
    if (!user || !user.is_coach) {
      return (
        <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-zinc-950 p-6 text-center text-white">
          <p className="mb-4 font-bold text-zinc-300">Access denied. Coach account required.</p>
          <button onClick={() => { reactRouterNavigate('/'); handleLogout() }} className="rounded-xl bg-white px-4 py-2 font-bold text-black">Return Home</button>
        </div>
      )
    }

    return (
      <CoachShell
        coachName={user.name}
        onLogout={handleLogout}
        activePage={
          location.pathname.includes('/exercises') ? 'exercises' :
          location.pathname.includes('/programs') ? 'programs' :
          location.pathname.includes('/clients') ? 'clients' : 'dashboard'
        }
        onNavigate={(key) => {
          if (key === 'dashboard' || key === 'clients') reactRouterNavigate('/coach/clients')
          else if (key === 'exercises') reactRouterNavigate('/coach/exercises')
          else if (key === 'programs') reactRouterNavigate('/coach/programs')
        }}
      >
        <Routes>
          <Route path="/coach/exercises" element={<CoachExerciseLibraryPage authedFetch={authedFetch} />} />
          <Route path="/coach/programs/:id" element={<CoachProgramBuilderPage authedFetch={authedFetch} />} />
          <Route path="/coach/programs" element={<CoachProgramsPage authedFetch={authedFetch} />} />
          
          <Route path="/coach/clients/:id" element={<CoachClientDetailPage authedFetch={authedFetch} />} />
          <Route path="/coach/clients" element={<CoachRosterPage authedFetch={authedFetch} />} />
          <Route path="*" element={<CoachRosterPage authedFetch={authedFetch} />} />
        </Routes>
      </CoachShell>
    )
  }

  if (location.pathname.startsWith('/join/')) {
    if (user) {
      reactRouterNavigate('/')
    }
    return (
      <div className="min-h-[100dvh] bg-zinc-900 pb-12">
        <Routes>
          <Route path="/join/:code" element={
            <JoinCoachPage 
              activeWarriorsCount={totalPlayers}
              handleAuthSubmit={handleAuthSubmit}
              authLoading={authLoading}
              errorText={errorText}
              nameInput={nameInput}
              setNameInput={setNameInput}
              emailInput={emailInput}
              setEmailInput={setEmailInput}
              passwordInput={passwordInput}
              setPasswordInput={setPasswordInput}
              setAuthMode={setAuthMode}
              authMode={authMode}
            />
          } />
        </Routes>
      </div>
    )
  }

  if (activeChallengeId) {
    return (
      <ChallengeLandingPage
        challengeId={activeChallengeId}
        initialScore={challengeResultPending?.challengeId === activeChallengeId ? challengeResultPending.score : null}
        initialMetric={challengeResultPending?.challengeId === activeChallengeId ? challengeResultPending.metric : null}
        initialResultMode={challengeResultPending?.mode || 'submit'}
        user={user}
        authedFetch={authedFetch}
        onGuestAuthRequired={(payload) => {
          setGuestChallengeResult(payload)
        }}
        onLogin={() => {
          setActiveChallengeId(null)
          setChallengeResultPending(null)
          clearChallengeParam()
          setShowGuestSignup(false)
          setGuestMode(false)
          setGuestScore(null)
          setErrorText('')
          setAuthNotice('')
          setResetPasswordToken('')
          setResetPasswordConfirmInput('')
          clearResetTokenParam()
          setAuthMode('login')
        }}
        onRegister={() => {
          setActiveChallengeId(null)
          setChallengeResultPending(null)
          clearChallengeParam()
          setShowGuestSignup(false)
          setGuestMode(false)
          setGuestScore(null)
          setErrorText('')
          setAuthNotice('')
          setResetPasswordToken('')
          setResetPasswordConfirmInput('')
          clearResetTokenParam()
          setAuthMode('register_intent')
        }}
        onClose={() => {
          setActiveChallengeId(null)
          setChallengeResultPending(null)
          clearChallengeParam()
          clearPendingChallengeAccept()
          setActiveTab('Home')
          navigate('/')
          void silentRefreshUser()
        }}
        onInitialResultHandled={handleChallengeInitialResultHandled}
        onNavigateToGame={(route, challengeId, challengeSeed = null) => {
          pendingChallengeAcceptRef.current = {
            challengeId,
            gamePath: route,
            seed: challengeSeed,
          }
          setActiveChallengeId(null)
          setChallengeResultPending(null)
          clearChallengeParam()
          navigate(route)
        }}
      />
    )
  }

  const guestChallengeActive = !user && pendingChallengeAcceptRef.current && activeTab === 'Game'

  if (!user && !guestChallengeActive) {
    if (guestMode) {
      return (
        <GuestQuickMath
          key={guestRunId}
          onFinish={(mode, scoreValue) => {
            setGuestScore(scoreValue)
            setGuestMode(false)
            setShowGuestSignup(true)
            setErrorText('')
            setAuthNotice('')
            setNameInput('')
            setEmailInput('')
            setPasswordInput('')
            setResetPasswordToken('')
            setResetPasswordConfirmInput('')
            clearResetTokenParam()
            setAuthMode(mode === 'login' ? 'login' : 'register_intent')
          }}
          onPlayAgain={() => {
            setGuestRunId((previous) => previous + 1)
            setGuestMode(true)
            setShowGuestSignup(false)
            setAuthNotice('')
            setResetPasswordToken('')
            setResetPasswordConfirmInput('')
            clearResetTokenParam()
            setAuthMode('landing')
          }}
        />
      )
    }

    if (
      showGuestSignup
      || authMode === 'login'
      || authMode === 'register'
      || authMode === 'register_intent'
      || authMode === 'forgot_password'
      || authMode === 'reset_password'
    ) {
      const visibleAuthMode = authMode === 'register_intent' ? 'register' : authMode

      return (
        <AuthPage
          authMode={visibleAuthMode}
          setAuthMode={(nextMode) => {
            setShowGuestSignup(false)
            setErrorText('')
            setAuthNotice('')
            if (nextMode !== 'reset_password') {
              setResetPasswordToken('')
              setResetPasswordConfirmInput('')
              clearResetTokenParam()
            }
            setAuthMode(nextMode)
          }}
          handleAuthSubmit={handleAuthSubmit}
          authLoading={authLoading}
          authNotice={authNotice}
          nameInput={nameInput}
          setNameInput={setNameInput}
          emailInput={emailInput}
          setEmailInput={setEmailInput}
          passwordInput={passwordInput}
          setPasswordInput={setPasswordInput}
          resetPasswordToken={resetPasswordToken}
          setResetPasswordToken={setResetPasswordToken}
          resetPasswordConfirmInput={resetPasswordConfirmInput}
          setResetPasswordConfirmInput={setResetPasswordConfirmInput}
          errorText={errorText}
          activeWarriorsCount={totalPlayers}
          guestScore={guestScore}
        />
      )
    }

    return (
      <LandingPage
        onTryGame={() => {
          setGuestRunId((previous) => previous + 1)
          setGuestMode(true)
          setGuestScore(null)
          setShowGuestSignup(false)
          setErrorText('')
          setAuthNotice('')
          setResetPasswordToken('')
          setResetPasswordConfirmInput('')
          clearResetTokenParam()
          setAuthMode('landing')
        }}
        onLogin={() => {
          setShowGuestSignup(false)
          setErrorText('')
          setAuthNotice('')
          setResetPasswordToken('')
          setResetPasswordConfirmInput('')
          clearResetTokenParam()
          setAuthMode('login')
        }}
        onRegister={() => {
          setShowGuestSignup(false)
          setErrorText('')
          setAuthNotice('')
          setResetPasswordToken('')
          setResetPasswordConfirmInput('')
          clearResetTokenParam()
          setAuthMode('register_intent')
        }}
        activeWarriorsCount={totalPlayers}
      />
    )
  }

  if (activeTab === 'Game' && gameRoute === '/game/war-mode/timer') {
    const selectedMode = WAR_MODE_OPTIONS[warModeSelection]
    const showHonestyPrompt = warModeCompletionReady && !warModeSubmitting && !warModeResult && !warModeHonestyMessage

    return (
      <main className="min-h-[100dvh] w-full bg-black text-white">
        <section className="mx-auto flex min-h-[100dvh] w-full max-w-md lg:max-w-xl flex-col items-center justify-center px-6 text-center">
          <p className="text-[10px] lg:text-xs font-black uppercase tracking-[0.28em] text-zinc-500">
            {selectedMode?.label || branding.copyPack.homeCopy.warModeDefaultLabel}
          </p>

          <p className="mt-6 text-6xl font-black tracking-tight text-white">
            {formatWarModeTimer(warModeRemainingSeconds)}
          </p>

          <p className="mt-4 text-sm font-semibold text-zinc-300">
            {branding.copyPack.homeCopy.warModeActiveSubtext}
          </p>

          {warModeError ? <p className="mt-4 text-xs font-semibold text-red-400">{warModeError}</p> : null}

          {!showHonestyPrompt && !warModeResult && !warModeHonestyMessage ? (
            <button
              type="button"
              onClick={() => setWarModeSurrenderConfirmOpen(true)}
              disabled={warModeSubmitting}
              className="mt-10 rounded-full border border-zinc-700 px-6 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:opacity-60"
            >
              Surrender
            </button>
          ) : null}
        </section>

        {warModeSurrenderConfirmOpen ? (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-zinc-700 bg-zinc-950 p-6 text-center shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Confirm Surrender</p>
              <h3 className="mt-2 text-xl font-black text-white">Are you sure?</h3>
              <p className="mt-2 text-sm font-semibold text-zinc-300">Surrender gives you no XP.</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWarModeSurrenderConfirmOpen(false)}
                  className="rounded-xl border border-zinc-700 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-200 transition hover:bg-zinc-900"
                >
                  Keep Going
                </button>
                <button
                  type="button"
                  onClick={handleSurrenderWarMode}
                  className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-950 transition hover:bg-zinc-200"
                >
                  Surrender
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showHonestyPrompt ? (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-zinc-700 bg-zinc-950 p-6 text-center shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">{branding.copyPack.homeCopy.timerCompleteTitle}</p>
              <h3 className="mt-2 text-2xl font-black text-white">{branding.copyPack.homeCopy.timerCompleteBody}</h3>

              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={submitWarModeCompletion}
                  className="rounded-xl bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-950 transition hover:bg-zinc-200"
                >
                  {branding.copyPack.homeCopy.timerEarnedBtn}
                </button>
                <button
                  type="button"
                  onClick={handleWarModeHonestNoShow}
                  className="rounded-xl border border-zinc-700 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-200 transition hover:bg-zinc-900"
                >
                  {branding.copyPack.homeCopy.timerNoShowBtn}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {warModeHonestyMessage ? (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-zinc-700 bg-zinc-950 p-6 text-center shadow-xl">
              <p className="text-sm font-semibold text-zinc-200">{warModeHonestyMessage}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetWarModeState()
                    navigate('/game/war-mode')
                  }}
                  className="rounded-xl border border-zinc-700 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-200 transition hover:bg-zinc-900"
                >
                  Again
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetWarModeState()
                    navigate('/')
                  }}
                  className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-950 transition hover:bg-zinc-200"
                >
                  Home
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {warModeSubmitting ? (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
            <p className="text-sm font-semibold text-zinc-200">Finalizing your session...</p>
          </div>
        ) : null}

        {warModeResult ? (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-zinc-700 bg-zinc-950 p-6 text-center shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">{branding.copyPack.homeCopy.warModeCompleteTitle}</p>
              <h3 className="mt-2 text-3xl font-black text-white">+{warModeResult.xpAwarded} XP</h3>
              {warModeResult.cappedByDailyLimit ? (
                <p className="mt-3 text-xs font-semibold text-amber-300">Cap reached today ✓</p>
              ) : null}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetWarModeState()
                    navigate('/game/war-mode')
                  }}
                  className="rounded-xl border border-zinc-700 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-200 transition hover:bg-zinc-900"
                >
                  Again
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetWarModeState()
                    navigate('/')
                  }}
                  className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-950 transition hover:bg-zinc-200"
                >
                  Home
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    )
  }

  const navChangeHandler = (tab) => {
    if (tab === 'Home') { navigate('/'); return }
    if (tab === 'Workout') { navigate('/workout'); return }
    if (tab === 'Journal') { navigate('/journal'); return }
    if (tab === 'Leaderboard') { navigate('/leaderboard'); return }
    if (tab === 'Profile') { navigate('/profile') }
  }

  return (
    <ClientShell
      activeTab={activeTab}
      onTabChange={navChangeHandler}
      showNav={!requiresNameSetup && !['Tasks', 'Game', 'vault'].includes(activeTab) && !profileVaultOpen}
      className="space-y-7 relative"
    >
      {shieldEarnedNotice ? (
        <div className="fixed left-1/2 top-4 z-[9999] w-[calc(100%-2rem)] max-w-sm lg:max-w-md -translate-x-1/2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-center shadow-lg">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-800">{shieldEarnedNotice}</p>
        </div>
      ) : null}

      {requiresNameSetup ? (
        <section className="rounded-3xl border border-zinc-200 bg-white px-4 py-5 shadow-sm space-y-4 md:max-w-md md:mx-auto w-full">
          <div className="text-center">
            <h2 className="text-2xl font-black tracking-tight text-zinc-900">{branding.copyPack.homeCopy.setNameTitle}</h2>
            <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {branding.copyPack.homeCopy.setNameDesc}
            </p>
          </div>
          <form className="space-y-3" onSubmit={handleUpdateName}>
            <input
              type="text"
              required
              maxLength={30}
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
            <button
              type="submit"
              disabled={nameUpdating}
              className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60"
            >
              {nameUpdating ? 'Saving...' : 'Save Name'}
            </button>
          </form>
          {errorText ? <p className="text-xs font-semibold text-red-600">{errorText}</p> : null}
        </section>
      ) : null}

      {!requiresNameSetup && (
      activeTab === 'Leaderboard' ? (
        <section className="space-y-4">
          <div className="text-center pt-2">
            <h2 className="text-4xl font-black leading-tight tracking-tighter text-zinc-950">Leaderboard</h2>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-zinc-400">{interpolate(branding.copyPack.leaderboardCopy.header, { count: totalPlayers })}</p>
            <p className="mt-2 text-[10px] lg:text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
              {leaderboardPeriod === 'weekly'
                ? getWeeklyResetCountdownLabel(leaderboardNowMs)
                : leaderboardPeriod === 'all_time'
                  ? branding.copyPack.leaderboardCopy.allTimeTab
                  : branding.copyPack.leaderboardCopy.hallOfLegendsTab}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setLeaderboardPeriod('weekly')}
              className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest transition ${leaderboardPeriod === 'weekly' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setLeaderboardPeriod('all_time')}
              className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest transition ${leaderboardPeriod === 'all_time' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              All-Time
            </button>
            <button
              type="button"
              onClick={() => setLeaderboardPeriod('prestige')}
              className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest transition ${leaderboardPeriod === 'prestige' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              Prestige
            </button>
          </div>

          {leaderboardPeriod === 'prestige' ? (
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 0,
                pointerEvents: 'none',
                overflow: 'hidden',
              }}>
                <PrestigeParticles />
              </div>

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  borderRadius: 18,
                  marginBottom: 20,
                  padding: '18px 20px',
                  background: 'linear-gradient(135deg, #0f0800, #0a0014, #000e18)',
                  border: '0.5px solid #2a1a00',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 180,
                    height: 180,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #f9731611, transparent 70%)',
                    pointerEvents: 'none',
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: -30,
                    left: -30,
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #a855f711, transparent 70%)',
                    pointerEvents: 'none',
                  }} />

                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#52525b' }}>
                      {branding.copyPack.leaderboardCopy.rarestBoard}
                    </p>
                    <p style={{ margin: '0 0 12px', fontSize: 13, color: '#71717a', lineHeight: 1.7 }}>
                      {interpolate(branding.copyPack.leaderboardCopy.rarestBoardDesc, { streakUnitLabelPlural: branding.copyPack.streakUnitLabelPlural })}
                    </p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {Object.entries(PRESTIGE_COLORS).map(([lvl, c]) => (
                        <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.ring, boxShadow: `0 0 6px ${c.glow}` }} />
                          <span style={{ fontSize: 10, color: '#52525b' }}>Ψ{lvl} {c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {prestigeLoading ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      margin: '0 auto 16px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #f97316, #a855f7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: 'spin 1.2s linear infinite',
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#09090b' }} />
                    </div>
                    <p style={{ fontSize: 12, color: '#52525b', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                      Consulting the Hall...
                    </p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                ) : prestigeEntries.length === 0 ? (
                  <PrestigeEmpty currentLevel={level} />
                ) : (
                  <div>
                    {prestigeEntries.length > 0 ? <PrestigeHero entry={prestigeEntries[0]} /> : null}

                    {prestigeEntries.slice(1).map((entry, i) => (
                      <PrestigeCard
                        key={entry.user_id}
                        entry={entry}
                        rank={i + 2}
                        isCurrentUser={entry.is_current_user}
                        onClick={setSelectedPrestigeEntry}
                      />
                    ))}

                    {prestigeMeta.yourRank && !prestigeEntries.find((entry) => entry.is_current_user) ? (
                      <div style={{
                        marginTop: 16,
                        background: '#18181b',
                        border: '0.5px solid #27272a',
                        borderRadius: 12,
                        padding: '12px 16px',
                        textAlign: 'center',
                      }}>
                        <p style={{ margin: 0, fontSize: 12, color: '#52525b' }}>
                          You are ranked <span style={{ color: '#f4f4f5', fontWeight: 700 }}>#{prestigeMeta.yourRank}</span> on the prestige board
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}

                {!prestigeLoading ? (
                  <div style={{
                    marginTop: 24,
                    background: 'linear-gradient(135deg, #0f0800, #0a0014)',
                    border: '0.5px solid #1e1200',
                    borderRadius: 16,
                    padding: '16px 18px',
                    textAlign: 'center',
                  }}>
                    {level >= 20 ? (
                      <>
                        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#fed7aa' }}>
                          {branding.copyPack.leaderboardCopy.prestigeEligible}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: '#52525b' }}>
                          {branding.copyPack.leaderboardCopy.prestigeEligibleDesc}
                        </p>
                      </>
                    ) : (
                      <>
                        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#3f3f46' }}>
                          {branding.copyPack.leaderboardCopy.prestigeNotEligible}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: '#27272a' }}>
                          Current: Level {level} — {Math.max(0, 20 - level)} levels to go
                        </p>
                        <div style={{ marginTop: 10, height: 3, background: '#1c1917', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            borderRadius: 4,
                            background: 'linear-gradient(90deg, #f97316, #a855f7)',
                            width: `${Math.min(100, (level / 20) * 100)}%`,
                            transition: 'width 0.8s ease',
                          }} />
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-zinc-900 bg-zinc-900 p-4 text-white shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-300">Total Players</p>
                    <h3 className="mt-1 text-2xl font-black">{totalPlayers}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-300">Your Rank</p>
                    <h3 className="mt-1 text-2xl font-black">{yourRank ? `#${yourRank}` : '—'}</h3>
                  </div>
                </div>
                {showLeaderboardChaseWarning ? (
                  <p className="mt-3 text-xs font-semibold text-amber-300">
                    ⚠️ {secondPlaceEntry.name || 'A player'} is {leaderboardChaseGap} XP behind you. Don't stop.
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900">{branding.copyPack.leaderboardCopy.warboardTitle}</h3>
                {leaderboardEntries[0] ? (
                  <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                    👑 {leaderboardEntries[0].name || 'Player'}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2.5">
                {leaderboardEntries.map((entry, index) => {
                  const badge = rankMeta(entry.rank)
                  const previousEntry = index > 0 ? leaderboardEntries[index - 1] : null
                  const entryXpValue = leaderboardPeriod === 'weekly'
                    ? (entry.weekly_xp || 0)
                    : (entry.xp || 0)
                  const previousXpValue = previousEntry
                    ? (leaderboardPeriod === 'weekly' ? (previousEntry.weekly_xp || 0) : (previousEntry.xp || 0))
                    : 0
                  const xpGapToAbove = previousEntry ? Math.max(0, previousXpValue - entryXpValue) : 0
                  const isDangerCloseGap = previousEntry ? xpGapToAbove < 50 : false
                  const aboveName = previousEntry?.is_current_user
                    ? 'you'
                    : (previousEntry?.name || 'the player above')
                  const rankChangeValue = leaderboardPeriod === 'weekly' ? (entry.rank_change ?? 0) : null
                  const rankChangeLabel = rankChangeValue === null
                    ? ''
                    : rankChangeValue > 0
                      ? `↑${rankChangeValue}`
                      : rankChangeValue < 0
                        ? `↓${Math.abs(rankChangeValue)}`
                        : '—'
                  const rankChangeClass = rankChangeValue === null
                    ? ''
                    : rankChangeValue > 0
                      ? 'text-emerald-600'
                      : rankChangeValue < 0
                        ? 'text-red-600'
                        : 'text-zinc-400'

                  return (
                    <div
                      key={entry.user_id}
                      className={`rounded-2xl border px-3 py-3 transition ${entry.is_current_user ? 'border-zinc-900 bg-zinc-100' : 'border-zinc-200 bg-white'}`}
                    >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex min-w-[68px] items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${badge.className}`}>
                          <span>#{entry.rank || index + 1}</span>
                          {badge.icon ? <span>{badge.icon}</span> : null}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">
                            {entry.name || 'Player'}
                            {entry.is_current_user ? ' (You)' : ''}
                            {entry.equipped_artifact ? (
                              <span
                                className="ml-1 inline-flex align-middle"
                                title={entry.equipped_artifact.name || 'Equipped artifact'}
                              >
                                <ArtifactIcon
                                  iconKey={entry.equipped_artifact.icon_key}
                                  color={entry.equipped_artifact.color_primary}
                                  size={14}
                                />
                              </span>
                            ) : null}
                          </p>
                          <p className="text-[11px] font-semibold text-zinc-500">
                            <span className={`font-black uppercase ${entry.level >= 30 ? 'text-amber-500' : 'text-zinc-600'}`}>
                              {getLevelTitle(entry.level)}
                            </span>
                            {' '}• 🔥 {entry.streak}
                            {entry.equipped_badge ? (
                              <span className="ml-1">{getBadgeIcon(entry.equipped_badge)}</span>
                            ) : null}
                          </p>
                          {previousEntry ? (
                            <p className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${isDangerCloseGap ? 'text-amber-600' : 'text-zinc-500'}`}>
                              {xpGapToAbove} XP behind {aboveName} ↑
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-zinc-900">{entryXpValue} XP</p>
                        {leaderboardPeriod === 'weekly' ? (
                          <p className={`mt-1 text-xs font-black ${rankChangeClass}`}>{rankChangeLabel}</p>
                        ) : null}
                      </div>
                    </div>
                    </div>
                  )
                })}
                {!isLoading && leaderboardEntries.length === 0 ? (
                  <p className="text-sm text-zinc-500">{leaderboardLoading ? 'Loading leaderboard data..' : 'No leaderboard data yet.'}</p>
                ) : null}
              </div>
            </>
          )}

          {leaderboardPeriod === 'prestige' && selectedPrestigeEntry ? (() => {
            const entry = selectedPrestigeEntry
            const pc = PRESTIGE_COLORS[entry.prestige_level] || PRESTIGE_COLORS[1]
            return (
              <div
                onClick={() => setSelectedPrestigeEntry(null)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 10000,
                  background: 'rgba(0,0,0,0.85)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  padding: 0,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div
                  onClick={(event) => event.stopPropagation()}
                  style={{
                    width: '100%',
                    maxWidth: 440,
                    background: 'linear-gradient(145deg, #0f0a00, #0c0010)',
                    border: `1px solid ${pc.ring}44`,
                    borderRadius: '22px 22px 0 0',
                    padding: '28px 22px 40px',
                    boxShadow: `0 -20px 60px ${pc.glow}`,
                    animation: 'slideUp 0.3s cubic-bezier(0.23,1,0.32,1)',
                  }}
                >
                  <style>{`
                    @keyframes slideUp {
                      from { transform: translateY(100%); }
                      to { transform: translateY(0); }
                    }
                  `}</style>
                  <button
                    onClick={() => setSelectedPrestigeEntry(null)}
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      background: 'transparent',
                      border: 'none',
                      color: '#52525b',
                      cursor: 'pointer',
                      fontSize: 18,
                    }}
                  >
                    ✕
                  </button>

                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{
                      width: 80,
                      height: 80,
                      margin: '0 auto 12px',
                      borderRadius: '50%',
                      background: `radial-gradient(circle at 35% 35%, ${pc.from}55, ${pc.to})`,
                      border: `2px solid ${pc.ring}77`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 0 24px ${pc.glow}`,
                    }}>
                      <PrestigeIcon level={entry.prestige_level} size={44} />
                    </div>
                    <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900, color: '#f4f4f5', fontFamily: "'Georgia', serif" }}>
                      {entry.name || 'Warrior'}
                    </h2>
                    <p style={{ margin: 0, fontSize: 13, color: pc.ring, fontWeight: 700 }}>
                      Ψ{entry.prestige_level} — {PRESTIGE_ARTIFACT_NAMES[entry.prestige_level]}
                    </p>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                    marginBottom: 16,
                  }}>
                    {[
                      { label: 'Prestige', val: `Ψ${entry.prestige_level}` },
                      { label: 'Level', val: entry.level },
                      { label: 'Streak', val: `${entry.streak}d` },
                      { label: 'Total XP', val: (entry.total_xp || entry.xp || 0).toLocaleString() },
                      { label: 'Season', val: entry.season_label || '—' },
                      { label: 'Artifact', val: pc.label },
                    ].map(({ label, val }) => (
                      <div key={label} style={{
                        background: '#18181b',
                        border: '0.5px solid #27272a',
                        borderRadius: 10,
                        padding: '10px 12px',
                        textAlign: 'center',
                      }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#f4f4f5' }}>{val}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#52525b' }}>{label}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    background: '#0c0a09',
                    border: `0.5px solid ${pc.ring}22`,
                    borderRadius: 12,
                    padding: '12px 14px',
                    textAlign: 'center',
                  }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#52525b', lineHeight: 1.7, fontStyle: 'italic' }}>
                      "{PRESTIGE_ARTIFACT_NAMES[entry.prestige_level] ? `Bearer of ${PRESTIGE_ARTIFACT_NAMES[entry.prestige_level]}.` : ''} This warrior burned their progression and chose legacy over comfort."
                    </p>
                  </div>
                </div>
              </div>
            )
          })() : null}
        </section>
      ) : activeTab === 'Journal' ? (
        <JournalPage
          authedFetch={authedFetch}
          onJournalSaved={() => {
            void refreshDailyChallengeStatus()
          }}
          onXpEarned={(xpAmount, totalXp, newLevel, newStreak) => {
            setXp(totalXp)
            setLevel(newLevel)
            setStreakDays(newStreak)
            setUser((current) => (
              current
                ? { ...current, xp: totalXp, level: newLevel, streak: newStreak }
                : current
            ))
          }}
        />
      ) : activeTab === 'Workout' ? (
        <WorkoutPage
          authedFetch={authedFetch}
          onXpEarned={(xpAmount, totalXp, newLevel, newStreak) => {
            setXp(totalXp)
            setLevel(newLevel)
            setStreakDays(newStreak)
            setUser((current) => (
              current
                ? { ...current, xp: totalXp, level: newLevel, streak: newStreak }
                : current
            ))
          }}
        />
      ) : activeTab === 'Game' ? (
        gameRoute === '/game/war-mode' ? (
          <section className="space-y-5">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100"
            >
              ← Back
            </button>

            <div className="rounded-3xl border border-zinc-900 bg-zinc-900 p-5 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">War Mode</p>
                <button
                  type="button"
                  onClick={() => setShowWarModeInfo(true)}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-600 text-[10px] font-black text-zinc-400 transition hover:border-zinc-400 hover:text-zinc-200"
                  aria-label="War Mode info"
                >
                  i
                </button>
              </div>
              <h2 className="mt-2 text-3xl font-black tracking-tight">{branding.copyPack.warModeEntryCopy.title}</h2>
              <p className="mt-2 text-sm font-semibold text-zinc-300">
                {branding.copyPack.warModeEntryCopy.subtitle}
              </p>
            </div>

            <div className="space-y-3">
              {Object.entries(WAR_MODE_OPTIONS).map(([key, option]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleStartWarMode(key)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-zinc-400"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{option.minutes} Minutes</p>
                  <div className="mt-1 flex items-center justify-between">
                    <h3 className="text-xl font-black text-zinc-950">{option.title}</h3>
                    <p className="text-sm font-black text-zinc-900">+{option.uiXp} XP</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="px-1 pt-1">
              <p className="text-xs font-semibold text-zinc-600">
                {branding.copyPack.warModeEntryCopy.integrityNote}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {branding.copyPack.warModeEntryCopy.lockNote}
              </p>
            </div>

            {warModeError ? <p className="text-xs font-semibold text-red-600">{warModeError}</p> : null}
          </section>
        ) : gameRoute === '/game/quick-math' ? (
          <section className="space-y-4">
            <button
              type="button"
              onClick={() => navigate('/game')}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100"
            >
              ← Back
            </button>

            <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-center">
              <h2 className="text-2xl font-black tracking-tight text-zinc-950">Quick Math</h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Solve as many as you can in 30 seconds
              </p>
            </div>

            {!gameStarted && !gameResult && !gameSubmitting ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-center space-y-4">
                <p className="text-sm font-semibold text-zinc-600">Beat your high score and farm clean XP.</p>
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
                >
                  Start Quick Math
                </button>
              </div>
            ) : null}

            {gameSubmitting && !gameResult ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-center space-y-2">
                <p className="text-base font-semibold text-zinc-900">Submitting results...</p>
                <p className="text-sm text-zinc-500">Storing your score and XP.</p>
              </div>
            ) : null}

            {gameStarted && currentQuestion ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-zinc-700">Time: {timeLeft}s</p>
                  <p className="text-sm font-bold text-zinc-700">Score: {score}</p>
                </div>

                <div className="text-center">
                  <p className="text-3xl font-black tracking-tight text-zinc-950">
                    {currentQuestion.num1} {currentQuestion.operator} {currentQuestion.num2}
                  </p>
                </div>

                <form onSubmit={handleSubmitAnswer} className="space-y-3">
                  <input
                    type="number"
                    value={userAnswer}
                    onChange={(event) => setUserAnswer(event.target.value)}
                    autoFocus
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                    placeholder="Your answer"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
                  >
                    Submit
                  </button>
                </form>
              </div>
            ) : null}

            {gameResult ? (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl text-center space-y-3">
                  <h3 className="text-2xl font-black text-zinc-950">Round Complete</h3>
                  <p className="text-sm font-semibold text-zinc-600">Score: {gameResult.score}</p>
                  <p className="text-sm font-semibold text-zinc-600">XP earned: +{Math.floor(animatedGameXp)}</p>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Best: {bestGameScore}</p>
                  {gameResult.capped_by_daily_limit ? (
                    <p className="text-xs font-semibold text-amber-600">Cap reached today ✓</p>
                  ) : null}
                  <div className="pt-2 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleStartGame}
                      disabled={gameSubmitting}
                      className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60"
                    >
                      {gameSubmitting ? 'Submitting...' : 'Play Again'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/game')}
                      className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-900 transition hover:bg-zinc-100"
                    >
                      Main Menu
                    </button>
                  </div>
                  {user ? (
                    <ChallengeCreateButton
                      gameType="quick_math"
                      score={gameResult.score}
                      metric={gameResult.score}
                      authedFetch={authedFetch}
                      className="pt-1"
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        ) : gameRoute === '/game/focus-tap' ? (
          <FocusTapGame
            onMainMenu={() => handleGameMainMenu('/game/focus-tap')}
            onGameStart={handleFocusTapStart}
            onGameFinished={handleFocusTapFinish}
            submitting={focusTapSubmitting}
            awardedXp={focusTapXpAwarded}
            resultMeta={focusTapResult}
            errorText={focusTapError}
            challengeAction={user ? (
              <ChallengeCreateButton
                gameType="focus_tap"
                score={1}
                metric={focusTapResult?.metric ?? null}
                authedFetch={authedFetch}
              />
            ) : null}
          />
        ) : gameRoute === '/game/reaction-tap' ? (
          <ReactionTapGame
            onMainMenu={() => handleGameMainMenu('/game/reaction-tap')}
            onGameStart={handleReactionTapStart}
            onGameFinished={handleReactionTapFinish}
            submitting={reactionTapSubmitting}
            awardedXp={reactionTapXpAwarded}
            resultMeta={reactionTapResult}
            errorText={reactionTapError}
            gameRemainingEntry={gameRemainingXpByType?.reaction_tap || null}
            challengeAction={user ? (
              <ChallengeCreateButton
                gameType="reaction_tap"
                score={1}
                metric={reactionTapResult?.metric ?? null}
                authedFetch={authedFetch}
              />
            ) : null}
          />
        ) : gameRoute === '/game/number-recall' ? (
          <NumberRecallGame
            onMainMenu={() => handleGameMainMenu('/game/number-recall')}
            onGameStart={handleNumberRecallStart}
            onGameFinished={handleNumberRecallFinish}
            submitting={numberRecallSubmitting}
            awardedXp={numberRecallXpAwarded}
            resultMeta={numberRecallResult}
            errorText={numberRecallError}
            challengeAction={user ? (
              <ChallengeCreateButton
                gameType="number_recall"
                score={1}
                metric={numberRecallResult?.metric ?? null}
                authedFetch={authedFetch}
              />
            ) : null}
          />
        ) : gameRoute === '/game/color-count-focus' ? (
          <ColorCountFocusGame
            onMainMenu={() => handleGameMainMenu('/game/color-count-focus')}
            onGameStart={handleColorCountStart}
            onGameFinished={handleColorCountFinish}
            submitting={colorCountSubmitting}
            awardedXp={colorCountXpAwarded}
            resultMeta={colorCountResult}
            errorText={colorCountError}
            challengeAction={user ? (
              <ChallengeCreateButton
                gameType="color_count_focus"
                score={1}
                metric={colorCountResult?.metric ?? null}
                authedFetch={authedFetch}
              />
            ) : null}
          />
        ) : gameRoute === '/game/speed-pattern' ? (
          <SpeedPatternGame
            onMainMenu={() => handleGameMainMenu('/game/speed-pattern')}
            onGameStart={handleSpeedPatternStart}
            onGameFinished={handleSpeedPatternFinish}
            submitting={speedPatternSubmitting}
            awardedXp={speedPatternXpAwarded}
            resultMeta={speedPatternResult}
            errorText={speedPatternError}
            challengeAction={user ? (
              <ChallengeCreateButton
                gameType="speed_pattern"
                score={1}
                metric={speedPatternResult?.metric ?? null}
                authedFetch={authedFetch}
              />
            ) : null}
          />
        ) : gameRoute === '/game/reverse-order' ? (
          <ReverseOrderGame
            onMainMenu={() => handleGameMainMenu('/game/reverse-order')}
            onGameStart={handleReverseOrderStart}
            onGameFinished={handleReverseOrderFinish}
            submitting={reverseOrderSubmitting}
            awardedXp={reverseOrderXpAwarded}
            resultMeta={reverseOrderResult}
            errorText={reverseOrderError}
            challengeAction={user ? (
              <ChallengeCreateButton
                gameType="reverse_order"
                score={1}
                metric={reverseOrderResult?.metric ?? null}
                authedFetch={authedFetch}
              />
            ) : null}
          />
        ) : gameRoute === '/game/number-stack' ? (
          <NumberStackGame
            onMainMenu={() => handleGameMainMenu('/game/number-stack')}
            onGameStart={handleNumberStackStart}
            onGameFinished={handleNumberStackFinish}
            submitting={numberStackSubmitting}
            awardedXp={numberStackXpAwarded}
            resultMeta={numberStackResult}
            errorText={numberStackError}
            challengeAction={user ? (
              <ChallengeCreateButton
                gameType="number_stack"
                score={1}
                metric={numberStackResult?.metric ?? null}
                authedFetch={authedFetch}
              />
            ) : null}
          />
        ) : gameRoute === '/game/pattern-sequence' ? (
          <PatternSequenceGame
            onMainMenu={() => handleGameMainMenu('/game/pattern-sequence')}
            onGameStart={handlePatternSeqStart}
            onGameFinished={handlePatternSeqFinish}
            submitting={patternSeqSubmitting}
            awardedXp={patternSeqXpAwarded}
            resultMeta={patternSeqResult}
            errorText={patternSeqError}
            challengeAction={user ? (
              <ChallengeCreateButton
                gameType="pattern_sequence"
                score={1}
                metric={patternSeqResult?.metric ?? null}
                authedFetch={authedFetch}
              />
            ) : null}
          />
        ) : gameRoute === '/game/logic-grid' ? (
          <LogicGridGame
            onMainMenu={() => handleGameMainMenu('/game/logic-grid')}
            onGameStart={handleLogicGridStart}
            onGameFinished={handleLogicGridFinish}
            submitting={logicGridSubmitting}
            awardedXp={logicGridXpAwarded}
            resultMeta={logicGridResult}
            errorText={logicGridError}
            challengePuzzleId={logicGridChallengePuzzleId}
            challengeAction={user ? (
              <ChallengeCreateButton
                gameType="logic_grid"
                score={1}
                metric={logicGridResult?.metric ?? null}
                seed={logicGridResult?.puzzleId ? { puzzle_id: logicGridResult.puzzleId } : null}
                authedFetch={authedFetch}
              />
            ) : null}
          />
        ) : (
          <GameHubPage
            onBack={() => navigate('/')}
            onNavigate={navigate}
            dailyTrainingGameLabel={dailyTrainingGameLabel}
            lastTrainingResult={lastTrainingResult}
            gameRemainingXpByType={gameRemainingXpByType}
            user={user}
            streakDays={streakDays}
            level={level}
            xp={xp}
          />
        )
      ) : activeTab === 'Profile' ? (
        <ProfilePage
          user={user}
          userName={userName}
          userEmail={userEmail}
          level={level}
          xp={xp}
          streakDays={streakDays}
          streakShields={streakShields}
          equippedBadge={equippedBadge}
          onToggleBadge={(badgeId, earned) => {
            void handleToggleBadge(badgeId, earned)
          }}
          onBack={() => navigate('/')}
          onLogout={handleLogout}
          onEditName={handleProfileEditName}
          isEditingName={isProfileEditingName}
          nameInput={nameInput}
          setNameInput={setNameInput}
          onSaveName={handleProfileSaveName}
          nameUpdating={nameUpdating}
          onForgotPassword={() => {
            const rememberedEmail = userEmail || user?.email || ''
            handleLogout()
            setEmailInput(rememberedEmail)
            setAuthMode('forgot_password')
          }}
          authedFetch={authedFetch}
          focusCategory={user?.focus_category}
          onVaultVisibilityChange={setProfileVaultOpen}
        />
      ) : activeTab === 'Tasks' ? (
        showFocusPicker || !user?.focus_category ? (
          <section className="space-y-5 pt-2">
            <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Personalize</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950">
                What are you focusing on right now?
              </h2>
              <p className="mt-1 text-sm font-semibold text-zinc-500">
                Your daily tasks will be tailored to your goal.
              </p>
            </div>

            <div className="space-y-3">
              {FOCUS_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    void handleSelectFocus(opt.key)
                  }}
                  disabled={focusUpdating}
                  className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-zinc-900 hover:shadow-md disabled:opacity-60"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{opt.icon}</span>
                    <div>
                      <p className="text-base font-black text-zinc-950">{opt.label}</p>
                      <p className="mt-0.5 text-xs font-semibold text-zinc-500">{opt.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {focusUpdating ? (
              <p className="text-center text-xs font-semibold text-zinc-400">Updating your tasks...</p>
            ) : null}
            {errorText ? <p className="text-xs font-semibold text-red-600">{errorText}</p> : null}
          </section>
        ) : (
          <>
            <TasksPage
              onBack={() => navigate('/')}
              onChangeFocus={() => setShowFocusPicker(true)}
              onAddTask={() => setShowAddTask(true)}
              focusCategory={user?.focus_category}
              focusOptions={FOCUS_OPTIONS}
              completedCount={completedCount}
              tasks={tasks}
              isLoading={isLoading}
              onCompleteTask={handleAskComplete}
              onDeleteTask={handleDeleteTask}
              justCompletedId={justCompletedId}
              streakDays={streakDays}
              dailyStatusMessage={dailyStatusMessage}
              errorText={errorText}
              streakShields={streakShields}
              dailyChallenge={dailyChallenge}
            />
            {showAddTask && (
              <div className="fixed inset-0 z-[60] bg-black/40" />
            )}
            <AddTaskModal
              open={showAddTask}
              onClose={() => setShowAddTask(false)}
              authedFetch={authedFetch}
              focusCategory={user?.focus_category}
              xpEligibleCount={Math.max(0, 5 - completedCount)}
              onTaskAdded={(newTask) => {
                setTasks((prev) => [
                  ...prev,
                  {
                    id: newTask.id,
                    name: newTask.task_title,
                    xp: newTask.task_xp,
                    completed: newTask.completed,
                    category: newTask.task_category || 'general',
                    is_custom: Boolean(newTask.is_custom),
                  },
                ])
                setShowAddTask(false)
              }}
            />
          </>
        )
      ) : (
        <div className="w-full">
        <section className="space-y-6 md:space-y-8">
          <div className="flex items-center justify-between px-1 pt-2">
            <div>
              <p className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
              <h1 className="mt-0.5 text-lg lg:text-xl font-black text-zinc-900">
                {homeGreetingFirstName ? `Welcome back, ${homeGreetingFirstName}.` : branding.copyPack.homeCopy.greetingFallback}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/weekly-report')}
                className="relative flex h-11 w-11 flex-col items-center justify-center rounded-2xl border border-zinc-300 bg-white shadow-sm transition hover:border-zinc-500"
                aria-label="Weekly Report"
              >
                <span className="text-base">📊</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDailyChallenge(true)}
                className="relative flex h-11 w-11 flex-col items-center justify-center rounded-2xl border border-zinc-300 bg-white shadow-sm transition hover:border-zinc-500"
                aria-label="Daily Challenge"
              >
                <span className="text-base">⚔️</span>
                {dailyChallenge && !dailyChallenge.completed ? (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#f8f6f1] bg-red-500" />
                ) : null}
                {dailyChallenge?.completed ? (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#f8f6f1] bg-emerald-500" />
                ) : null}
              </button>
            </div>
          </div>

          {showShieldUsedBanner ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">{branding.copyPack.shieldModalCopy.usedTitle}</p>
              <p className="mt-1 text-sm font-semibold text-amber-900">{interpolate(branding.copyPack.shieldModalCopy.usedBody, { days: streakDays })}</p>
              <p className="mt-1 text-xs font-semibold text-amber-800">
                {interpolate(branding.copyPack.shieldModalCopy.usedFooter, { count: streakShields })}
              </p>
              <button
                type="button"
                onClick={handleDismissShieldBanner}
                className="mt-3 rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
              >
                Understood
              </button>
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            <div className="p-5 rounded-2xl bg-zinc-900 shadow-xl border border-zinc-800 flex flex-col justify-center">
              <p className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">{branding.copyPack.warRoomLabel}</p>
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-2">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Level {level}</h2>
                    <p className={`mt-0.5 text-xs font-black uppercase tracking-[0.18em] ${level >= 30 ? 'text-amber-400' : 'text-zinc-400'}`}>
                      {getLevelTitle(level)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLevelInfo(true)}
                    className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-zinc-600 text-[10px] font-black text-zinc-400 transition hover:border-zinc-400"
                    aria-label="Level info"
                  >
                    i
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDisciplineBeast(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-600 text-[12px] text-zinc-200 transition hover:border-zinc-400 hover:text-white"
                    aria-label="Show Discipline Beast"
                  >
                    🐉
                  </button>
                  <span className={`text-sm px-3 py-1 rounded-full flex items-center gap-1 hover:scale-[1.02] transition-all duration-200 ${
                    streakCompletedToday
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                      : 'bg-zinc-700 text-zinc-200'
                  }`}>
                    🔥 {streakDays} day streak
                  </span>
                </div>
              </div>

              <div className="mt-4 w-full bg-zinc-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${profileProgressPercent}%` }}
                />
              </div>

              <div className="flex justify-between mt-2 text-xs text-zinc-300">
                <span>{profileProgressXp} XP</span>
                <span>{profileNeededXp} XP</span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <p className="text-xs font-semibold text-zinc-300">
                  {streakShields > 0
                    ? interpolate(branding.copyPack.shieldBannerCopy.title, { count: streakShields })
                    : branding.copyPack.shieldBannerCopy.noShields}
                </p>
                <button
                  type="button"
                  onClick={() => setShowShieldInfo(true)}
                  className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-zinc-600 text-[10px] font-black text-zinc-400 transition hover:border-zinc-400"
                  aria-label="Shield info"
                >
                  i
                </button>
              </div>
            </div>

            <section className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-5 shadow-xl flex flex-col justify-center">
              <p className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-zinc-500">{branding.copyPack.warDoctrineLabel}</p>
              <p className="mt-3 text-lg font-black leading-snug text-white">{dailyWisdom}</p>
              <p className="mt-2 text-[11px] lg:text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{branding.copyPack.homeCopy.wisdomFooter}</p>
            </section>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 md:items-start">
            <div className="grid grid-cols-2 gap-4">
            <div
              onClick={() => navigate('/tasks')}
              className="px-4 pt-4 pb-5 rounded-2xl bg-white border border-zinc-900 shadow-[0_10px_24px_rgba(0,0,0,0.12)] cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_14px_28px_rgba(0,0,0,0.18)]"
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  navigate('/tasks')
                }
              }}
            >
              <h3 className="font-semibold text-base">Daily Tasks</h3>
              <p className="text-xs text-gray-500 mt-1">Complete your daily goals</p>
              <p className={`text-sm font-semibold mt-3 ${taskCounterColorClass}`}>{homeTaskCompleted}/{homeTaskTotal} completed</p>
            </div>

            <div
              onClick={() => navigate('/game')}
              className="px-4 pt-4 pb-5 rounded-2xl bg-white border border-zinc-900 shadow-[0_10px_24px_rgba(0,0,0,0.12)] cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_14px_28px_rgba(0,0,0,0.18)]"
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  navigate('/game')
                }
              }}
            >
              <h3 className="font-semibold text-base">Training Hub</h3>
              <p className="text-xs text-gray-500 mt-1">{branding.copyPack.homeCopy.trainingHubSubtext}</p>
              <p className="text-[13px] font-semibold mt-3 text-blue-600 whitespace-nowrap">{dailyTrainingGameLabel}</p>
            </div>
            </div>
            
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => navigate('/game/war-mode')}
                className="w-full rounded-2xl border border-zinc-900 bg-white px-5 py-4 text-left text-zinc-900 shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition-all duration-200 hover:bg-zinc-50 hover:shadow-[0_14px_28px_rgba(0,0,0,0.18)]"
              >
                <p className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-zinc-500">{branding.copyPack.homeCopy.warRoomTab}</p>
                <p className="mt-1 text-xl font-black tracking-tight">{branding.copyPack.warModeEntryCopy.title}</p>
                <p className="mt-1 text-xs font-semibold text-zinc-700">{branding.copyPack.homeCopy.warModeSubtext}</p>
              </button>

              <button
                type="button"
                onClick={() => setShowChallengeDashboard(true)}
                className="w-full rounded-2xl border border-zinc-900 bg-white px-5 py-4 text-left text-zinc-900 shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition-all duration-200 hover:bg-zinc-50 hover:shadow-[0_14px_28px_rgba(0,0,0,0.18)]"
              >
                <p className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-zinc-500">{branding.copyPack.homeCopy.duelsLabel}</p>
                <p className="mt-1 text-xl font-black tracking-tight">{branding.copyPack.homeCopy.duelsSubLabel}</p>
                <p className="mt-1 text-xs font-semibold text-zinc-700">{branding.copyPack.homeCopy.duelsDesc}</p>
              </button>
            </div>
          </div>

          <p className="text-sm font-bold text-zinc-800 px-1">{homeProgressContext}</p>

          {errorText ? <p className="text-xs font-semibold text-red-600">{errorText}</p> : null}
        </section>
        </div>
      ))}

      {showChallengeDashboard && user ? (
        <MyChallengeDashboard
          authedFetch={authedFetch}
          onClose={() => setShowChallengeDashboard(false)}
        />
      ) : null}



      <ConfirmationModal
        open={Boolean(selectedTask)}
        taskName={selectedTask?.name || ''}
        onYes={handleConfirmYes}
        onNo={handleConfirmNo}
        onClose={() => setSelectedTask(null)}
      />

      {showDisciplineBeast ? (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 p-4 pb-6"
          onClick={() => setShowDisciplineBeast(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl"
            style={{ animation: 'beastSlideUp 260ms ease-out' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{branding.copyPack.homeCopy.warRoomTab}</p>
                <h3 className="mt-1 text-lg font-black text-white">{branding.copyPack.homeCopy.disciplineBeastTab}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDisciplineBeast(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 transition hover:border-zinc-500 hover:text-white"
                aria-label="Close Discipline Beast"
              >
                ✕
              </button>
            </div>
            <DisciplineBeast level={level} streak={streakDays} xp={xp} />
            <style>{`
              @keyframes beastSlideUp {
                from { transform: translateY(24px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
            `}</style>
          </div>
        </div>
      ) : null}

      {showLevelUp && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-80 rounded-3xl border border-zinc-700 bg-zinc-950 p-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
              {branding.copyPack.levelUpCopy.title}
            </p>
            <p className="mt-3 text-5xl">⚔️</p>
            <h2 className={`mt-3 text-2xl font-black tracking-tight ${level >= 30 ? 'text-amber-400' : 'text-white'}`}>
              {getLevelTitle(level)}
            </h2>
            <p className="mt-1 text-sm font-semibold text-zinc-400">
              Level {level} reached.
            </p>
            <p className="mt-3 text-xs font-semibold text-zinc-500">
              {level >= 30
                ? interpolate(branding.copyPack.levelUpCopy.maxLevelReached, { appName: branding.appName })
                : level >= 20
                  ? branding.copyPack.levelUpCopy.level20Plus
                  : level >= 10
                    ? branding.copyPack.levelUpCopy.level10Plus
                  : branding.copyPack.levelUpCopy.default}
            </p>
            <button
              onClick={() => setShowLevelUp(false)}
              className="mt-5 w-full rounded-xl bg-white p-3 text-xs font-black uppercase tracking-widest text-zinc-950 transition hover:bg-zinc-200"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {showInstallPopup ? (() => {
        const { isInAppBrowser, isIOS, isAndroid } = getInstallContext()
        const isManualInstall = isInAppBrowser || (!deferredPrompt && (isIOS || isAndroid))

        if (isManualInstall) {
          return (
            <div className="fixed bottom-6 left-1/2 z-50 w-[88%] max-w-[360px] -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl">
              <h3 className="text-base font-black text-zinc-900">{interpolate(branding.copyPack.installPromptTitle, { appName: branding.appName })}</h3>
              <p className="mt-1 text-xs font-semibold text-zinc-500">
                Open this page in your browser to install the app.
              </p>

              {isAndroid ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-400">How to install</p>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-black text-zinc-600">1</span>
                    <p className="text-xs font-semibold text-zinc-700">
                      Tap the <span className="font-black">...</span> menu in the top right corner of Instagram
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-black text-zinc-600">2</span>
                    <p className="text-xs font-semibold text-zinc-700">
                      Tap <span className="font-black">Open in Chrome</span> or <span className="font-black">Open in browser</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-black text-zinc-600">3</span>
                    <p className="text-xs font-semibold text-zinc-700">
                      Tap <span className="font-black">Add to Home Screen</span> from the browser menu
                    </p>
                  </div>
                </div>
              ) : null}

              {isIOS ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-400">How to install on iPhone</p>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-black text-zinc-600">1</span>
                    <p className="text-xs font-semibold text-zinc-700">
                      Tap <span className="font-black">...</span> in Instagram and choose <span className="font-black">Open in Safari</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-black text-zinc-600">2</span>
                    <p className="text-xs font-semibold text-zinc-700">
                      Tap the <span className="font-black">Share</span> button in Safari
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-black text-zinc-600">3</span>
                    <p className="text-xs font-semibold text-zinc-700">
                      Tap <span className="font-black">Add to Home Screen</span>
                    </p>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setShowInstallPopup(false)}
                className="mt-4 w-full rounded-lg py-2 text-sm font-semibold text-zinc-500 transition hover:bg-zinc-100"
              >
                Maybe later
              </button>
            </div>
          )
        }

        return (
          <div className="fixed bottom-6 left-1/2 z-50 w-[88%] max-w-[360px] -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-900">{interpolate(branding.copyPack.installPromptTitle, { appName: branding.appName })}</h3>
            <p className="mt-1 text-sm text-zinc-500">Train your mind daily. Stay consistent.</p>

            <button
              type="button"
              onClick={handleInstallClick}
              className="mt-4 w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
            >
              Install
            </button>
            <button
              type="button"
              onClick={() => setShowInstallPopup(false)}
              className="mt-2 w-full rounded-lg py-2 text-sm font-semibold text-zinc-500 transition hover:bg-zinc-100"
            >
              Not now
            </button>
          </div>
        )
      })() : null}

      {showShieldInfo ? (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">{branding.copyPack.shieldModalCopy.howItWorks}</p>
                <h3 className="mt-1 text-xl font-black text-white">{branding.copyPack.shieldModalCopy.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShieldInfo(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 transition hover:border-zinc-500 hover:text-white"
                aria-label="Close shield info"
              >
                ✕
              </button>
            </div>

            <p className="text-sm font-semibold leading-relaxed text-zinc-200">
              {branding.copyPack.shieldModalCopy.description}
            </p>

            <p className="mt-3 text-xs font-semibold leading-relaxed text-zinc-400" dangerouslySetInnerHTML={{ __html: branding.copyPack.shieldModalCopy.warning }} />

            <div className="my-5 h-px bg-zinc-800" />

            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{branding.copyPack.shieldModalCopy.earnTitle}</p>
            <div className="space-y-3">
              {branding.copyPack.shieldModalCopy.earnMethods.map(({ icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg leading-none">{icon}</span>
                  <div>
                    <p className="text-xs font-black text-white">{label}</p>
                    <p className="mt-0.5 text-xs font-semibold text-zinc-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="my-5 h-px bg-zinc-800" />

            <p className="text-xs font-semibold leading-relaxed text-zinc-400" dangerouslySetInnerHTML={{ __html: branding.copyPack.shieldModalCopy.maxShields }} />
            <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-400">{branding.copyPack.shieldModalCopy.integrity}</p>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
              <p className="text-xs font-bold text-zinc-300">Your Shields</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  {Array.from({ length: MAX_STREAK_SHIELDS }).map((_, i) => (
                    i < streakShields ? (
                      <span
                        key={i}
                        className="inline-flex h-6 w-6 items-center justify-center text-base leading-none"
                        aria-label="filled shield"
                      >
                        🛡️
                      </span>
                    ) : (
                      <span
                        key={i}
                        className="inline-block h-5 w-5 rounded-full border-2 border-zinc-600 bg-transparent"
                        aria-label="empty shield slot"
                      />
                    )
                  ))}
                </div>
                <p className="text-xs font-black text-zinc-300">{streakShields} / {MAX_STREAK_SHIELDS}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowShieldInfo(false)}
              className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-950 transition hover:bg-zinc-200"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}

      {showLevelInfo ? (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
                  Progression
                </p>
                <h3 className="mt-1 text-xl font-black text-white">⚔️ Ranks</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLevelInfo(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 transition hover:border-zinc-500 hover:text-white"
                aria-label="Close level info"
              >
                ✕
              </button>
            </div>

            <p className="text-sm font-semibold leading-relaxed text-zinc-200">
              Every XP you earn advances your rank. Ranks are earned - not given.
            </p>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-400">
              XP is gained through daily tasks, training games, War Mode, and your journal. The more consistent you are, the faster you climb.
            </p>

            <div className="my-5 h-px bg-zinc-800" />

            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              All Ranks
            </p>

            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {Object.entries(LEVEL_TITLES).map(([lvl, title]) => {
                const numLevel = Number(lvl)
                const isCurrent = numLevel === level
                const isAchieved = numLevel < level
                const isMaxRank = numLevel === 30

                return (
                  <div
                    key={lvl}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition ${
                      isCurrent
                        ? 'border border-white/30 bg-white/10'
                        : isAchieved
                          ? 'border border-zinc-800 bg-zinc-900/50'
                          : 'border border-zinc-800/50 bg-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-12 text-[10px] font-black ${
                        isAchieved ? 'text-zinc-500' : isCurrent ? 'text-zinc-300' : 'text-zinc-600'
                      }`}>
                        LVL {lvl}
                      </span>
                      <span className={`text-sm font-black uppercase tracking-[0.1em] ${
                        isMaxRank
                          ? isCurrent || isAchieved ? 'text-amber-400' : 'text-amber-700'
                          : isCurrent
                            ? 'text-white'
                            : isAchieved
                              ? 'text-zinc-400'
                              : 'text-zinc-600'
                      }`}>
                        {title}
                      </span>
                    </div>
                    <span className="text-xs">
                      {isAchieved ? '✓' : isCurrent ? '◉' : ''}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="my-5 h-px bg-zinc-800" />

            <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Your Rank</p>
                <p className={`mt-0.5 text-sm font-black uppercase tracking-[0.1em] ${
                  level >= 30 ? 'text-amber-400' : 'text-white'
                }`}>
                  {getLevelTitle(level)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Level</p>
                <p className="mt-0.5 text-sm font-black text-white">{level}</p>
              </div>
            </div>

            {level < 30 ? (
              <p className="mt-3 text-center text-xs font-semibold text-zinc-500">
                Next rank:{' '}
                <span className="font-black uppercase text-zinc-300">
                  {getLevelTitle(level + 1)}
                </span>
                {' '}at Level {level + 1}
              </p>
            ) : (
              <p className="mt-3 text-center text-xs font-semibold text-amber-600">
                {interpolate(branding.copyPack.levelUpCopy.maxLevelInfo, { appName: branding.appName })}
              </p>
            )}

            <button
              type="button"
              onClick={() => setShowLevelInfo(false)}
              className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-950 transition hover:bg-zinc-200"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}

      {showWarModeInfo && activeTab === 'Game' && gameRoute === '/game/war-mode' ? (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
                  {branding.copyPack.warModeModalCopy.focusMode}
                </p>
                <h3 className="mt-1 text-xl font-black text-white">{branding.copyPack.warModeModalCopy.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWarModeInfo(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 transition hover:border-zinc-500 hover:text-white"
                aria-label="Close war mode info"
              >
                ✕
              </button>
            </div>

            <p className="text-sm font-semibold leading-relaxed text-zinc-200">
              {branding.copyPack.warModeModalCopy.description}
            </p>
            <p className="mt-3 text-xs font-semibold leading-relaxed text-zinc-400">
              {interpolate(branding.copyPack.warModeModalCopy.subtext, { appName: branding.appName })}
            </p>

            <div className="my-5 h-px bg-zinc-800" />

            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              {branding.copyPack.warModeModalCopy.sessionsTitle}
            </p>
            <div className="space-y-2">
              {branding.copyPack.warModeModalCopy.sessions.map(({ label, duration, xp: warXp, desc }) => (
                <div key={label} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5">
                  <div>
                    <p className="text-xs font-black text-white">{label}
                      <span className="ml-2 text-[10px] font-semibold text-zinc-500">{duration}</span>
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-zinc-400">{desc}</p>
                  </div>
                  <p className="text-xs font-black text-zinc-300">{warXp}</p>
                </div>
              ))}
            </div>

            <div className="my-5 h-px bg-zinc-800" />

            <p className="text-xs font-semibold leading-relaxed text-zinc-400" dangerouslySetInnerHTML={{ __html: branding.copyPack.warModeModalCopy.honourSystem }} />

            <button
              type="button"
              onClick={() => setShowWarModeInfo(false)}
              className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-950 transition hover:bg-zinc-200"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}

      {showDailyChallenge && dailyChallenge ? (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl">

            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
                  Today's Challenge
                </p>
                <h3 className="mt-1 text-xl font-black text-white">{dailyChallengeTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDailyChallenge(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 transition hover:border-zinc-500 hover:text-white"
                aria-label="Close daily challenge"
              >
                ✕
              </button>
            </div>

            <p className="text-sm font-semibold leading-relaxed text-zinc-200">
              {activeDailyChallenge?.description || 'Complete the challenge to claim your XP.'}
            </p>

            <div className="my-5 h-px bg-zinc-800" />

            <div className="mb-5 space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Progress</p>
                <p className="text-xs font-black text-zinc-300">
                  {dailyChallengeCompleted
                    ? <span className="text-emerald-400">✓ Done</span>
                    : `${Math.min(dailyChallengeProgressCurrent, dailyChallengeProgressTarget)} / ${dailyChallengeProgressTarget}`}
                </p>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${dailyChallengeCompleted ? 'bg-emerald-500' : 'bg-white'}`}
                  style={{ width: `${dailyChallengeProgressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Reward</p>
                <p className="text-lg font-black text-white">+{dailyChallengeRewardXp} XP</p>
              </div>
            </div>

            {dailyChallengeCompleted ? (
              <div className="rounded-xl border border-emerald-800 bg-emerald-950 px-4 py-3 text-center">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-400">
                  Challenge Complete ✓
                </p>
                <p className="mt-1 text-[10px] font-semibold text-emerald-600">
                  +{dailyChallengeRewardXp} XP earned
                </p>
              </div>
            ) : (
              <p className="text-center text-[10px] font-semibold leading-relaxed text-zinc-500">
                Resets at midnight. No extensions.
              </p>
            )}

            <button
              type="button"
              onClick={() => setShowDailyChallenge(false)}
              className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-950 transition hover:bg-zinc-200"
            >
              {dailyChallengeCompleted ? 'Close' : "Let's go"}
            </button>
          </div>
        </div>
      ) : null}

      {showWeeklyReport ? (
        <WeeklyWarReport
          authedFetch={authedFetch}
          onClose={closeWeeklyReport}
          userName={homeGreetingFirstName}
        />
      ) : null}
    </ClientShell>
  )
}

export default App
