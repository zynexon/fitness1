import { useCallback, useEffect, useRef, useState } from 'react'
import branding, { getLevelTitle } from '../../config/branding'

// ─── Constants ─────────────────────────────────────────────────────────────
const LEVEL_TITLES = branding.copyPack.levelTitles

const PRESTIGE_ARTIFACT_NAMES = branding.copyPack.prestigeArtifactNames
const PRESTIGE_COLORS = {
  1:{ from:'#f97316', to:'#7c2d12', glow:'#f9731666', ring:'#f97316', label: branding.copyPack.prestigeColorLabels['1'] },
  2:{ from:'#ef4444', to:'#450a0a', glow:'#ef444455', ring:'#ef4444', label: branding.copyPack.prestigeColorLabels['2'] },
  3:{ from:'#a855f7', to:'#3b0764', glow:'#a855f766', ring:'#a855f7', label: branding.copyPack.prestigeColorLabels['3'] },
  4:{ from:'#06b6d4', to:'#083344', glow:'#06b6d455', ring:'#06b6d4', label: branding.copyPack.prestigeColorLabels['4'] },
  5:{ from:'#e879f9', to:'#4a044e', glow:'#e879f977', ring:'#e879f9', label: branding.copyPack.prestigeColorLabels['5'] },
}
const PRESTIGE_ICONS = {
  1:'🔥', 2:'🦅', 3:'👑', 4:'⬡', 5:'💎',
}

// ─── Shared Badge helpers ────────────────────────────────────────────────────
function BADGE_ICON(id) {
  const m = {
    streak_5:'🔥',streak_10:'⚡',streak_30:'💀',
    tasks_10:'✅',tasks_50:'⚔️',tasks_100:'🛡️',
    level_5:'🎖️',level_10:'🎖️',level_20:'👑',level_30:'🏴',
    war_1:'🪖',war_5:'🔫',war_full_5:'💣',
    xp_500:'💰',xp_1000:'💎',shield_max:'🛡️',journal_7:'📖',
  }
  return m[id] || null
}

function getWeeklyReset(nowMs = Date.now()) {
  const now = new Date(nowMs)
  const day = now.getDay()
  const days = day === 0 ? 1 : 8 - day
  const next = new Date(now); next.setDate(now.getDate() + days); next.setHours(0,0,0,0)
  const diffMs = Math.max(0, next - now)
  const h = Math.floor(diffMs / 3600000)
  return `${Math.floor(h/24)}d ${h%24}h`
}

// ─── Prestige SVG Icons (inline, no emoji for crisp rendering) ──────────────
function PrestigeIcon({ level, size = 32 }) {
  const c = PRESTIGE_COLORS[level] || PRESTIGE_COLORS[1]
  const s = size
  const h = s / 2
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
      {[0,1,2,3].map(r=>[0,1,2,3].map(c2=>(
        <rect key={`${r}-${c2}`} x={5+c2*6} y={5+r*6} width="5" height="5" rx="1"
          fill={c.from} opacity={(r+c2)%3===0?.9:(r+c2)%3===1?.45:.15}/>
      )))}
      <rect x="10" y="10" width="12" height="12" rx="2" fill="none" stroke={c.from} strokeWidth="1.2" opacity=".6"/>
    </svg>
  )
  // level 5
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

// ─── Particle canvas for prestige tab background ─────────────────────────────
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
    canvas.width = W; canvas.height = H

    const COLORS = ['#f97316','#ef4444','#a855f7','#06b6d4','#e879f9','#fbbf24']
    particlesRef.current = Array.from({length: 60}, () => ({
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
      particlesRef.current.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.pulse += 0.02
        if (p.y < -4) p.y = H + 4
        if (p.x < -4) p.x = W + 4
        if (p.x > W + 4) p.x = -4
        const a = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse))
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color + Math.round(a * 255).toString(16).padStart(2,'0')
        ctx.fill()
      })
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  return (
    <canvas ref={canvasRef} style={{
      position:'absolute', inset:0, width:'100%', height:'100%',
      pointerEvents:'none', opacity:0.55,
    }}/>
  )
}

