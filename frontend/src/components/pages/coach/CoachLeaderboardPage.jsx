import { useEffect, useState } from 'react'

function CoachLeaderboardPage({ authedFetch }) {
  const [scope, setScope] = useState('all_time') // 'all_time' | 'group'
  const [entries, setEntries] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState('ungrouped')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const url = scope === 'group'
        ? `/api/coach/leaderboard/?scope=group&group_id=${selectedGroupId}`
        : '/api/coach/leaderboard/?scope=all_time'
      
      const data = await authedFetch(url)
      setEntries(data.entries || [])
      if (data.groups) {
        setGroups(data.groups)
      }
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [scope, selectedGroupId])

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">Leaderboard</h2>
          <p className="mt-1 text-sm text-zinc-500 font-semibold">Rank your clients by total XP.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-200/50 rounded-2xl p-1 w-full max-w-sm">
        <button
          onClick={() => setScope('all_time')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${scope === 'all_time' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          All-Time
        </button>
        <button
          onClick={() => setScope('group')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${scope === 'group' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          By Group
        </button>
      </div>

      {/* Group Picker */}
      {scope === 'group' && (
        <div className="flex items-center gap-4">
          <label className="text-sm font-bold text-zinc-500">Select Group:</label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="rounded-xl border-2 border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-900 focus:border-zinc-400 focus:outline-none cursor-pointer"
          >
            <option value="ungrouped">Ungrouped (No Group)</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Leaderboard Table */}
      {error ? (
        <div className="p-12 text-center text-sm font-bold text-red-500">{error}</div>
      ) : loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 rounded-full border-4 border-zinc-200 border-t-zinc-900 animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center">
          <p className="text-sm font-bold text-zinc-400">No clients found for this view.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm text-zinc-600">
            <thead className="bg-zinc-50 text-xs font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-200">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4 text-right">XP</th>
                <th className="px-6 py-4 text-right">Level</th>
                <th className="px-6 py-4 text-right">Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {entries.map((entry, idx) => {
                const isTop3 = entry.rank <= 3
                return (
                  <tr key={entry.user_id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 font-black">
                      <span className={`${isTop3 ? 'text-amber-500 text-base' : 'text-zinc-500 text-sm'}`}>
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-zinc-900">
                      {entry.name || 'Unnamed Client'}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-zinc-900">
                      {(entry.xp || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-zinc-600">
                      Lv.{entry.level}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-zinc-600">
                      🔥 {entry.streak}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default CoachLeaderboardPage
