/**
 * ResponsiveNav.jsx — Breakpoint-aware navigation
 *
 * Mobile (<lg):  Bottom floating pill nav (same visual as original Navbar)
 * Desktop (≥lg): Persistent left sidebar with icons + labels
 *
 * Props contract (unchanged from Navbar.jsx):
 *   activeTab: string   — current active tab name
 *   onChange:  function  — called with tab name when user clicks
 */

const NAV_ITEMS = [
  { key: 'Home',        icon: '🏠', label: 'Home' },
  { key: 'Workout',     icon: '🏋️', label: 'Workout' },
  { key: 'Journal',     icon: '📖', label: 'Journal' },
  { key: 'Leaderboard', icon: '🏆', label: 'Leaderboard' },
  { key: 'Profile',     icon: '👤', label: 'Profile' },
]

function ResponsiveNav({ activeTab, onChange }) {
  return (
    <>
      {/* ── Mobile bottom nav (visible below lg) ──────────────────────────── */}
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 lg:hidden">
        <nav className="bg-white/80 backdrop-blur-md shadow-lg rounded-full border border-black/70 px-4 py-2">
          <ul className="flex items-center gap-2 text-center text-[11px] font-bold tracking-wide">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onChange(item.key)}
                  className={`px-4 py-2 rounded-full transition-all duration-300 ${
                    activeTab === item.key
                      ? 'bg-zinc-900 text-white shadow-md shadow-zinc-900/20'
                      : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* ── Desktop sidebar (visible at lg+) ──────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[240px] lg:min-h-[100dvh] lg:fixed lg:left-0 lg:top-0 lg:z-40 bg-[#f0ede6] border-r border-zinc-200/80">
        {/* Brand header */}
        <div className="px-5 pt-6 pb-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-900">
            ZYNEXON
          </p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
            The War Within
          </p>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-zinc-300/60" />

        {/* Nav items */}
        <nav className="flex-1 px-3 pt-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                activeTab === item.key
                  ? 'bg-zinc-900 text-white shadow-md shadow-zinc-900/15'
                  : 'text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom spacer */}
        <div className="px-4 py-4">
          <div className="h-px bg-zinc-300/60" />
          <p className="mt-3 text-[9px] font-semibold uppercase tracking-widest text-zinc-400">
            v1.0
          </p>
        </div>
      </aside>
    </>
  )
}

export default ResponsiveNav
