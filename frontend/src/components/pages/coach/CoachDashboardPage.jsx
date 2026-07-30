import { useEffect, useState } from 'react'

function StatCard({ label, value, subtext, icon, riskColors = null }) {
  return (
    <div className="group flex flex-col justify-between rounded-3xl border-2 border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-zinc-500">{label}</h3>
        {icon && <span className="text-xl shrink-0">{icon}</span>}
      </div>
      <div className="mt-4">
        <p className="text-4xl font-black tracking-tight text-zinc-900">{value}</p>
        {subtext && <p className="mt-1 text-xs font-semibold text-zinc-400">{subtext}</p>}
        {riskColors && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="whitespace-nowrap rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
              {riskColors.on_track || 0} On Track
            </span>
            <span className="whitespace-nowrap rounded-md bg-yellow-50 px-2.5 py-1 text-xs font-bold text-yellow-600">
              {riskColors.slipping || 0} Slipping
            </span>
            <span className="whitespace-nowrap rounded-md bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
              {riskColors.at_risk || 0} At Risk
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function ActivityFeed({ activities, navigate }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 py-16 text-center bg-white/50">
        <span className="mb-3 text-4xl opacity-50">💤</span>
        <h3 className="text-base font-bold text-zinc-400">No recent activity</h3>
        <p className="mt-1 text-sm font-semibold text-zinc-500">Your clients' actions will appear here in real-time.</p>
      </div>
    )
  }

  const getIconInfo = (type) => {
    switch (type) {
      case 'workout': return { icon: '💪', bg: 'bg-emerald-100', text: 'text-emerald-700' }
      case 'task': return { icon: '✅', bg: 'bg-blue-100', text: 'text-blue-700' }
      case 'journal': return { icon: '📝', bg: 'bg-purple-100', text: 'text-purple-700' }
      case 'body_metric': return { icon: '📏', bg: 'bg-orange-100', text: 'text-orange-700' }
      default: return { icon: '⚡', bg: 'bg-zinc-100', text: 'text-zinc-700' }
    }
  }

  const formatTime = (isoString) => {
    const d = new Date(isoString)
    const diff = Math.floor((new Date() - d) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div className="flex flex-col rounded-3xl border-2 border-zinc-200 bg-white/80 p-8 shadow-sm backdrop-blur-xl">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-xl font-black tracking-tight text-zinc-900">Live Client Activity</h3>
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 max-h-[500px] overflow-y-auto pr-2 pb-2">
        {activities.map((act) => {
          const { icon, bg, text } = getIconInfo(act.type)
          return (
            <div key={act.id} className="group relative flex items-start gap-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-zinc-300 hover:shadow-md">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${bg} ${text} text-xl shadow-sm transition-transform group-hover:scale-110`}>
                {icon}
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/coach/clients/${act.client_id}`)}
                    className="text-sm font-black tracking-wide text-zinc-900 hover:text-zinc-600 transition-colors"
                  >
                    {act.client_name}
                  </button>
                  <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">{formatTime(act.timestamp)}</span>
                </div>
                <p className="mt-1 text-xs font-bold leading-relaxed text-zinc-500 line-clamp-2">{act.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CoachDashboardPage({ authedFetch, navigate, coachName }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await authedFetch('/api/coach/dashboard/')
        setData(res)
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [authedFetch])

  const handleCopyInvite = () => {
    if (!data?.invite_url) return
    const rawUrl = data.invite_url
    const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${window.location.origin}${rawUrl}`
    navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerateInvite = async () => {
    try {
      const res = await authedFetch('/api/coach/invite/regenerate/', { method: 'POST' })
      if (res && res.invite_url) {
        setData(prev => ({ ...prev, invite_url: res.invite_url }))
        setCopied(false)
      }
    } catch (err) {
      console.error('Failed to regenerate invite', err)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <p className="text-sm font-bold text-zinc-400">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center p-12">
        <p className="text-sm font-bold text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900">Welcome back, {coachName || 'Coach'}</h1>
          <p className="mt-2 text-sm font-bold text-zinc-500">Here's a quick overview of your coaching operations.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-1 rounded-2xl border-2 border-zinc-200 bg-white p-1 shadow-sm transition-all hover:border-zinc-300">
            <button
              onClick={handleCopyInvite}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-900 transition hover:bg-zinc-100"
            >
              {copied ? '✅ Copied!' : '🔗 Copy Invite Link'}
            </button>
            <button
              onClick={handleRegenerateInvite}
              title="Generate a new single-use link"
              className="flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900"
            >
              <span>🔄</span>
              <span>New Link</span>
            </button>
          </div>
          <button
            onClick={() => navigate('/coach/clients')}
            className="flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md transition hover:bg-black hover:-translate-y-0.5"
          >
            View Roster
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 items-start">
        <StatCard
          label="Total Clients"
          value={data.total_clients}
          icon="👥"
          riskColors={data.risk_breakdown}
        />
        <StatCard
          label="Weekly Engagement"
          value={data.weekly_engagement}
          subtext="Actions completed this week"
          icon="🔥"
        />
        <StatCard
          label="Groups"
          value={data.total_groups}
          subtext={`${data.ungrouped_client_count} ungrouped clients`}
          icon="🛡️"
        />
        <StatCard
          label="Programs & Exercises"
          value={data.total_programs}
          subtext={`${data.total_exercises} exercises available`}
          icon="📋"
        />
        <StatCard
          label="New Clients"
          value={data.new_clients_this_week}
          subtext="Joined this week"
          icon="✨"
        />
        <StatCard
          label="Archived Clients"
          value={data.archived_client_count}
          subtext="Inactive clients"
          icon="🗄️"
        />
      </div>

      <ActivityFeed activities={data.recent_activities} navigate={navigate} />
    </div>
  )
}

export default CoachDashboardPage
