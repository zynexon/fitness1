/**
 * CoachDashboardPlaceholder.jsx — Visual verification page for CoachShell
 *
 * Renders inside CoachShell with placeholder content to verify the shell works.
 * NOT linked from client nav — scaffolding for the next task.
 *
 * Usage (from a future route or dev toggle):
 *   import CoachShell from '../layout/CoachShell'
 *   import CoachDashboardPlaceholder from './CoachDashboardPlaceholder'
 *
 *   <CoachShell coachName="Demo Coach" activePage="dashboard">
 *     <CoachDashboardPlaceholder />
 *   </CoachShell>
 */

function CoachDashboardPlaceholder() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm font-semibold text-zinc-500">
          Overview of your coaching activity
        </p>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Clients', value: '—', icon: '👥' },
          { label: 'Programs', value: '—', icon: '📋' },
          { label: 'Avg. Streak', value: '—', icon: '🔥' },
          { label: 'Weekly Sessions', value: '—', icon: '⚡' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
                {stat.label}
              </p>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className="mt-3 text-3xl font-black text-zinc-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Placeholder table */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-700">
            Client Overview
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-widest text-zinc-400">Name</th>
                <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-widest text-zinc-400">Level</th>
                <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-widest text-zinc-400">Streak</th>
                <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-widest text-zinc-400">Last Active</th>
                <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-widest text-zinc-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-zinc-50 last:border-0">
                  <td className="px-5 py-3 text-zinc-400 italic">Placeholder</td>
                  <td className="px-5 py-3 text-zinc-400">—</td>
                  <td className="px-5 py-3 text-zinc-400">—</td>
                  <td className="px-5 py-3 text-zinc-400">—</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-400">
                      Pending
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info notice */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
        <p className="text-xs font-black uppercase tracking-widest text-blue-700">
          Scaffolding Mode
        </p>
        <p className="mt-1 text-sm font-semibold text-blue-900">
          This is a placeholder page to verify the Coach Dashboard shell renders correctly.
          Real dashboard pages will be built in the next task.
        </p>
      </div>
    </div>
  )
}

export default CoachDashboardPlaceholder
