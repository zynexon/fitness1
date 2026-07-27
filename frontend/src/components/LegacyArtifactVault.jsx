import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Artifact icon SVGs ───────────────────────────────────────────────────────
function ArtifactIcon({ iconKey, size = 48, color = '#a78bfa', dim = false }) {
  const s = size
  const c = color
  const glow = dim ? 'none' : `drop-shadow(0 0 6px ${color}88)`
  const opacity = dim ? 0.4 : 1

  const icons = {
    flame: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <path d="M24 4C24 4 32 14 32 22C32 27.5 28.5 32 24 34C22 30 20 26 21 21C21 21 16 26 16 32C16 38.6 19.6 43 24 44C30.6 44 36 38.6 36 32C36 24 29 14 24 4Z" fill={c} opacity="0.9"/>
        <path d="M24 28C24 28 27 31 27 34C27 36.8 25.7 38 24 38C22.3 38 21 36.8 21 34C21 31 24 28 24 28Z" fill={dim ? '#52525b' : '#fbbf24'} opacity="0.8"/>
      </svg>
    ),
    phoenix: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <path d="M24 8L28 18L38 14L30 22L38 26L28 26L32 36L24 30L16 36L20 26L10 26L18 22L10 14L20 18L24 8Z" fill={c} opacity="0.9"/>
        <circle cx="24" cy="24" r="5" fill={dim ? '#52525b' : '#ef4444'} opacity="0.7"/>
        <path d="M24 4L26 10L24 8L22 10L24 4Z" fill={c}/>
      </svg>
    ),
    crown: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <path d="M8 36L8 28L14 16L24 26L34 16L40 28L40 36Z" fill={c} opacity="0.85"/>
        <rect x="6" y="34" width="36" height="6" rx="3" fill={c}/>
        <circle cx="8" cy="28" r="3" fill={dim ? '#52525b' : '#e879f9'} opacity="0.9"/>
        <circle cx="24" cy="22" r="3.5" fill={dim ? '#52525b' : '#e879f9'} opacity="0.9"/>
        <circle cx="40" cy="28" r="3" fill={dim ? '#52525b' : '#e879f9'} opacity="0.9"/>
      </svg>
    ),
    matrix: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        {[0,1,2,3].map(row => [0,1,2,3].map(col => (
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
        <polygon points="24,4 40,20 24,20" fill={dim ? '#3f3f46' : '#e0f2fe'} opacity="0.4"/>
        <polygon points="8,20 24,20 24,44" fill={c} opacity="0.5"/>
        <line x1="24" y1="4" x2="24" y2="44" stroke={dim ? '#3f3f46' : '#fff'} strokeWidth="0.5" opacity="0.3"/>
        <line x1="8" y1="20" x2="40" y2="20" stroke={dim ? '#3f3f46' : '#fff'} strokeWidth="0.5" opacity="0.3"/>
      </svg>
    ),
    spine: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <rect x="20" y="4" width="8" height="8" rx="2" fill={c}/>
        {[14,22,30].map(y => (
          <g key={y}>
            <rect x="18" y={y} width="12" height="7" rx="2" fill={c} opacity="0.9"/>
            <line x1="10" y1={y+3.5} x2="18" y2={y+3.5} stroke={c} strokeWidth="2" opacity="0.6"/>
            <line x1="30" y1={y+3.5} x2="38" y2={y+3.5} stroke={c} strokeWidth="2" opacity="0.6"/>
          </g>
        ))}
        <rect x="20" y="36" width="8" height="8" rx="2" fill={c}/>
      </svg>
    ),
    chain: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        {[0,1,2,3].map(i => (
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
        <path d="M24 22C22 26 20 30 22 34C22.7 35.7 23.3 37 24 37C24.7 37 25.3 35.7 26 34C28 30 26 26 24 22Z" fill={dim ? '#52525b' : '#fbbf24'} opacity="0.9"/>
        <circle cx="24" cy="8" r="4" fill={dim ? '#52525b' : '#fde68a'} opacity="0.7"/>
        <path d="M18 8C18 8 12 4 10 8" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        <path d="M30 8C30 8 36 4 38 8" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      </svg>
    ),
    seal: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <polygon points="24,4 29,16 42,16 32,24 36,37 24,30 12,37 16,24 6,16 19,16" fill={c} opacity="0.9"/>
        <polygon points="24,12 27,20 36,20 29,25 32,33 24,28 16,33 19,25 12,20 21,20" fill={dim ? '#1c1c24' : '#09090b'} opacity="0.3"/>
      </svg>
    ),
    relic: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <rect x="10" y="18" width="28" height="20" rx="4" fill={c} opacity="0.85"/>
        <rect x="16" y="10" width="16" height="10" rx="3" fill={c} opacity="0.7"/>
        <rect x="20" y="6" width="8" height="6" rx="2" fill={c} opacity="0.5"/>
        <line x1="10" y1="26" x2="38" y2="26" stroke={dim ? '#3f3f46' : '#fff'} strokeWidth="1" opacity="0.3"/>
        <circle cx="24" cy="30" r="4" fill={dim ? '#52525b' : '#fbbf24'} opacity="0.9"/>
      </svg>
    ),
    locked: (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <rect x="12" y="22" width="24" height="20" rx="4" fill="#27272a"/>
        <path d="M16 22V18C16 12.5 20.5 8 26 8C29 8 31.7 9.2 33.7 11.2" stroke="#3f3f46" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <circle cx="24" cy="32" r="3" fill="#3f3f46"/>
        <line x1="24" y1="32" x2="24" y2="38" stroke="#3f3f46" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
  }
  return (
    <div style={{ filter: glow, opacity, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icons[iconKey] || icons.locked}
    </div>
  )
}

// ─── Rarity config ────────────────────────────────────────────────────────────
const RARITY = {
  common:    { label: 'Common',    shimmer: ['#a1a1aa','#71717a','#a1a1aa'], text: '#a1a1aa', ring: '#52525b' },
  rare:      { label: 'Rare',      shimmer: ['#60a5fa','#3b82f6','#93c5fd'], text: '#93c5fd', ring: '#3b82f6' },
  epic:      { label: 'Epic',      shimmer: ['#a78bfa','#7c3aed','#c4b5fd'], text: '#c4b5fd', ring: '#7c3aed' },
  legendary: { label: 'Legendary', shimmer: ['#fbbf24','#f59e0b','#fde68a'], text: '#fde68a', ring: '#f59e0b' },
  mythic:    { label: 'Mythic',    shimmer: ['#f0abfc','#d946ef','#f5d0fe'], text: '#f5d0fe', ring: '#d946ef' },
}

// ─── Holographic card ─────────────────────────────────────────────────────────
function HoloCard({ artifact, onClick }) {
  const cardRef = useRef(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [shine, setShine] = useState({ x: 50, y: 50 })
  const [hovered, setHovered] = useState(false)
  const r = RARITY[artifact.rarity] || RARITY.common
  const earned = artifact.earned

  function handleMouseMove(e) {
    if (!cardRef.current || !earned) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 18
    const y = -((e.clientY - rect.top) / rect.height - 0.5) * 18
    const sx = ((e.clientX - rect.left) / rect.width) * 100
    const sy = ((e.clientY - rect.top) / rect.height) * 100
    setTilt({ x, y })
    setShine({ x: sx, y: sy })
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 })
    setShine({ x: 50, y: 50 })
    setHovered(false)
  }

  const shimmerColors = r.shimmer.join(', ')

  return (
    <div
      ref={cardRef}
      onClick={() => onClick(artifact)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        cursor: 'pointer',
        borderRadius: 16,
        transform: earned
          ? `perspective(600px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale(${hovered ? 1.04 : 1})`
          : 'none',
        transition: hovered ? 'none' : 'transform 0.5s cubic-bezier(0.23,1,0.32,1)',
        userSelect: 'none',
      }}
    >
      {/* Card body */}
      <div style={{
        background: earned
          ? `linear-gradient(145deg, #1c1917 0%, #0c0a09 60%, #1c1917 100%)`
          : '#0c0c0c',
        border: `1.5px solid ${earned ? r.ring : '#27272a'}`,
        borderRadius: 16,
        padding: '20px 16px 16px',
        minHeight: 160,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Holographic shimmer overlay — only earned cards */}
        {earned && (
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, ${r.shimmer[0]}22, transparent 55%),
                         linear-gradient(125deg, ${r.shimmer[0]}18 0%, transparent 40%, ${r.shimmer[2]}14 60%, transparent 100%)`,
            borderRadius: 16,
            pointerEvents: 'none',
            mixBlendMode: 'screen',
            transition: hovered ? 'none' : 'background 0.4s',
          }}/>
        )}

        {/* Subtle grid texture */}
        {earned && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 16,
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 11px, ${r.ring}0a 11px, ${r.ring}0a 12px),
                               repeating-linear-gradient(90deg, transparent, transparent 11px, ${r.ring}0a 11px, ${r.ring}0a 12px)`,
            pointerEvents: 'none',
          }}/>
        )}

        {/* Rarity label */}
        <div style={{
          alignSelf: 'flex-end',
          fontSize: 9, fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: earned ? r.text : '#52525b',
          background: earned ? `${r.ring}22` : '#1c1c1e',
          border: `0.5px solid ${earned ? r.ring + '66' : '#27272a'}`,
          borderRadius: 6, padding: '2px 7px',
          position: 'relative', zIndex: 1,
        }}>
          {earned ? r.label : '???'}
        </div>

        {/* Icon */}
        <div style={{ position: 'relative', zIndex: 1, filter: earned ? undefined : 'brightness(0.6)' }}>
          <ArtifactIcon iconKey={artifact.icon_key} size={52} color={artifact.color_primary} dim={!earned} />
        </div>

        {/* Name */}
        <p style={{
          margin: 0, textAlign: 'center',
          fontSize: 12, fontWeight: 700,
          color: earned ? '#f4f4f5' : '#3f3f46',
          letterSpacing: '0.02em',
          lineHeight: 1.3,
          position: 'relative', zIndex: 1,
        }}>
          {artifact.name}
        </p>

        {/* Equipped badge */}
        {artifact.is_equipped && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: '#fbbf2422', border: '0.5px solid #fbbf2488',
            borderRadius: 6, padding: '2px 7px',
            fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: '#fbbf24',
          }}>
            Equipped
          </div>
        )}

        {/* Lock overlay */}
        {!earned && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 16,
            background: 'rgba(9,9,11,0.45)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="12" rx="3" fill="#27272a"/>
              <path d="M8 11V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V11" stroke="#52525b" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Artifact detail modal ────────────────────────────────────────────────────
function ArtifactModal({ artifact, onClose, onEquip, onUnequip }) {
  const [spinning, setSpinning] = useState(false)
  const r = RARITY[artifact.rarity] || RARITY.common

  useEffect(() => {
    setSpinning(true)
    const t = setTimeout(() => setSpinning(false), 1200)
    return () => clearTimeout(t)
  }, [artifact.slug])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0 0 0',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440,
          background: '#0c0a09',
          border: `1px solid ${r.ring}55`,
          borderRadius: '24px 24px 0 0',
          padding: '28px 24px 36px',
          animation: 'slideUp 0.32s cubic-bezier(0.23,1,0.32,1)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'transparent', border: 'none',
            color: '#71717a', cursor: 'pointer', fontSize: 20, padding: 4,
          }}
        >✕</button>

        {/* Icon with spin */}
        <div style={{
          display: 'flex', justifyContent: 'center', marginBottom: 16,
          animation: spinning ? 'spinIn 1.2s cubic-bezier(0.23,1,0.32,1)' : 'none',
        }}>
          {artifact.earned ? (
            <div style={{
              width: 100, height: 100,
              background: `radial-gradient(circle, ${artifact.color_primary}22 0%, transparent 70%)`,
              border: `1.5px solid ${r.ring}44`,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 32px ${artifact.color_primary}33`,
            }}>
              <ArtifactIcon iconKey={artifact.icon_key} size={56} color={artifact.color_primary} />
            </div>
          ) : (
            <div style={{
              width: 100, height: 100,
              background: `radial-gradient(circle, ${artifact.color_primary}22 0%, #1c1917 70%)`,
              border: `1.5px solid ${artifact.color_primary}33`,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 22px ${artifact.color_primary}33`,
            }}>
              <ArtifactIcon iconKey={artifact.icon_key} size={48} color={artifact.color_primary} />
            </div>
          )}
        </div>

        {/* Rarity pill */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: artifact.earned ? r.text : '#52525b',
            background: artifact.earned ? `${r.ring}22` : '#1c1917',
            border: `0.5px solid ${artifact.earned ? r.ring + '55' : '#27272a'}`,
            borderRadius: 8, padding: '3px 10px',
          }}>
            {artifact.earned ? r.label : 'Locked'}
          </span>
        </div>

        {/* Name */}
        <h2 style={{
          margin: '0 0 4px',
          textAlign: 'center',
          fontSize: 22, fontWeight: 800,
          color: artifact.earned ? '#f4f4f5' : '#52525b',
          letterSpacing: '-0.02em',
        }}>
          {artifact.earned ? artifact.name : '???'}
        </h2>

        {/* Lore */}
        <p style={{
          margin: '12px 0 0',
          fontSize: 13,
          color: artifact.earned ? '#a1a1aa' : '#3f3f46',
          lineHeight: 1.7,
          textAlign: 'center',
          fontStyle: 'italic',
        }}>
          "{artifact.lore}"
        </p>

        {/* Metadata */}
        {artifact.earned && artifact.season_label && (
          <div style={{
            marginTop: 20,
            background: '#1c1917',
            border: '0.5px solid #27272a',
            borderRadius: 12,
            padding: '10px 16px',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#52525b' }}>Earned</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: '#d4d4d8' }}>{artifact.season_label}</p>
            </div>
            {artifact.prestige_at_earn > 0 && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#52525b' }}>Prestige</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: r.text }}>Ψ {artifact.prestige_at_earn}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {artifact.earned && (
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            {artifact.is_equipped ? (
              <button
                onClick={() => onUnequip(artifact)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12,
                  background: 'transparent',
                  border: '1px solid #27272a',
                  color: '#71717a', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '0.06em',
                }}
              >
                Unequip
              </button>
            ) : (
              <button
                onClick={() => onEquip(artifact)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12,
                  background: `linear-gradient(135deg, ${artifact.color_primary}, ${artifact.color_secondary})`,
                  border: 'none',
                  color: '#fff', fontSize: 13, fontWeight: 800,
                  cursor: 'pointer', letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Equip Artifact
              </button>
            )}
          </div>
        )}

        {!artifact.earned && (
          <div style={{
            marginTop: 16,
            background: '#1c1917',
            border: '0.5px solid #27272a',
            borderRadius: 12, padding: '10px 16px',
            textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: 11, color: '#52525b', letterSpacing: '0.06em' }}>
              {unlockLabel(artifact.unlock_condition)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function unlockLabel(condition) {
  const map = {
    prestige_1: 'Reset at Level 20+ for the first time',
    prestige_2: 'Complete your second prestige reset',
    prestige_3: 'Complete your third prestige reset',
    prestige_4: 'Complete your fourth prestige reset',
    prestige_5: 'Complete your fifth prestige reset',
    streak_30_clean: 'Maintain a 30-day streak',
    streak_60: 'Maintain a 60-day streak',
    streak_100: 'Maintain a 100-day streak',
    xp_10000: 'Earn 10,000 total XP',
    xp_50000: 'Earn 50,000 total XP',
  }
  return map[condition] || condition
}

// ─── Prestige confirmation modal ──────────────────────────────────────────────
function PrestigeModal({ currentLevel, prestigeLevel, onConfirm, onCancel, loading }) {
  const nextPrestige = prestigeLevel + 1
  const artifactNames = {
    1: 'The Ember Sigil',
    2: 'Iron Phoenix',
    3: 'The Obsidian Crown',
    4: 'Void Matrix',
    5: 'Diamond Neural Core',
  }
  const nextArtifact = artifactNames[nextPrestige]

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 380,
          background: '#0c0a09',
          border: '1px solid #ef444455',
          borderRadius: 20,
          padding: '32px 24px',
          animation: 'popIn 0.28s cubic-bezier(0.23,1,0.32,1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔥</div>
          <h2 style={{
            margin: 0, fontSize: 22, fontWeight: 800,
            color: '#f4f4f5', letterSpacing: '-0.02em',
          }}>
            Prestige {nextPrestige}
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#71717a', lineHeight: 1.6 }}>
            You are about to burn everything. Your XP, level, and streak reset to zero. Your legacy is permanent.
          </p>
        </div>

        {/* What resets */}
        <div style={{
          background: '#1c0a0a', border: '0.5px solid #ef444433',
          borderRadius: 12, padding: '14px 16px', marginBottom: 16,
        }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ef4444' }}>
            Permanently reset
          </p>
          {[`Level ${currentLevel} → Level 1`, 'All XP → 0', 'Streak → 0', 'All shields consumed'].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ef444488', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 12, color: '#a1a1aa' }}>{item}</p>
            </div>
          ))}
        </div>

        {/* What you earn */}
        {nextArtifact && (
          <div style={{
            background: '#0a1a0a', border: '0.5px solid #22c55e33',
            borderRadius: 12, padding: '14px 16px', marginBottom: 24,
          }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#22c55e' }}>
              You will earn
            </p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#86efac' }}>
              ✦ {nextArtifact}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#52525b' }}>
              Prestige Ψ{nextPrestige} — sealed in your vault forever
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1, padding: '13px', borderRadius: 12,
              background: 'transparent', border: '1px solid #27272a',
              color: '#71717a', fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 2, padding: '13px', borderRadius: 12,
              background: loading ? '#27272a' : 'linear-gradient(135deg, #dc2626, #7f1d1d)',
              border: 'none',
              color: loading ? '#71717a' : '#fff',
              fontSize: 13, fontWeight: 800,
              cursor: loading ? 'default' : 'pointer',
              letterSpacing: '0.06em',
            }}
          >
            {loading ? 'Burning...' : 'Burn Everything'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Prestige success screen ──────────────────────────────────────────────────
function PrestigeSuccess({ artifact, prestigeLevel, onClose }) {
  const r = artifact ? (RARITY[artifact.rarity] || RARITY.common) : RARITY.rare
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10002,
      background: '#000',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32,
      animation: 'fadeIn 0.5s ease',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <p style={{
          margin: '0 0 24px', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.3em', textTransform: 'uppercase', color: '#52525b',
        }}>
          Legacy Sealed
        </p>

        {artifact && (
          <div style={{
            width: 120, height: 120, margin: '0 auto 20px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${artifact.color_primary}33 0%, transparent 70%)`,
            border: `2px solid ${r.ring}66`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 60px ${artifact.color_primary}44`,
            animation: 'glowPulse 2s ease-in-out infinite',
          }}>
            <ArtifactIcon iconKey={artifact.icon_key} size={64} color={artifact.color_primary} />
          </div>
        )}

        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: r.text,
          background: `${r.ring}22`,
          border: `0.5px solid ${r.ring}55`,
          borderRadius: 8, padding: '3px 12px',
          display: 'inline-block', marginBottom: 12,
        }}>
          {artifact ? (RARITY[artifact.rarity]?.label || 'Artifact') : 'Artifact'}
        </div>

        <h1 style={{
          margin: '0 0 8px', fontSize: 28, fontWeight: 900,
          color: '#f4f4f5', letterSpacing: '-0.03em',
        }}>
          {artifact?.name || 'Artifact Earned'}
        </h1>

        <p style={{ margin: '0 0 8px', fontSize: 14, color: '#71717a' }}>
          Prestige Ψ{prestigeLevel} Achieved
        </p>

        <p style={{
          margin: '16px 0 32px',
          fontSize: 13, color: '#52525b',
          lineHeight: 1.7, fontStyle: 'italic',
        }}>
          "{artifact?.lore || 'The war begins again.'}"
        </p>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '14px',
            borderRadius: 14,
            background: artifact
              ? `linear-gradient(135deg, ${artifact.color_primary}, ${artifact.color_secondary})`
              : '#27272a',
            border: 'none', color: '#fff',
            fontSize: 14, fontWeight: 800,
            cursor: 'pointer', letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          The War Continues
        </button>
      </div>
    </div>
  )
}

// ─── Main Vault Page ──────────────────────────────────────────────────────────
export default function LegacyArtifactVault({
  authedFetch,
  onBack,
  user,
  level,
  xp,
}) {
  const [vault, setVault] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedArtifact, setSelectedArtifact] = useState(null)
  const [showPrestigeModal, setShowPrestigeModal] = useState(false)
  const [prestigeLoading, setPrestigeLoading] = useState(false)
  const [prestigeResult, setPrestigeResult] = useState(null)
  const [newlyEarned, setNewlyEarned] = useState([])
  const [filter, setFilter] = useState('all')

  const canPrestige = level >= 20

  useEffect(() => {
    loadVault()
  }, [])

  useEffect(() => {
    const prevBodyBg = document.body.style.backgroundColor
    const prevHtmlBg = document.documentElement.style.backgroundColor
    document.body.style.backgroundColor = '#000'
    document.documentElement.style.backgroundColor = '#000'
    return () => {
      document.body.style.backgroundColor = prevBodyBg
      document.documentElement.style.backgroundColor = prevHtmlBg
    }
  }, [])

  async function loadVault() {
    setLoading(true)
    setError('')
    try {
      const data = await authedFetch('/api/user/vault/')
      setVault(data)
      if (data.newly_earned?.length) {
        setNewlyEarned(data.newly_earned)
      }
    } catch (err) {
      setError(err.message || 'Could not load vault.')
    } finally {
      setLoading(false)
    }
  }

  async function handleEquip(artifact) {
    try {
      await authedFetch('/api/user/artifact/equip/', {
        method: 'PATCH',
        body: JSON.stringify({ artifact_id: artifact.id }),
      })
      setVault(prev => {
        if (!prev?.artifacts) {
          return prev
        }
        return {
          ...prev,
          artifacts: prev.artifacts.map(a => ({
            ...a,
            is_equipped: a.id === artifact.id,
          })),
        }
      })
      setSelectedArtifact(prev => (prev ? { ...prev, is_equipped: prev.id === artifact.id } : prev))
    } catch (err) {
      setError(err.message || 'Could not equip artifact.')
    }
  }

  async function handleUnequip() {
    try {
      await authedFetch('/api/user/artifact/equip/', {
        method: 'PATCH',
        body: JSON.stringify({ artifact_id: null }),
      })
      setVault(prev => {
        if (!prev?.artifacts) {
          return prev
        }
        return {
          ...prev,
          artifacts: prev.artifacts.map(a => ({ ...a, is_equipped: false })),
        }
      })
      setSelectedArtifact(prev => prev ? { ...prev, is_equipped: false } : null)
    } catch (err) {
      setError(err.message || 'Could not unequip artifact.')
    }
  }

  async function handlePrestige() {
    setPrestigeLoading(true)
    try {
      const data = await authedFetch('/api/user/prestige/', { method: 'POST' })
      setPrestigeResult(data)
      setShowPrestigeModal(false)
      await loadVault()
    } catch (err) {
      setError(err.message || 'Prestige failed.')
      setShowPrestigeModal(false)
    } finally {
      setPrestigeLoading(false)
    }
  }

  const filteredArtifacts = vault?.artifacts?.filter(a => {
    if (filter === 'earned') return a.earned
    if (filter === 'locked') return !a.earned
    return true
  }) || []

  const equippedArtifact = vault?.artifacts?.find(a => a.is_equipped)

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 0 }} />
      <div style={{
        minHeight: '100vh',
        background: '#000',
        color: '#f4f4f5',
        fontFamily: "'Manrope', sans-serif",
        margin: '-12px -20px -96px',
        padding: '16px 20px 120px',
        position: 'relative',
        zIndex: 1,
      }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes popIn {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spinIn {
          from { transform: rotateY(-180deg) scale(0.6); opacity: 0; }
          to { transform: rotateY(0deg) scale(1); opacity: 1; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes newEarnedPop {
          0% { transform: scale(0.8); opacity: 0; }
          70% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '16px 20px 12px',
        borderBottom: '0.5px solid #1c1917',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent', border: '0.5px solid #27272a',
            borderRadius: 10, padding: '7px 14px',
            color: '#a1a1aa', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '0.04em',
          }}
        >
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#52525b' }}>
            Legacy System
          </p>
          <h1 style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em', color: '#f4f4f5' }}>
            The Vault
          </h1>
        </div>
        {vault && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#f4f4f5' }}>
              {vault.earned_count}<span style={{ fontSize: 11, color: '#52525b', fontWeight: 600 }}>/{vault.total_count}</span>
            </p>
            <p style={{ margin: '1px 0 0', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#52525b' }}>
              Relics
            </p>
          </div>
        )}
      </div>

      {/* Newly earned banner */}
      {newlyEarned.length > 0 && (
        <div style={{
          margin: '12px 20px',
          background: '#0a1a0a', border: '0.5px solid #22c55e44',
          borderRadius: 14, padding: '14px 16px',
          animation: 'newEarnedPop 0.5s cubic-bezier(0.23,1,0.32,1)',
        }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#22c55e' }}>
            New relics unlocked
          </p>
          {newlyEarned.map(a => (
            <p key={a.slug} style={{ margin: '2px 0', fontSize: 13, fontWeight: 700, color: '#86efac' }}>
              ✦ {a.name}
            </p>
          ))}
        </div>
      )}

      {/* Prestige section */}
      <div style={{ margin: '16px 20px' }}>
        <div style={{
          background: canPrestige
            ? 'linear-gradient(135deg, #1c0a00, #0c0a09)'
            : '#0c0a09',
          border: `0.5px solid ${canPrestige ? '#f9731644' : '#1c1917'}`,
          borderRadius: 16, padding: '18px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#52525b' }}>
                  Prestige
                </p>
                {vault && vault.prestige_level > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 800, color: '#f97316',
                    background: '#f9731622', border: '0.5px solid #f9731644',
                    borderRadius: 6, padding: '1px 8px', letterSpacing: '0.06em',
                  }}>
                    Ψ {vault?.prestige_level}
                  </span>
                )}
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', color: canPrestige ? '#fed7aa' : '#3f3f46' }}>
                {canPrestige ? 'Ready to Burn.' : `Reach Level 20 First`}
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: canPrestige ? '#a1a1aa' : '#27272a', lineHeight: 1.6 }}>
                {canPrestige
                  ? 'Reset everything. Earn a legacy artifact that can never be taken. Your vault is permanent.'
                  : `Current level: ${level}. You need ${Math.max(0, 20 - level)} more levels.`}
              </p>
            </div>
            <button
              onClick={() => canPrestige && setShowPrestigeModal(true)}
              disabled={!canPrestige}
              style={{
                padding: '10px 16px', borderRadius: 12,
                background: canPrestige ? 'linear-gradient(135deg, #f97316, #c2410c)' : '#1c1917',
                border: `0.5px solid ${canPrestige ? '#f9731666' : '#27272a'}`,
                color: canPrestige ? '#fff' : '#3f3f46',
                fontSize: 12, fontWeight: 800,
                cursor: canPrestige ? 'pointer' : 'not-allowed',
                letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {canPrestige ? 'Prestige →' : 'Locked'}
            </button>
          </div>

          {/* XP progress to Level 20 if not yet there */}
          {!canPrestige && (
            <div style={{ marginTop: 12 }}>
              <div style={{ height: 3, background: '#1c1917', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  background: '#f97316',
                  width: `${Math.min(100, (level / 20) * 100)}%`,
                  transition: 'width 0.8s ease',
                }} />
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 10, color: '#52525b' }}>Level {level} / 20</p>
            </div>
          )}
        </div>
      </div>

      {/* Currently equipped */}
      {equippedArtifact && (
        <div style={{ margin: '0 20px 16px' }}>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#52525b' }}>
            Displaying
          </p>
          <div
            onClick={() => setSelectedArtifact(equippedArtifact)}
            style={{
              background: '#18181b',
              border: `0.5px solid ${RARITY[equippedArtifact.rarity]?.ring}55`,
              borderRadius: 14, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
              cursor: 'pointer',
            }}
          >
            <ArtifactIcon iconKey={equippedArtifact.icon_key} size={36} color={equippedArtifact.color_primary} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#f4f4f5' }}>{equippedArtifact.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: RARITY[equippedArtifact.rarity]?.text }}>
                {RARITY[equippedArtifact.rarity]?.label}
              </p>
            </div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#fbbf24', background: '#fbbf2422',
              border: '0.5px solid #fbbf2444',
              borderRadius: 6, padding: '2px 8px',
            }}>
              Equipped
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ margin: '0 20px 16px', display: 'flex', gap: 6 }}>
        {[
          { key: 'all', label: `All (${vault?.total_count || 0})` },
          { key: 'earned', label: `Earned (${vault?.earned_count || 0})` },
          { key: 'locked', label: `Locked (${(vault?.total_count || 0) - (vault?.earned_count || 0)})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              flex: 1, padding: '8px 4px', borderRadius: 10,
              background: filter === f.key ? '#18181b' : 'transparent',
              border: `0.5px solid ${filter === f.key ? '#3f3f46' : '#1c1917'}`,
              color: filter === f.key ? '#f4f4f5' : '#52525b',
              fontSize: 11, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.04em',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Artifact grid */}
      <div style={{ padding: '0 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 12, color: '#52525b', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Loading vault...
            </p>
          </div>
        ) : error ? (
          <div style={{
            background: '#1c0a0a', border: '0.5px solid #ef444433',
            borderRadius: 12, padding: '16px',
          }}>
            <p style={{ margin: 0, fontSize: 13, color: '#f87171' }}>{error}</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}>
            {filteredArtifacts.map(artifact => (
              <HoloCard
                key={artifact.slug}
                artifact={artifact}
                onClick={setSelectedArtifact}
              />
            ))}
          </div>
        )}
      </div>

      {/* Artifact detail modal */}
      {selectedArtifact && (
        <ArtifactModal
          artifact={selectedArtifact}
          onClose={() => setSelectedArtifact(null)}
          onEquip={(a) => { handleEquip(a); setSelectedArtifact(null) }}
          onUnequip={() => { handleUnequip(); setSelectedArtifact(null) }}
        />
      )}

      {/* Prestige confirm modal */}
      {showPrestigeModal && (
        <PrestigeModal
          currentLevel={level}
          prestigeLevel={vault?.prestige_level || 0}
          onConfirm={handlePrestige}
          onCancel={() => setShowPrestigeModal(false)}
          loading={prestigeLoading}
        />
      )}

      {/* Prestige success overlay */}
      {prestigeResult && (
        <PrestigeSuccess
          artifact={prestigeResult.artifact}
          prestigeLevel={prestigeResult.prestige_level}
          onClose={() => setPrestigeResult(null)}
        />
      )}
      </div>
    </>
  )
}
