import { useEffect, useRef, useMemo } from 'react'
import branding from '../config/branding'

// ─── Tier config ──────────────────────────────────────────────────────────────
const TIERS = [
  { min: 1,  max: 4,  name: 'Dormant',   color: '#6b7280', badge: 'rgba(107,114,128,0.25)', bText: '#9ca3af', aura: 'rgba(107,114,128,0.35)' },
  { min: 5,  max: 9,  name: 'Awakened',  color: '#818cf8', badge: 'rgba(99,102,241,0.25)',  bText: '#a5b4fc', aura: 'rgba(99,102,241,0.45)'  },
  { min: 10, max: 14, name: 'Armored',   color: '#38bdf8', badge: 'rgba(14,165,233,0.25)',  bText: '#7dd3fc', aura: 'rgba(14,165,233,0.45)'  },
  { min: 15, max: 19, name: 'Elite',     color: '#fbbf24', badge: 'rgba(245,158,11,0.25)',  bText: '#fcd34d', aura: 'rgba(245,158,11,0.45)'  },
  { min: 20, max: 24, name: 'Legendary', color: '#f87171', badge: 'rgba(239,68,68,0.25)',   bText: '#fca5a5', aura: 'rgba(239,68,68,0.45)'   },
  { min: 25, max: 29, name: 'Apex',      color: '#c084fc', badge: 'rgba(139,92,246,0.25)',  bText: '#e9d5ff', aura: 'rgba(139,92,246,0.55)'  },
  { min: 30, max: 30, name: branding.appName,   color: '#ffffff', badge: 'rgba(255,255,255,0.2)',  bText: '#ffffff', aura: 'rgba(255,255,255,0.6)'  },
]

function getTier(lvl) {
  return TIERS.find(t => lvl >= t.min && lvl <= t.max) || TIERS[0]
}

// ─── Sky colour mapping (streak → actual visible sky colours) ─────────────────
// streak 0        : stormy night   — near-black + deep purple
// streak 1-2      : cloudy night   — dark navy
// streak 3-6      : clearing night — indigo
// streak 7-14     : dawn           — dark blue-purple → warm purple horizon
// streak 15-29    : midday clear   — bright blue sky, pale horizon
// streak 30-59    : golden hour    — amber/orange sky
// streak 60+      : aurora/legend  — teal aurora bands on dark sky
function getSkyPalette(streak) {
  if (streak === 0)    return { top: '#070711', bot: '#1a0a2e', horizon: '#2d1045' }
  if (streak <= 2)     return { top: '#080d1e', bot: '#142040', horizon: '#1e2a52' }
  if (streak <= 6)     return { top: '#0d1230', bot: '#1e2a60', horizon: '#2e3a7a' }
  if (streak <= 14)    return { top: '#0a0f28', bot: '#1a2855', horizon: '#4a3080' }
  if (streak <= 29)    return { top: '#0a2060', bot: '#1a60b0', horizon: '#60a8e0' }
  if (streak <= 59)    return { top: '#301a05', bot: '#a04010', horizon: '#e07020' }
  return                      { top: '#040d18', bot: '#0a2030', horizon: '#0a6040' }
}

