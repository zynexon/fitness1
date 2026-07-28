/**
 * CoachShell.jsx — Desktop-first layout shell for the Coach Dashboard
 *
 * Designed for data-dense admin/coach views. Not wired to real routes yet —
 * scaffolding for the next task to drop pages into.
 *
 * Layout:
 *   - Persistent dark left sidebar (260px) with placeholder nav items
 *   - Top header bar with coach name/logout slot
 *   - Main content area (max-w-7xl) with generous padding
 *   - <768px shows a "please use desktop" notice
 *
 * Props:
 *   children      — page content
 *   coachName     — display name for the header (default: 'Coach')
 *   onLogout      — logout handler for the header button
 *   activePage    — active nav item key for highlighting
 *   onNavigate    — nav item click handler (receives page key)
 */

const COACH_NAV_ITEMS = [
  { key: 'dashboard',  icon: '📊', label: 'Dashboard' },
  { key: 'clients',    icon: '👥', label: 'Clients' },
  { key: 'exercises',  icon: '💪', label: 'Exercises' },
  { key: 'programs',   icon: '📋', label: 'Programs' },
  { key: 'analytics',  icon: '📈', label: 'Analytics' },
  { key: 'settings',   icon: '⚙️', label: 'Settings' },
]

function CoachShell({
  children,
  coachName = 'Coach',
  onLogout,
  activePage = 'dashboard',
  onNavigate,
}) {
  return (
    <div className="min-h-[100dvh] bg-zinc-100">
      {/* ── Small-screen notice (below md) ──────────────────────────────── */}
      <div className="md:hidden fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950 p-6">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-4xl">🖥️</p>
          <h2 className="text-xl font-black text-white tracking-tight">
            Desktop Required
          </h2>
          <p className="text-sm font-semibold text-zinc-400 leading-relaxed">
            The Coach Dashboard is optimized for desktop screens.
            Please switch to a device with at least 768px width for the best experience.
          </p>
        </div>
      </div>

      {/* ── Desktop layout (md+) ────────────────────────────────────────── */}
      <div className="hidden md:flex min-h-[100dvh]">
        {/* Sidebar */}
        <aside className="w-[260px] min-h-[100dvh] bg-zinc-950 border-r border-zinc-800 flex flex-col flex-shrink-0 fixed left-0 top-0 z-40">
          {/* Brand */}
          <div className="px-5 pt-6 pb-4">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-white">
              ZYNEXON
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
              Coach Dashboard
            </p>
          </div>

          <div className="mx-4 h-px bg-zinc-800" />

          {/* Nav items */}
          <nav className="flex-1 px-3 pt-4 space-y-1">
            {COACH_NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate?.(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activePage === item.key
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Sidebar footer */}
          <div className="px-4 py-4">
            <div className="h-px bg-zinc-800" />
            <p className="mt-3 text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
              Coach Panel v1.0
            </p>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex-1 ml-[260px] flex flex-col min-h-[100dvh]">
          {/* Top header bar */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/80 backdrop-blur-md px-8 py-3">
            <div>
              <p className="text-sm font-bold text-zinc-900">
                Welcome, {coachName}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {onLogout ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                >
                  Log out
                </button>
              ) : null}
            </div>
          </header>

          {/* Content area */}
          <main className="flex-1 mx-auto w-full max-w-7xl px-8 py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

export default CoachShell