// ─── Prestige Entry Card ──────────────────────────────────────────────────────
function PrestigeCard({ entry, rank, isCurrentUser, onClick }) {
  const [hovered, setHovered] = useState(false)
  const pc = PRESTIGE_COLORS[entry.prestige_level] || PRESTIGE_COLORS[1]
  const isTop3 = rank <= 3
  const rankEmoji = rank === 1 ? '⬟' : rank === 2 ? '⬠' : rank === 3 ? '◈' : null

  return (
    <div
      onClick={() => onClick(entry)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:'relative', cursor:'pointer',
        borderRadius: isTop3 ? 18 : 14,
        marginBottom: isTop3 ? 14 : 8,
        transform: hovered ? 'translateX(3px)' : 'translateX(0)',
        transition: 'transform 0.22s cubic-bezier(0.23,1,0.32,1)',
        overflow:'hidden',
      }}
    >
      {/* Glow behind top 3 */}
      {isTop3 && (
        <div style={{
          position:'absolute', inset:-2, borderRadius:20,
          background:`${pc.glow}`,
          filter:'blur(10px)',
          zIndex:0,
          opacity: hovered ? 1 : 0.6,
          transition:'opacity 0.3s',
        }}/>
      )}

      {/* Card body */}
      <div style={{
        position:'relative', zIndex:1,
        background: isTop3
          ? `linear-gradient(135deg, #0f0f10 0%, #18101a 50%, #0c0e18 100%)`
          : '#0f0f10',
        border:`1px solid ${isTop3 ? pc.ring + '55' : (isCurrentUser ? pc.ring + '44' : '#1e1e22')}`,
        borderRadius: isTop3 ? 18 : 14,
        padding: isTop3 ? '18px 18px' : '13px 16px',
        display:'flex', alignItems:'center', gap:14,
      }}>

        {/* Shimmer layer on top-3 */}
        {isTop3 && (
          <div style={{
            position:'absolute', inset:0, borderRadius:18,
            background:`linear-gradient(105deg, ${pc.from}0a 0%, transparent 40%, ${pc.from}08 70%, transparent 100%)`,
            pointerEvents:'none',
          }}/>
        )}

        {/* Rank number */}
        <div style={{
          flexShrink:0,
          width: isTop3 ? 44 : 32,
          height: isTop3 ? 44 : 32,
          borderRadius: '50%',
          background: isTop3
            ? `linear-gradient(135deg, ${pc.from}, ${pc.to})`
            : '#1a1a1e',
          border:`1px solid ${isTop3 ? pc.ring + '88' : '#2a2a2e'}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: isTop3 ? `0 0 12px ${pc.glow}` : 'none',
        }}>
          {isTop3 ? (
            <span style={{
              fontSize: isTop3 ? 15 : 12,
              fontWeight:900, color:'#fff',
              fontFamily:"'Georgia', serif",
              letterSpacing:'-0.02em',
            }}>
              {rank}
            </span>
          ) : (
            <span style={{ fontSize:12, fontWeight:700, color:'#52525b' }}>{rank}</span>
          )}
        </div>

        {/* Prestige level orb */}
        <div style={{
          flexShrink:0,
          width: isTop3 ? 40 : 32,
          height: isTop3 ? 40 : 32,
          borderRadius:'50%',
          background:`radial-gradient(circle at 35% 35%, ${pc.from}44, ${pc.to}cc)`,
          border:`1.5px solid ${pc.ring}66`,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: isTop3 ? `0 0 16px ${pc.glow}, inset 0 1px 0 ${pc.from}44` : `0 0 8px ${pc.glow}`,
        }}>
          <PrestigeIcon level={entry.prestige_level} size={isTop3 ? 22 : 18}/>
        </div>

        {/* Name + info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{
              fontSize: isTop3 ? 16 : 14,
              fontWeight: isTop3 ? 800 : 700,
              color: isCurrentUser ? pc.from : '#f4f4f5',
              letterSpacing:'-0.01em',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            }}>
              {entry.name || 'Warrior'}
            </span>
            {isCurrentUser && (
              <span style={{
                fontSize:9, fontWeight:700, letterSpacing:'0.14em',
                textTransform:'uppercase', color: pc.from,
                background: pc.from + '1a',
                border:`0.5px solid ${pc.ring}55`,
                borderRadius:5, padding:'1px 6px', flexShrink:0,
              }}>You</span>
            )}
            {entry.equipped_badge_icon && (
              <span style={{ fontSize:12, flexShrink:0 }}>{entry.equipped_badge_icon}</span>
            )}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3 }}>
            <span style={{
              fontSize:11, color: pc.ring,
              fontWeight:700, letterSpacing:'0.06em',
            }}>
              Ψ{entry.prestige_level} — {PRESTIGE_ARTIFACT_NAMES[entry.prestige_level] || 'Initiate'}
            </span>
          </div>

          <div style={{ display:'flex', gap:8, marginTop:4, flexWrap:'wrap' }}>
            <span style={{ fontSize:10, color:'#52525b' }}>
              Lv.{entry.level} {getLevelTitle(entry.level)}
            </span>
            <span style={{ fontSize:10, color:'#52525b' }}>
              🔥 {entry.streak}d
            </span>
            <span style={{ fontSize:10, color:'#52525b' }}>
              {(entry.total_xp || entry.xp || 0).toLocaleString()} XP total
            </span>
          </div>
        </div>

        {/* Prestige badge */}
        <div style={{
          flexShrink:0, textAlign:'center',
        }}>
          <div style={{
            fontSize:isTop3 ? 11 : 9,
            fontWeight:800,
            letterSpacing:'0.1em',
            textTransform:'uppercase',
            color: pc.ring,
            background:`${pc.from}15`,
            border:`0.5px solid ${pc.ring}44`,
            borderRadius:8, padding: isTop3 ? '4px 10px' : '3px 8px',
            whiteSpace:'nowrap',
          }}>
            {pc.label}
          </div>
          {entry.season_label && (
            <p style={{ margin:'3px 0 0', fontSize:9, color:'#3f3f46', textAlign:'center' }}>
              {entry.season_label}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Prestige Hero — #1 slot ─────────────────────────────────────────────────
function PrestigeHero({ entry }) {
  const pc = PRESTIGE_COLORS[entry.prestige_level] || PRESTIGE_COLORS[1]
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 50)
    return () => clearInterval(id)
  }, [])

  const pulse = 0.5 + 0.5 * Math.sin(tick * 0.08)

  return (
    <div style={{
      position:'relative',
      borderRadius:24,
      overflow:'hidden',
      marginBottom:24,
      padding:2,
      background:`linear-gradient(135deg, ${pc.from}, ${pc.to}, ${pc.from})`,
      boxShadow:`0 0 40px ${pc.glow}, 0 0 80px ${pc.glow}`,
    }}>
      <div style={{
        position:'relative',
        background:'linear-gradient(145deg, #0f0a00, #0c0010, #000c14)',
        borderRadius:22,
        padding:'28px 20px 24px',
        overflow:'hidden',
      }}>
        {/* Animated radial glow */}
        <div style={{
          position:'absolute', top:'50%', left:'50%',
          width:300, height:300,
          transform:'translate(-50%,-50%)',
          background:`radial-gradient(circle, ${pc.from}${Math.round(pulse * 18 + 5).toString(16).padStart(2,'0')} 0%, transparent 70%)`,
          pointerEvents:'none',
        }}/>

        {/* Subtle grid */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 19px, ${pc.ring}0d 19px, ${pc.ring}0d 20px),
                            repeating-linear-gradient(90deg, transparent, transparent 19px, ${pc.ring}0d 19px, ${pc.ring}0d 20px)`,
          pointerEvents:'none',
        }}/>

        <div style={{ position:'relative', zIndex:1, textAlign:'center' }}>
          {/* "Hall of Legends" eyebrow */}
          <p style={{
            margin:'0 0 16px',
            fontSize:9, fontWeight:700, letterSpacing:'0.35em',
            textTransform:'uppercase', color: pc.ring + 'bb',
          }}>
            ⬟  Hall of Legends  ⬟
          </p>

          {/* Big prestige orb */}
          <div style={{
            width:88, height:88, margin:'0 auto 16px',
            borderRadius:'50%',
            background:`radial-gradient(circle at 35% 30%, ${pc.from}66, ${pc.to})`,
            border:`2px solid ${pc.ring}88`,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:`0 0 32px ${pc.glow}, 0 0 60px ${pc.from}33, inset 0 1px 0 ${pc.from}55`,
          }}>
            <PrestigeIcon level={entry.prestige_level} size={48}/>
          </div>

          {/* Rank 1 crown */}
          <div style={{
            fontSize:11, fontWeight:800, letterSpacing:'0.3em',
            textTransform:'uppercase', color: pc.ring,
            marginBottom:8,
          }}>
            ✦ RANK 1 — {pc.label.toUpperCase()} ✦
          </div>

          <h2 style={{
            margin:'0 0 6px',
            fontSize:26, fontWeight:900,
            letterSpacing:'-0.03em',
            color:'#f4f4f5',
            fontFamily:"'Georgia', serif",
          }}>
            {entry.name || 'Warrior'}
          </h2>

          <p style={{
            margin:'0 0 14px',
            fontSize:14, color: pc.ring, fontWeight:700,
          }}>
            Ψ{entry.prestige_level} — {PRESTIGE_ARTIFACT_NAMES[entry.prestige_level]}
          </p>

          <div style={{
            display:'inline-flex', gap:20,
            background:'rgba(0,0,0,0.4)',
            border:`0.5px solid ${pc.ring}33`,
            borderRadius:12, padding:'10px 20px',
          }}>
            {[
              { label:'Prestige', val:`Ψ${entry.prestige_level}` },
              { label:'Level', val:entry.level },
              { label:'Streak', val:`${entry.streak}d` },
              { label:'XP', val:(entry.total_xp || entry.xp || 0).toLocaleString() },
            ].map(({ label, val }) => (
              <div key={label} style={{ textAlign:'center' }}>
                <p style={{ margin:0, fontSize:16, fontWeight:900, color:'#f4f4f5' }}>{val}</p>
                <p style={{ margin:'2px 0 0', fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#52525b' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Prestige empty state ────────────────────────────────────────────────────
function PrestigeEmpty({ currentLevel }) {
  const needed = Math.max(0, 20 - currentLevel)
  return (
    <div style={{ textAlign:'center', padding:'48px 24px' }}>
      <div style={{
        width:80, height:80, margin:'0 auto 20px',
        borderRadius:'50%',
        background:'#1c1917',
        border:'1px solid #27272a',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path d="M18 4C14 11 9 16 9 23C9 28.5 13 33 18 33C23 33 27 28.5 27 23C27 16 22 11 18 4Z" fill="#27272a"/>
        </svg>
      </div>
      <p style={{ margin:'0 0 6px', fontSize:16, fontWeight:800, color:'#3f3f46' }}>
        No prestige holders yet
      </p>
      <p style={{ margin:0, fontSize:13, color:'#27272a', lineHeight:1.7 }}>
        {needed > 0
          ? `You need ${needed} more levels to be eligible. Reach Level 20, then burn it all.`
          : 'You are eligible. Go to The Vault and claim your legacy.'}
      </p>
    </div>
  )
}

// ─── Regular leaderboard entry (weekly / all-time) ────────────────────────────
function RegularEntry({ entry, rank, period }) {
  const xpVal = period === 'weekly' ? (entry.weekly_xp || 0) : (entry.xp || 0)
  const isTop3 = rank <= 3
  const rankColors = {1:'#fbbf24', 2:'#94a3b8', 3:'#cd7c3d'}
  const rc = rankColors[rank]

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12,
      padding: isTop3 ? '14px 16px' : '11px 14px',
      background: entry.is_current_user ? '#18181b' : 'transparent',
      border:`0.5px solid ${entry.is_current_user ? '#3f3f46' : 'transparent'}`,
      borderRadius:12,
      marginBottom: isTop3 ? 6 : 3,
      transition:'background 0.15s',
    }}>
      {/* Rank */}
      <div style={{
        flexShrink:0, width:28, height:28,
        borderRadius:'50%',
        background: rc ? rc + '22' : '#18181b',
        border:`0.5px solid ${rc || '#27272a'}`,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <span style={{ fontSize:11, fontWeight:700, color: rc || '#52525b' }}>{rank}</span>
      </div>

      {/* Name + info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ fontSize:13, fontWeight:700, color: entry.is_current_user ? '#f4f4f5' : '#d4d4d8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {entry.name || 'Warrior'}
          </span>
          {entry.is_current_user && (
            <span style={{ fontSize:9, fontWeight:700, color:'#71717a', background:'#27272a', borderRadius:4, padding:'1px 5px', flexShrink:0 }}>You</span>
          )}
          {entry.equipped_badge && BADGE_ICON(entry.equipped_badge) && (
            <span style={{ fontSize:11 }}>{BADGE_ICON(entry.equipped_badge)}</span>
          )}
          {entry.prestige_level > 0 && (
            <span style={{ fontSize:9, fontWeight:700, color: PRESTIGE_COLORS[entry.prestige_level]?.ring || '#f97316', flexShrink:0 }}>
              Ψ{entry.prestige_level}
            </span>
          )}
        </div>
        <div style={{ display:'flex', gap:6, marginTop:2 }}>
          <span style={{ fontSize:10, color:'#52525b' }}>Lv.{entry.level}</span>
          <span style={{ fontSize:10, color:'#52525b' }}>🔥{entry.streak}</span>
        </div>
      </div>

      {/* XP */}
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <p style={{ margin:0, fontSize:13, fontWeight:700, color: rc || (entry.is_current_user ? '#f4f4f5' : '#71717a') }}>
          {xpVal.toLocaleString()}
        </p>
        <p style={{ margin:0, fontSize:9, color:'#3f3f46' }}>XP</p>
      </div>
    </div>
  )
}

// ─── Main LeaderboardPage ─────────────────────────────────────────────────────
export default function LeaderboardPage({
  authedFetch,
  user,
  level,
  streakDays,
  xp,
}) {
  const [tab, setTab] = useState('weekly')
  const [weekly, setWeekly] = useState([])
  const [allTime, setAllTime] = useState([])
  const [prestige, setPrestige] = useState([])
  const [weeklyMeta, setWeeklyMeta] = useState({ total:0, yourRank:null })
  const [allTimeMeta, setAllTimeMeta] = useState({ total:0, yourRank:null })
  const [prestigeMeta, setPrestigeMeta] = useState({ total:0, yourRank:null })
  const [loading, setLoading] = useState({ weekly:false, alltime:false, prestige:false })
  const [nowMs, setNowMs] = useState(Date.now())
  const [selectedPrestigeEntry, setSelectedPrestigeEntry] = useState(null)
  const loadedRef = useRef({ weekly:false, alltime:false, prestige:false })

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  const loadWeekly = useCallback(async () => {
    if (loadedRef.current.weekly) return
    setLoading(p=>({...p,weekly:true}))
    try {
      const d = await authedFetch('/api/leaderboard/?limit=50&period=weekly')
      setWeekly(d.entries || d.top_users || [])
      setWeeklyMeta({ total: d.total_users||0, yourRank: d.your_rank||null })
      loadedRef.current.weekly = true
    } catch {}
    setLoading(p=>({...p,weekly:false}))
  }, [authedFetch])

  const loadAllTime = useCallback(async () => {
    if (loadedRef.current.alltime) return
    setLoading(p=>({...p,alltime:true}))
    try {
      const d = await authedFetch('/api/leaderboard/?limit=50&period=all_time')
      setAllTime(d.entries || d.top_users || [])
      setAllTimeMeta({ total: d.total_users||0, yourRank: d.your_rank||null })
      loadedRef.current.alltime = true
    } catch {}
    setLoading(p=>({...p,alltime:false}))
  }, [authedFetch])

  const loadPrestige = useCallback(async () => {
    if (loadedRef.current.prestige) return
    setLoading(p=>({...p,prestige:true}))
    try {
      const d = await authedFetch('/api/leaderboard/prestige/')
      setPrestige(d.entries || [])
      setPrestigeMeta({ total: d.total||0, yourRank: d.your_rank||null })
      loadedRef.current.prestige = true
    } catch {}
    setLoading(p=>({...p,prestige:false}))
  }, [authedFetch])

  useEffect(() => {
    if (tab === 'weekly') loadWeekly()
    else if (tab === 'alltime') loadAllTime()
    else if (tab === 'prestige') loadPrestige()
  }, [tab, loadWeekly, loadAllTime, loadPrestige])

  const isPrestigeTab = tab === 'prestige'

  return (
    <div style={{ fontFamily:"'Manrope', sans-serif", position:'relative' }}>
      {/* ── Header ── */}
      <div style={{ paddingTop:8, paddingBottom:16 }}>
        <p style={{ margin:'0 0 2px', fontSize:10, fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase', color:'#52525b' }}>
          {isPrestigeTab ? 'Hall of Legends' : 'Leaderboard'}
        </p>
        <h1 style={{
          margin:0, fontSize:26, fontWeight:900, letterSpacing:'-0.03em',
          color: isPrestigeTab ? 'transparent' : '#f4f4f5',
          backgroundClip: isPrestigeTab ? 'text' : undefined,
          WebkitBackgroundClip: isPrestigeTab ? 'text' : undefined,
          backgroundImage: isPrestigeTab
            ? 'linear-gradient(90deg, #f97316, #a855f7, #06b6d4)'
            : undefined,
        }}>
          {isPrestigeTab ? 'The Burned' : 'The Warboard'}
        </h1>
        {isPrestigeTab && (
          <p style={{ margin:'4px 0 0', fontSize:12, color:'#52525b', letterSpacing:'0.04em' }}>
            Warriors who sacrificed everything. Twice or more.
          </p>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
        gap:4, marginBottom:20,
        background:'#0f0f10',
        border:'0.5px solid #1e1e22',
        borderRadius:14, padding:4,
      }}>
        {[
          { key:'weekly', label:'Weekly' },
          { key:'alltime', label:'All Time' },
          { key:'prestige', label:'⬟ Prestige' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding:'9px 4px', borderRadius:11,
              border:'none', cursor:'pointer',
              fontFamily:"'Manrope', sans-serif",
              fontWeight:700, fontSize:11,
              letterSpacing:'0.06em',
              transition:'all 0.2s',
              background: tab === t.key
                ? (t.key === 'prestige'
                    ? 'linear-gradient(135deg, #f9731633, #a855f733, #06b6d433)'
                    : '#18181b')
                : 'transparent',
              color: tab === t.key
                ? (t.key === 'prestige' ? '#e879f9' : '#f4f4f5')
                : '#52525b',
              border: tab === t.key
                ? (t.key === 'prestige' ? '0.5px solid #a855f755' : '0.5px solid #27272a')
                : '0.5px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── WEEKLY TAB ── */}
      {tab === 'weekly' && (
        <div>
          <div style={{
            background:'#0f0f10', border:'0.5px solid #1e1e22',
            borderRadius:16, padding:'14px 16px', marginBottom:16,
            display:'flex', justifyContent:'space-between',
          }}>
            <div>
              <p style={{ margin:0, fontSize:11, color:'#52525b', letterSpacing:'0.1em', textTransform:'uppercase' }}>Resets in</p>
              <p style={{ margin:'3px 0 0', fontSize:16, fontWeight:800, color:'#f4f4f5' }}>{getWeeklyReset(nowMs)}</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ margin:0, fontSize:11, color:'#52525b', letterSpacing:'0.1em', textTransform:'uppercase' }}>Your rank</p>
              <p style={{ margin:'3px 0 0', fontSize:16, fontWeight:800, color:'#f4f4f5' }}>
                {weeklyMeta.yourRank ? `#${weeklyMeta.yourRank}` : '—'}
              </p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ margin:0, fontSize:11, color:'#52525b', letterSpacing:'0.1em', textTransform:'uppercase' }}>Warriors</p>
              <p style={{ margin:'3px 0 0', fontSize:16, fontWeight:800, color:'#f4f4f5' }}>{weeklyMeta.total}</p>
            </div>
          </div>

          {loading.weekly ? (
            <p style={{ textAlign:'center', padding:'40px 0', fontSize:12, color:'#52525b' }}>Loading...</p>
          ) : (
            <div>
              {weekly.map((e, i) => (
                <RegularEntry key={e.user_id} entry={e} rank={i+1} period="weekly"/>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ALL TIME TAB ── */}
      {tab === 'alltime' && (
        <div>
          <div style={{
            background:'#0f0f10', border:'0.5px solid #1e1e22',
            borderRadius:16, padding:'14px 16px', marginBottom:16,
            display:'flex', justifyContent:'space-between',
          }}>
            <div>
              <p style={{ margin:0, fontSize:11, color:'#52525b', letterSpacing:'0.1em', textTransform:'uppercase' }}>Total warriors</p>
              <p style={{ margin:'3px 0 0', fontSize:16, fontWeight:800, color:'#f4f4f5' }}>{allTimeMeta.total}</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ margin:0, fontSize:11, color:'#52525b', letterSpacing:'0.1em', textTransform:'uppercase' }}>Your rank</p>
              <p style={{ margin:'3px 0 0', fontSize:16, fontWeight:800, color:'#f4f4f5' }}>
                {allTimeMeta.yourRank ? `#${allTimeMeta.yourRank}` : '—'}
              </p>
            </div>
          </div>

          {loading.alltime ? (
            <p style={{ textAlign:'center', padding:'40px 0', fontSize:12, color:'#52525b' }}>Loading...</p>
          ) : (
            <div>
              {allTime.map((e, i) => (
                <RegularEntry key={e.user_id} entry={e} rank={i+1} period="alltime"/>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PRESTIGE TAB ── */}
      {tab === 'prestige' && (
        <div style={{ position:'relative' }}>

          {/* Particle background container */}
          <div style={{
            position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
            overflow:'hidden',
          }}>
            <PrestigeParticles/>
          </div>

          <div style={{ position:'relative', zIndex:1 }}>

            {/* Hall header card */}
            <div style={{
              borderRadius:18, marginBottom:20,
              padding:'18px 20px',
              background:'linear-gradient(135deg, #0f0800, #0a0014, #000e18)',
              border:'0.5px solid #2a1a00',
              position:'relative', overflow:'hidden',
            }}>
              <div style={{
                position:'absolute', top:-40, right:-40,
                width:180, height:180, borderRadius:'50%',
                background:'radial-gradient(circle, #f9731611, transparent 70%)',
                pointerEvents:'none',
              }}/>
              <div style={{
                position:'absolute', bottom:-30, left:-30,
                width:140, height:140, borderRadius:'50%',
                background:'radial-gradient(circle, #a855f711, transparent 70%)',
                pointerEvents:'none',
              }}/>

              <div style={{ position:'relative', zIndex:1 }}>
                <p style={{ margin:'0 0 10px', fontSize:10, fontWeight:700, letterSpacing:'0.3em', textTransform:'uppercase', color:'#52525b' }}>
                  ⬟ The Rarest Board ⬟
                </p>
                <p style={{ margin:'0 0 12px', fontSize:13, color:'#71717a', lineHeight:1.7 }}>
                  These warriors reached Level 20, then chose to burn their entire progression for a Legacy Artifact.
                  Every name here sacrificed months of work.
                </p>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  {Object.entries(PRESTIGE_COLORS).map(([lvl, c]) => (
                    <div key={lvl} style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:c.ring, boxShadow:`0 0 6px ${c.glow}` }}/>
                      <span style={{ fontSize:10, color:'#52525b' }}>Ψ{lvl} {c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {loading.prestige ? (
              <div style={{ textAlign:'center', padding:'60px 0' }}>
                <div style={{
                  width:48, height:48, margin:'0 auto 16px',
                  borderRadius:'50%',
                  background:'linear-gradient(135deg, #f97316, #a855f7)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  animation:'spin 1.2s linear infinite',
                }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'#09090b' }}/>
                </div>
                <p style={{ fontSize:12, color:'#52525b', letterSpacing:'0.14em', textTransform:'uppercase' }}>
                  Consulting the Hall...
                </p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : prestige.length === 0 ? (
              <PrestigeEmpty currentLevel={level}/>
            ) : (
              <div>
                {/* #1 gets the full hero treatment */}
                {prestige.length > 0 && <PrestigeHero entry={prestige[0]}/>}

                {/* Rank 2 onward */}
                {prestige.slice(1).map((e, i) => (
                  <PrestigeCard
                    key={e.user_id}
                    entry={e}
                    rank={i+2}
                    isCurrentUser={e.is_current_user}
                    onClick={setSelectedPrestigeEntry}
                  />
                ))}

                {/* Your rank callout if not in visible list */}
                {prestigeMeta.yourRank && !prestige.find(e => e.is_current_user) && (
                  <div style={{
                    marginTop:16,
                    background:'#18181b', border:'0.5px solid #27272a',
                    borderRadius:12, padding:'12px 16px',
                    textAlign:'center',
                  }}>
                    <p style={{ margin:0, fontSize:12, color:'#52525b' }}>
                      You are ranked <span style={{ color:'#f4f4f5', fontWeight:700 }}>#{prestigeMeta.yourRank}</span> on the prestige board
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Eligibility CTA for non-prestige users */}
            {!loading.prestige && (
              <div style={{
                marginTop:24,
                background:'linear-gradient(135deg, #0f0800, #0a0014)',
                border:'0.5px solid #1e1200',
                borderRadius:16, padding:'16px 18px',
                textAlign:'center',
              }}>
                {level >= 20 ? (
                  <>
                    <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:700, color:'#fed7aa' }}>
                      You are eligible for Prestige
                    </p>
                    <p style={{ margin:0, fontSize:11, color:'#52525b' }}>
                      Go to Profile → The Vault to burn your progression and claim your Legacy Artifact.
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:700, color:'#3f3f46' }}>
                      Reach Level 20 to be eligible
                    </p>
                    <p style={{ margin:0, fontSize:11, color:'#27272a' }}>
                      Current: Level {level} — {Math.max(0, 20 - level)} levels to go
                    </p>
                    <div style={{ marginTop:10, height:3, background:'#1c1917', borderRadius:4, overflow:'hidden' }}>
                      <div style={{
                        height:'100%', borderRadius:4,
                        background:'linear-gradient(90deg, #f97316, #a855f7)',
                        width:`${Math.min(100,(level/20)*100)}%`,
                        transition:'width 0.8s ease',
                      }}/>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Prestige entry detail sheet ── */}
      {selectedPrestigeEntry && (() => {
        const e = selectedPrestigeEntry
        const pc = PRESTIGE_COLORS[e.prestige_level] || PRESTIGE_COLORS[1]
        return (
          <div
            onClick={() => setSelectedPrestigeEntry(null)}
            style={{
              position:'fixed', inset:0, zIndex:10000,
              background:'rgba(0,0,0,0.85)',
              display:'flex', alignItems:'flex-end', justifyContent:'center',
              padding:0,
              backdropFilter:'blur(8px)',
            }}
          >
            <div
              onClick={e2 => e2.stopPropagation()}
              style={{
                width:'100%', maxWidth:440,
                background:'linear-gradient(145deg, #0f0a00, #0c0010)',
                border:`1px solid ${pc.ring}44`,
                borderRadius:'22px 22px 0 0',
                padding:'28px 22px 40px',
                boxShadow:`0 -20px 60px ${pc.glow}`,
                animation:'slideUp 0.3s cubic-bezier(0.23,1,0.32,1)',
              }}
            >
              <style>{`
                @keyframes slideUp {
                  from { transform: translateY(100%); }
                  to { transform: translateY(0); }
                }
              `}</style>
              <button onClick={() => setSelectedPrestigeEntry(null)} style={{
                position:'absolute', top:14, right:14,
                background:'transparent', border:'none',
                color:'#52525b', cursor:'pointer', fontSize:18,
              }}>✕</button>

              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{
                  width:80, height:80, margin:'0 auto 12px',
                  borderRadius:'50%',
                  background:`radial-gradient(circle at 35% 35%, ${pc.from}55, ${pc.to})`,
                  border:`2px solid ${pc.ring}77`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:`0 0 24px ${pc.glow}`,
                }}>
                  <PrestigeIcon level={e.prestige_level} size={44}/>
                </div>
                <h2 style={{ margin:'0 0 4px', fontSize:22, fontWeight:900, color:'#f4f4f5', fontFamily:"'Georgia', serif" }}>
                  {e.name || 'Warrior'}
                </h2>
                <p style={{ margin:0, fontSize:13, color:pc.ring, fontWeight:700 }}>
                  Ψ{e.prestige_level} — {PRESTIGE_ARTIFACT_NAMES[e.prestige_level]}
                </p>
              </div>

              <div style={{
                display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8,
                marginBottom:16,
              }}>
                {[
                  { label:'Prestige', val:`Ψ${e.prestige_level}` },
                  { label:'Level', val:e.level },
                  { label:'Streak', val:`${e.streak}d` },
                  { label:'Total XP', val:(e.total_xp||e.xp||0).toLocaleString() },
                  { label:'Season', val: e.season_label || '—' },
                  { label:'Artifact', val: pc.label },
                ].map(({ label, val }) => (
                  <div key={label} style={{
                    background:'#18181b', border:'0.5px solid #27272a',
                    borderRadius:10, padding:'10px 12px', textAlign:'center',
                  }}>
                    <p style={{ margin:0, fontSize:13, fontWeight:800, color:'#f4f4f5' }}>{val}</p>
                    <p style={{ margin:'2px 0 0', fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#52525b' }}>{label}</p>
                  </div>
                ))}
              </div>

              <div style={{
                background:'#0c0a09', border:`0.5px solid ${pc.ring}22`,
                borderRadius:12, padding:'12px 14px',
                textAlign:'center',
              }}>
                <p style={{ margin:0, fontSize:12, color:'#52525b', lineHeight:1.7, fontStyle:'italic' }}>
                  "{PRESTIGE_ARTIFACT_NAMES[e.prestige_level] ? `Bearer of ${PRESTIGE_ARTIFACT_NAMES[e.prestige_level]}.` : ''} This warrior burned their progression and chose legacy over comfort."
                </p>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