// ─── Sky canvas draw ──────────────────────────────────────────────────────────
function drawSky(canvas, lvl, streak) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.clearRect(0, 0, W, H)

  const { top, bot, horizon } = getSkyPalette(streak)

  // Main sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H)
  skyGrad.addColorStop(0,    top)
  skyGrad.addColorStop(0.6,  bot)
  skyGrad.addColorStop(1,    horizon)
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, W, H)

  // ── Streak 15-29: bright day clouds ──
  if (streak >= 15 && streak < 30) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    for (let i = 0; i < 4; i++) {
      const cx = 80 + i * 160, cy = 40 + i * 15
      ctx.beginPath()
      ctx.ellipse(cx, cy, 60, 22, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ── Streak 30-59: golden hour warm glow on horizon ──
  if (streak >= 30 && streak < 60) {
    const sunGrad = ctx.createRadialGradient(W / 2, H * 0.75, 0, W / 2, H * 0.75, 280)
    sunGrad.addColorStop(0,   'rgba(255,180,50,0.55)')
    sunGrad.addColorStop(0.4, 'rgba(230,100,20,0.30)')
    sunGrad.addColorStop(1,   'rgba(180,40,0,0)')
    ctx.fillStyle = sunGrad
    ctx.fillRect(0, 0, W, H)

    // Sun disc
    ctx.fillStyle = '#ffe060'
    ctx.beginPath()
    ctx.arc(W / 2, H * 0.72, 28, 0, Math.PI * 2)
    ctx.fill()
    const coronaGrad = ctx.createRadialGradient(W / 2, H * 0.72, 28, W / 2, H * 0.72, 70)
    coronaGrad.addColorStop(0,   'rgba(255,220,80,0.35)')
    coronaGrad.addColorStop(1,   'rgba(255,150,0,0)')
    ctx.fillStyle = coronaGrad
    ctx.beginPath()
    ctx.arc(W / 2, H * 0.72, 70, 0, Math.PI * 2)
    ctx.fill()
  }

  // ── Streak 60+: aurora bands ──
  if (streak >= 60) {
    const auroraColors = ['rgba(0,200,120,0.18)', 'rgba(0,160,200,0.14)', 'rgba(80,0,200,0.12)']
    for (let i = 0; i < 3; i++) {
      const y = 60 + i * 55
      const aGrad = ctx.createLinearGradient(0, y - 30, 0, y + 30)
      aGrad.addColorStop(0,   'transparent')
      aGrad.addColorStop(0.5, auroraColors[i])
      aGrad.addColorStop(1,   'transparent')
      ctx.fillStyle = aGrad
      ctx.beginPath()
      ctx.ellipse(W / 2, y, W * 0.7, 28 + i * 8, Math.PI * 0.04, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ── Stars: visible at night (streak < 15) or aurora (streak 60+) ──
  const starOpacity = streak === 0 ? 0.9
    : streak <= 2  ? 0.75
    : streak <= 6  ? 0.55
    : streak <= 14 ? 0.35
    : streak <= 29 ? 0
    : streak <= 59 ? 0
    : 0.6

  if (starOpacity > 0) {
    const starCount = Math.min(90, 20 + lvl * 2)
    for (let i = 0; i < starCount; i++) {
      const sx = ((Math.sin(i * 137.508) * 0.5 + 0.5) * W)
      const sy = ((Math.cos(i * 97.3) * 0.5 + 0.5) * H * 0.6)
      const r  = i % 7 === 0 ? 1.8 : 0.9
      const twinkle = (Math.sin(i * 43.7) * 0.5 + 0.5) * starOpacity
      ctx.fillStyle = `rgba(255,255,255,${twinkle})`
      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ── Moon: night scenes (streak < 15) and lvl >= 8 ──
  if (streak < 15 && lvl >= 8) {
    const mx = 560, my = 55, mr = lvl >= 20 ? 22 : 15
    ctx.fillStyle = '#f5e8a0'
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = top
    ctx.beginPath(); ctx.arc(mx + mr * 0.38, my - mr * 0.25, mr * 0.82, 0, Math.PI * 2); ctx.fill()
  }

  // ── Day sun: clear day streak 15-29, lvl >= 12 ──
  if (streak >= 15 && streak < 30 && lvl >= 12) {
    ctx.fillStyle = '#fff9c4'
    ctx.beginPath(); ctx.arc(560, 55, 18, 0, Math.PI * 2); ctx.fill()
    const sg = ctx.createRadialGradient(560, 55, 18, 560, 55, 50)
    sg.addColorStop(0,   'rgba(255,245,150,0.3)')
    sg.addColorStop(1,   'rgba(255,240,100,0)')
    ctx.fillStyle = sg
    ctx.beginPath(); ctx.arc(560, 55, 50, 0, Math.PI * 2); ctx.fill()
  }

  // ── Rain streaks for streak === 0 ──
  if (streak === 0) {
    ctx.strokeStyle = 'rgba(100,140,200,0.35)'
    ctx.lineWidth = 0.8
    for (let i = 0; i < 40; i++) {
      const rx = (i * 173) % W
      const ry = (i * 97) % H
      ctx.beginPath()
      ctx.moveTo(rx, ry)
      ctx.lineTo(rx - 6, ry + 18)
      ctx.stroke()
    }
  }
}

// ─── Mountain SVG path generator ──────────────────────────────────────────────
function getMountainPoints(lvl, layer) {
  const pct = (lvl - 1) / 29
  // layer 0 = back (furthest), 1 = mid, 2 = front (closest)
  const heights = [
    { base: 180, extra: 120, peak: 30 },
    { base: 140, extra: 80,  peak: 20 },
    { base: 90,  extra: 70,  peak: 10 },
  ][layer]

  const H = Math.round(heights.base + pct * heights.extra)
  const peakY = Math.round(heights.peak + (1 - pct) * 100)

  const configs = [
    `0,${H} 80,${Math.round(H*0.58)} 180,${Math.round(H*0.76)} 340,${peakY} 500,${Math.round(H*0.70)} 600,${Math.round(H*0.50)} 680,${H}`,
    `0,${H} 50,${Math.round(H*0.68)} 150,${Math.round(H*0.82)} 290,${Math.round(peakY*0.55+12)} 420,${Math.round(H*0.72)} 530,${Math.round(H*0.46)} 640,${Math.round(H*0.78)} 680,${H}`,
    `0,${H} 60,${Math.round(H*0.70)} 180,${Math.round(H*0.84)} 340,${Math.round(peakY*0.35+8)} 500,${Math.round(H*0.78)} 620,${Math.round(H*0.60)} 680,${H}`,
  ]
  return { points: configs[layer], H }
}

function getMountainColor(lvl, streak, layer) {
  // base fill — gets warmer / lighter with higher streak & level
  const night  = ['#1a1535', '#221d42', '#2a2050']
  const dusk   = ['#2a1a35', '#381f48', '#452558']
  const day    = ['#1e2a50', '#283860', '#344878']
  const golden = ['#3a1a05', '#501f08', '#6a2a0a']
  const aurora = ['#0a1820', '#0e2030', '#122840']

  const palettes = streak === 0 ? night
    : streak <= 6  ? night
    : streak <= 14 ? dusk
    : streak <= 29 ? day
    : streak <= 59 ? golden
    : aurora

  return palettes[layer]
}

// ─── Beast SVG shapes ─────────────────────────────────────────────────────────
function getBeastShapes(lvl, tier) {
  const c   = tier.color
  const pct = Math.min(1, (lvl - 1) / 29)
  const sz  = 38 + Math.round(pct * 34)
  const cx  = 50, cy = 90 - sz

  if (lvl <= 4) {
    return `
      <ellipse cx="${cx}" cy="${cy+sz*.58}" rx="${sz*.52}" ry="${sz*.42}" fill="${c}" opacity=".88"/>
      <circle cx="${cx}" cy="${cy}" r="${sz*.36}" fill="${c}"/>
      <circle cx="${cx-sz*.16}" cy="${cy-sz*.08}" r="${sz*.09}" fill="#08080f"/>
      <circle cx="${cx+sz*.16}" cy="${cy-sz*.08}" r="${sz*.09}" fill="#08080f"/>
    `
  }
  if (lvl <= 9) {
    return `
      <ellipse cx="${cx}" cy="${cy+sz*.58}" rx="${sz*.54}" ry="${sz*.44}" fill="${c}" opacity=".88"/>
      <circle cx="${cx}" cy="${cy}" r="${sz*.37}" fill="${c}"/>
      <polygon points="${cx-sz*.12},${cy-sz*.37} ${cx-sz*.24},${cy-sz*.60} ${cx-sz*.02},${cy-sz*.44}" fill="${c}"/>
      <polygon points="${cx+sz*.12},${cy-sz*.37} ${cx+sz*.24},${cy-sz*.60} ${cx+sz*.02},${cy-sz*.44}" fill="${c}"/>
      <circle cx="${cx-sz*.15}" cy="${cy-sz*.08}" r="${sz*.10}" fill="#08080f"/>
      <circle cx="${cx+sz*.15}" cy="${cy-sz*.08}" r="${sz*.10}" fill="#08080f"/>
      <circle cx="${cx-sz*.11}" cy="${cy-sz*.05}" r="${sz*.04}" fill="${c}"/>
      <circle cx="${cx+sz*.11}" cy="${cy-sz*.05}" r="${sz*.04}" fill="${c}"/>
    `
  }
  if (lvl <= 14) {
    return `
      <ellipse cx="${cx}" cy="${cy+sz*.54}" rx="${sz*.54}" ry="${sz*.38}" fill="${c}" opacity=".84"/>
      <rect x="${cx-sz*.30}" y="${cy}" width="${sz*.60}" height="${sz*.52}" rx="4" fill="${c}"/>
      <circle cx="${cx}" cy="${cy}" r="${sz*.36}" fill="${c}"/>
      <polygon points="${cx-sz*.16},${cy-sz*.36} ${cx-sz*.30},${cy-sz*.66} ${cx-sz*.04},${cy-sz*.43}" fill="${c}"/>
      <polygon points="${cx+sz*.16},${cy-sz*.36} ${cx+sz*.30},${cy-sz*.66} ${cx+sz*.04},${cy-sz*.43}" fill="${c}"/>
      <rect x="${cx-sz*.35}" y="${cy+sz*.06}" width="${sz*.14}" height="${sz*.44}" rx="3" fill="${c}"/>
      <rect x="${cx+sz*.21}" y="${cy+sz*.06}" width="${sz*.14}" height="${sz*.44}" rx="3" fill="${c}"/>
      <rect x="${cx-sz*.24}" y="${cy-sz*.05}" width="${sz*.48}" height="${sz*.24}" rx="3" fill="#08080f" opacity=".45"/>
      <line x1="${cx-sz*.08}" y1="${cy-sz*.08}" x2="${cx+sz*.08}" y2="${cy-sz*.08}" stroke="${c}" stroke-width="2"/>
    `
  }
  if (lvl <= 19) {
    return `
      <ellipse cx="${cx}" cy="${cy+sz*.54}" rx="${sz*.58}" ry="${sz*.36}" fill="${c}" opacity=".80"/>
      <rect x="${cx-sz*.32}" y="${cy-sz*.08}" width="${sz*.64}" height="${sz*.55}" rx="5" fill="${c}"/>
      <circle cx="${cx}" cy="${cy}" r="${sz*.37}" fill="${c}"/>
      <polygon points="${cx-sz*.20},${cy-sz*.37} ${cx-sz*.36},${cy-sz*.74} ${cx-sz*.06},${cy-sz*.44}" fill="${c}"/>
      <polygon points="${cx+sz*.20},${cy-sz*.37} ${cx+sz*.36},${cy-sz*.74} ${cx+sz*.06},${cy-sz*.44}" fill="${c}"/>
      <rect x="${cx-sz*.46}" y="${cy}" width="${sz*.16}" height="${sz*.50}" rx="4" fill="${c}"/>
      <rect x="${cx+sz*.30}" y="${cy}" width="${sz*.16}" height="${sz*.50}" rx="4" fill="${c}"/>
      <rect x="${cx-sz*.26}" y="${cy-sz*.08}" width="${sz*.52}" height="${sz*.28}" rx="3" fill="#08080f" opacity=".52"/>
      <circle cx="${cx-sz*.10}" cy="${cy-sz*.05}" r="${sz*.09}" fill="${c}"/>
      <circle cx="${cx+sz*.10}" cy="${cy-sz*.05}" r="${sz*.09}" fill="${c}"/>
      <line x1="${cx-sz*.46}" y1="${cy+sz*.06}" x2="${cx-sz*.58}" y2="${cy-sz*.06}" stroke="${c}" stroke-width="2.5"/>
      <line x1="${cx+sz*.46}" y1="${cy+sz*.06}" x2="${cx+sz*.58}" y2="${cy-sz*.06}" stroke="${c}" stroke-width="2.5"/>
    `
  }
  if (lvl <= 24) {
    return `
      <ellipse cx="${cx}" cy="${cy+sz*.55}" rx="${sz*.62}" ry="${sz*.34}" fill="${c}" opacity=".75"/>
      <rect x="${cx-sz*.34}" y="${cy-sz*.10}" width="${sz*.68}" height="${sz*.58}" rx="6" fill="${c}"/>
      <circle cx="${cx}" cy="${cy}" r="${sz*.39}" fill="${c}"/>
      <polygon points="${cx-sz*.22},${cy-sz*.39} ${cx-sz*.40},${cy-sz*.82} ${cx-sz*.06},${cy-sz*.47}" fill="${c}"/>
      <polygon points="${cx+sz*.22},${cy-sz*.39} ${cx+sz*.40},${cy-sz*.82} ${cx+sz*.06},${cy-sz*.47}" fill="${c}"/>
      <rect x="${cx-sz*.50}" y="${cy+sz*.02}" width="${sz*.18}" height="${sz*.54}" rx="4" fill="${c}"/>
      <rect x="${cx+sz*.32}" y="${cy+sz*.02}" width="${sz*.18}" height="${sz*.54}" rx="4" fill="${c}"/>
      <rect x="${cx-sz*.28}" y="${cy-sz*.10}" width="${sz*.56}" height="${sz*.30}" rx="3" fill="#08080f" opacity=".56"/>
      <circle cx="${cx-sz*.11}" cy="${cy-sz*.04}" r="${sz*.10}" fill="${c}"/>
      <circle cx="${cx+sz*.11}" cy="${cy-sz*.04}" r="${sz*.10}" fill="${c}"/>
      <line x1="${cx-sz*.50}" y1="${cy+sz*.02}" x2="${cx-sz*.65}" y2="${cy-sz*.12}" stroke="${c}" stroke-width="3"/>
      <line x1="${cx+sz*.50}" y1="${cy+sz*.02}" x2="${cx+sz*.65}" y2="${cy-sz*.12}" stroke="${c}" stroke-width="3"/>
      <polygon points="${cx-sz*.65},${cy-sz*.12} ${cx-sz*.78},${cy-sz*.26} ${cx-sz*.54},${cy-sz*.23}" fill="${c}"/>
      <polygon points="${cx+sz*.65},${cy-sz*.12} ${cx+sz*.78},${cy-sz*.26} ${cx+sz*.54},${cy-sz*.23}" fill="${c}"/>
    `
  }
  if (lvl <= 29) {
    return `
      <ellipse cx="${cx}" cy="${cy+sz*.56}" rx="${sz*.65}" ry="${sz*.32}" fill="${c}" opacity=".70"/>
      <rect x="${cx-sz*.36}" y="${cy-sz*.12}" width="${sz*.72}" height="${sz*.60}" rx="7" fill="${c}"/>
      <circle cx="${cx}" cy="${cy}" r="${sz*.40}" fill="${c}"/>
      <polygon points="${cx-sz*.24},${cy-sz*.40} ${cx-sz*.44},${cy-sz*.88} ${cx-sz*.06},${cy-sz*.48}" fill="${c}"/>
      <polygon points="${cx+sz*.24},${cy-sz*.40} ${cx+sz*.44},${cy-sz*.88} ${cx+sz*.06},${cy-sz*.48}" fill="${c}"/>
      <rect x="${cx-sz*.52}" y="${cy}" width="${sz*.18}" height="${sz*.56}" rx="5" fill="${c}"/>
      <rect x="${cx+sz*.34}" y="${cy}" width="${sz*.18}" height="${sz*.56}" rx="5" fill="${c}"/>
      <rect x="${cx-sz*.30}" y="${cy-sz*.12}" width="${sz*.60}" height="${sz*.32}" rx="4" fill="#08080f" opacity=".60"/>
      <circle cx="${cx-sz*.12}" cy="${cy-sz*.04}" r="${sz*.11}" fill="${c}"/>
      <circle cx="${cx+sz*.12}" cy="${cy-sz*.04}" r="${sz*.11}" fill="${c}"/>
      <line x1="${cx-sz*.52}" y1="${cy+sz*.02}" x2="${cx-sz*.72}" y2="${cy-sz*.16}" stroke="${c}" stroke-width="3.5"/>
      <line x1="${cx+sz*.52}" y1="${cy+sz*.02}" x2="${cx+sz*.72}" y2="${cy-sz*.16}" stroke="${c}" stroke-width="3.5"/>
      <polygon points="${cx-sz*.72},${cy-sz*.16} ${cx-sz*.86},${cy-sz*.32} ${cx-sz*.60},${cy-sz*.29}" fill="${c}"/>
      <polygon points="${cx+sz*.72},${cy-sz*.16} ${cx+sz*.86},${cy-sz*.32} ${cx+sz*.60},${cy-sz*.29}" fill="${c}"/>
      <line x1="${cx}" y1="${cy-sz*.52}" x2="${cx}" y2="${cy-sz*.82}" stroke="${c}" stroke-width="2"/>
      <circle cx="${cx}" cy="${cy-sz*.88}" r="${sz*.08}" fill="${c}"/>
    `
  }
  // Level 30 — max rank
  return `
    <ellipse cx="${cx}" cy="${cy+sz*.57}" rx="${sz*.68}" ry="${sz*.30}" fill="${c}" opacity=".60"/>
    <rect x="${cx-sz*.38}" y="${cy-sz*.14}" width="${sz*.76}" height="${sz*.63}" rx="8" fill="${c}"/>
    <circle cx="${cx}" cy="${cy}" r="${sz*.42}" fill="${c}"/>
    <polygon points="${cx-sz*.26},${cy-sz*.42} ${cx-sz*.47},${cy-sz*.92} ${cx-sz*.06},${cy-sz*.50}" fill="${c}"/>
    <polygon points="${cx+sz*.26},${cy-sz*.42} ${cx+sz*.47},${cy-sz*.92} ${cx+sz*.06},${cy-sz*.50}" fill="${c}"/>
    <rect x="${cx-sz*.56}" y="${cy}" width="${sz*.19}" height="${sz*.60}" rx="5" fill="${c}"/>
    <rect x="${cx+sz*.37}" y="${cy}" width="${sz*.19}" height="${sz*.60}" rx="5" fill="${c}"/>
    <rect x="${cx-sz*.32}" y="${cy-sz*.14}" width="${sz*.64}" height="${sz*.34}" rx="4" fill="#08080f" opacity=".65"/>
    <circle cx="${cx-sz*.13}" cy="${cy-sz*.04}" r="${sz*.12}" fill="#fff"/>
    <circle cx="${cx+sz*.13}" cy="${cy-sz*.04}" r="${sz*.12}" fill="#fff"/>
    <circle cx="${cx-sz*.12}" cy="${cy-sz*.03}" r="${sz*.06}" fill="#08080f"/>
    <circle cx="${cx+sz*.12}" cy="${cy-sz*.03}" r="${sz*.06}" fill="#08080f"/>
    <line x1="${cx-sz*.56}" y1="${cy+sz*.02}" x2="${cx-sz*.80}" y2="${cy-sz*.22}" stroke="${c}" stroke-width="4"/>
    <line x1="${cx+sz*.56}" y1="${cy+sz*.02}" x2="${cx+sz*.80}" y2="${cy-sz*.22}" stroke="${c}" stroke-width="4"/>
    <polygon points="${cx-sz*.80},${cy-sz*.22} ${cx-sz*.96},${cy-sz*.40} ${cx-sz*.66},${cy-sz*.37}" fill="${c}"/>
    <polygon points="${cx+sz*.80},${cy-sz*.22} ${cx+sz*.96},${cy-sz*.40} ${cx+sz*.66},${cy-sz*.37}" fill="${c}"/>
    <line x1="${cx}" y1="${cy-sz*.55}" x2="${cx}" y2="${cy-sz*.92}" stroke="${c}" stroke-width="2.5"/>
    <circle cx="${cx}" cy="${cy-sz*.98}" r="${sz*.10}" fill="${c}"/>
    <polygon points="${cx-sz*.38},${cy-sz*.26} ${cx-sz*.50},${cy-sz*.42} ${cx-sz*.26},${cy-sz*.38}" fill="#fff" opacity=".55"/>
    <polygon points="${cx+sz*.38},${cy-sz*.26} ${cx+sz*.50},${cy-sz*.42} ${cx+sz*.26},${cy-sz*.38}" fill="#fff" opacity=".55"/>
  `
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DisciplineBeast({ level = 1, streak = 0, xp = 0 }) {
  const lvl     = Math.max(1, Math.min(30, Math.round(level)))
  const str     = Math.max(0, Math.round(streak))
  const tier    = getTier(lvl)
  const pct     = (lvl - 1) / 29

  const canvasRef = useRef(null)

  // XP progress within current level
  const currentLevelXp = lvl <= 1 ? 0 : lvl * lvl * 50
  const nextLevelXp    = (lvl + 1) * (lvl + 1) * 50
  const progressXp     = Math.max(0, xp - currentLevelXp)
  const neededXp       = Math.max(1, nextLevelXp - currentLevelXp)
  const xpPct          = Math.min(100, Math.round((progressXp / neededXp) * 100))
  const isMaxLevel     = lvl >= 30

  // Beast SVG dimensions — grow with level
  const beastH   = Math.round(80 + pct * 50)
  const beastShapes = useMemo(() => getBeastShapes(lvl, tier), [lvl, tier.color])

  // Mountain data
  const mountains = useMemo(() => [0, 1, 2].map(i => {
    const { points, H } = getMountainPoints(lvl, i)
    const fill = getMountainColor(lvl, str, i)
    return { points, H, fill }
  }), [lvl, str])

  // Beast vertical rise — higher level = higher on mountain
  const beastRise = Math.round(pct * 110)

  // Aura size
  const auraW = Math.round(56 + pct * 80)
  const auraH = Math.round(18 + pct * 28)

  // Sky canvas
  useEffect(() => {
    drawSky(canvasRef.current, lvl, str)
  }, [lvl, str])

  // Weather / sky label
  const weatherLabel = str === 0    ? 'Storm — no streak'
    : str <= 2                       ? 'Cloudy — streak building'
    : str <= 6                       ? 'Clearing — pushing forward'
    : str <= 14                      ? 'Dawn — consistent warrior'
    : str <= 29                      ? 'Clear sky — unstoppable'
    : str <= 59                      ? 'Golden hour — legendary'
    : 'Aurora — beyond legend'

  const mountLabel = lvl <= 4  ? 'Base camp'
    : lvl <= 9                 ? 'Lower slope'
    : lvl <= 14                ? 'Mid-mountain'
    : lvl <= 19                ? 'High peak'
    : lvl <= 24                ? 'Summit'
    : lvl <= 29                ? 'Above clouds'
    : `${branding.appName} throne`

  // Lightning visible at Apex+
  const showLightning = lvl >= 25

  return (
    <div style={{ borderRadius: 20, overflow: 'hidden', background: '#08080f', position: 'relative' }}>

      {/* ── Scene ── */}
      <div style={{ position: 'relative', height: 300, overflow: 'hidden' }}>

        {/* Sky canvas */}
        <canvas
          ref={canvasRef}
          width={680}
          height={300}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />

        {/* Mountains — back to front */}
        {mountains.map((m, i) => (
          <svg
            key={i}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
            width="100%"
            height={m.H}
            viewBox={`0 0 680 ${m.H}`}
            preserveAspectRatio="none"
          >
            <polygon points={m.points} fill={m.fill} />
          </svg>
        ))}

        {/* Ground strip */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 44,
          background: '#12102a',
        }} />

        {/* Aura glow under beast */}
        {lvl >= 5 && (
          <div style={{
            position: 'absolute',
            bottom: 38 + beastRise,
            left: '50%',
            transform: 'translateX(-50%)',
            width: auraW,
            height: auraH,
            background: tier.aura,
            borderRadius: '50%',
            filter: `blur(${Math.round(8 + pct * 14)}px)`,
            pointerEvents: 'none',
          }} />
        )}

        {/* Shield damage glow — streak 0 */}
        {str === 0 && (
          <div style={{
            position: 'absolute',
            bottom: 38 + beastRise,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 70,
            height: 24,
            background: 'rgba(239,68,68,0.35)',
            borderRadius: '50%',
            filter: 'blur(10px)',
            pointerEvents: 'none',
          }} />
        )}

        {/* Beast */}
        <div style={{
          position: 'absolute',
          bottom: 44 + beastRise,
          left: '50%',
          transform: 'translateX(-50%)',
          animation: 'beastFloat 3.2s ease-in-out infinite',
          transition: 'bottom 1.4s cubic-bezier(.4,0,.2,1)',
        }}>
          <svg
            width={100 + Math.round(pct * 40)}
            height={beastH + 12}
            viewBox={`0 0 100 ${beastH + 12}`}
            style={{ display: 'block', overflow: 'visible' }}
            dangerouslySetInnerHTML={{ __html: beastShapes }}
          />
        </div>

        {/* Lightning — Apex+ */}
        {showLightning && (
          <svg
            style={{
              position: 'absolute',
              top: 8,
              left: '50%',
              marginLeft: -18,
              animation: 'lightningBlink 2.4s ease-in-out infinite',
              pointerEvents: 'none',
            }}
            width={36}
            height={90}
            viewBox="0 0 36 90"
          >
            <polyline
              points="18,0 12,38 22,38 8,90"
              fill="none"
              stroke={tier.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.85"
            />
          </svg>
        )}

        {/* Tier badge — top left */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 14,
          background: tier.badge,
          borderRadius: 20,
          padding: '4px 12px',
          fontSize: 11,
          fontWeight: 500,
          color: tier.bText,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          backdropFilter: 'blur(4px)',
          border: `0.5px solid ${tier.aura}`,
        }}>
          {tier.name}
        </div>

        {/* Level indicator — top right */}
        <div style={{
          position: 'absolute',
          top: 12,
          right: 14,
          fontSize: 11,
          fontWeight: 500,
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          Lv {lvl}
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
        background: 'rgba(255,255,255,0.04)',
        borderTop: '0.5px solid rgba(255,255,255,0.08)',
      }}>
        {/* XP / level progress */}
        <div style={{ padding: '12px 16px', borderRight: '0.5px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            {isMaxLevel ? 'Max rank reached' : 'Progress to next level'}
          </div>
          {!isMaxLevel && (
            <>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 4 }}>
                <div style={{
                  height: '100%',
                  borderRadius: 2,
                  background: tier.color,
                  width: `${xpPct}%`,
                  transition: 'width 0.8s ease',
                }} />
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                {progressXp} / {neededXp} XP
              </div>
            </>
          )}
          {isMaxLevel && (
            <div style={{ fontSize: 13, fontWeight: 500, color: tier.color }}>
              {branding.appName}
            </div>
          )}
        </div>

        {/* Streak + weather */}
        <div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            Streak
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: str === 0 ? '#f87171' : tier.color }}>
            {str === 0 ? 'Broken' : `${str} day${str === 1 ? '' : 's'}`}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>
            {weatherLabel.split(' — ')[0]}
          </div>
        </div>
      </div>

      {/* ── Mountain label ── */}
      <div style={{
        padding: '8px 16px 10px',
        fontSize: 10,
        color: 'rgba(255,255,255,0.22)',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        textAlign: 'center',
        borderTop: '0.5px solid rgba(255,255,255,0.05)',
      }}>
        {mountLabel}
      </div>

      {/* ── Keyframe styles ── */}
      <style>{`
        @keyframes beastFloat {
          0%, 100% { transform: translateX(-50%) translateY(0px); }
          50%       { transform: translateX(-50%) translateY(-7px); }
        }
        @keyframes lightningBlink {
          0%, 100% { opacity: 0; }
          8%, 28%  { opacity: 0.85; }
          18%      { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
