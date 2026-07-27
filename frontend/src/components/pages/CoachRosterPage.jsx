import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import branding from '../../config/branding'

function CoachRosterPage({ authedFetch }) {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteData, setInviteData] = useState(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchRoster = async () => {
    try {
      const data = await authedFetch('/api/coach/clients/')
      setClients(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch roster.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoster()
  }, [])

  const fetchInvite = async () => {
    setInviteLoading(true)
    try {
      const data = await authedFetch('/api/coach/invite/')
      setInviteData(data)
    } catch (err) {
      // Failed to load invite
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRegenerateInvite = async () => {
    setInviteLoading(true)
    try {
      const data = await authedFetch('/api/coach/invite/regenerate/', { method: 'POST' })
      setInviteData(data)
      setCopied(false)
    } catch (err) {
      // Failed to regenerate
    } finally {
      setInviteLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (!inviteData) return
    const rawUrl = inviteData.invite_url || ''
    const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${window.location.origin}${rawUrl}`
    navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <p className="text-sm font-bold text-zinc-400">Loading roster...</p>
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

  const riskColors = {
    at_risk: 'bg-red-500/10 text-red-500 border-red-500/20',
    slipping: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    on_track: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  }

  const riskLabels = {
    at_risk: 'At Risk',
    slipping: 'Slipping',
    on_track: 'On Track',
  }

  const sortedClients = [...clients].sort((a, b) => {
    const riskScore = { at_risk: 3, slipping: 2, on_track: 1 }
    return riskScore[b.risk_level] - riskScore[a.risk_level]
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Roster</h1>
          <p className="text-sm font-semibold text-zinc-500">Monitor your clients' adherence and risk levels.</p>
        </div>
        <button
          onClick={() => {
            setShowInviteModal(true)
            handleRegenerateInvite()
          }}
          className="flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-sm transition hover:bg-zinc-800"
        >
          <span>➕</span>
          <span>Invite Client</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedClients.map((client) => (
          <div
            key={client.id}
            onClick={() => navigate(`/coach/clients/${client.id}`)}
            className="group relative cursor-pointer rounded-3xl border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-300 hover:shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-black text-zinc-900">{client.name}</h3>
                <p className="text-xs font-semibold text-zinc-500">{client.email}</p>
              </div>
              <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${riskColors[client.risk_level]}`}>
                {riskLabels[client.risk_level]}
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-bold text-zinc-500 mb-1">
                  <span>Adherence</span>
                  <span className="text-zinc-900">{client.week_adherence_pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 rounded-full transition-all"
                    style={{ width: `${client.week_adherence_pct}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold text-zinc-500 pt-2 border-t border-zinc-100">
                <span>Streak: {client.streak}d</span>
                <span>Lvl {client.level}</span>
              </div>
            </div>
          </div>
        ))}
        {clients.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <p className="text-sm font-bold text-zinc-400">No clients yet.</p>
          </div>
        )}
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-zinc-950">Invite New Client</h2>
                <p className="text-xs font-semibold text-zinc-500">Each invite link is single-use for 1 client registration.</p>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {inviteLoading ? (
              <p className="py-8 text-center text-xs font-semibold text-zinc-400">Loading invite link...</p>
            ) : inviteData ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">
                    Invite URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={
                        inviteData.invite_url?.startsWith('http')
                          ? inviteData.invite_url
                          : `${window.location.origin}${inviteData.invite_url}`
                      }
                      className="w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs font-bold text-zinc-900 outline-none select-all"
                    />
                    <button
                      onClick={handleCopyLink}
                      className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${
                        copied
                          ? 'bg-emerald-500 text-white'
                          : 'bg-zinc-950 text-white hover:bg-zinc-800'
                      }`}
                    >
                      {copied ? 'Copied! ✓' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={handleRegenerateInvite}
                    disabled={inviteLoading}
                    className="text-xs font-bold text-zinc-500 underline hover:text-zinc-900 disabled:opacity-50"
                  >
                    🔄 Generate New Link
                  </button>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-red-500">Failed to load invite link.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CoachRosterPage
