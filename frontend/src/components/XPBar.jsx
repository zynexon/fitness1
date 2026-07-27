function XPBar({ currentXp, targetXp }) {
  const percentage = Math.min(100, Math.round((currentXp / targetXp) * 100))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-500">
        <span>{currentXp} XP</span>
        <span>{targetXp} XP</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200/80 shadow-inner">
        <div
          className="relative h-full rounded-full bg-gradient-to-r from-zinc-700 via-zinc-900 to-black transition-all duration-700 ease-out"
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute right-0 top-0 h-full w-4 overflow-hidden shadow-[0_0_12px_4px_rgba(255,255,255,0.4)] mix-blend-overlay" />
        </div>
      </div>
    </div>
  )
}

export default XPBar
