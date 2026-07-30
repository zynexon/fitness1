import { useState, useEffect } from 'react'
import { MetricSparkline } from './BodyMetricsPage'
import ConfirmationModal from '../ConfirmationModal'

export default function CoachBodyMetricsPanel({ clientId, authedFetch }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [alertConfig, setAlertConfig] = useState({ open: false, title: '', message: '' })
  const showAlert = (title, message = '') => setAlertConfig({ open: true, title, message })

  // Library & Config
  const [definitions, setDefinitions] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  
  // Create Definition Form
  const [newMetricName, setNewMetricName] = useState('')
  const [newMetricUnit, setNewMetricUnit] = useState('')
  const [creatingMetric, setCreatingMetric] = useState(false)

  // Trends
  const [trends, setTrends] = useState({})
  
  // Photos
  const [photos, setPhotos] = useState([])
  const [viewPhoto, setViewPhoto] = useState(null)

  useEffect(() => {
    fetchData()
  }, [clientId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [defsData, configData, entriesData, photosData] = await Promise.all([
        authedFetch('/api/coach/metric-definitions/'),
        authedFetch(`/api/coach/clients/${clientId}/metrics/config/`),
        authedFetch(`/api/coach/clients/${clientId}/metrics/entries/?range=90`),
        authedFetch(`/api/coach/clients/${clientId}/metrics/photos/?range=90`)
      ])

      setDefinitions(defsData)
      setSubscriptions(configData.subscriptions)
      setTrends(entriesData.metrics)
      setPhotos(photosData.photos)
    } catch (err) {
      setError('Failed to load body metrics.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDefinition = async (e) => {
    e.preventDefault()
    if (!newMetricName || !newMetricUnit) return
    
    setCreatingMetric(true)
    try {
      await authedFetch('/api/coach/metric-definitions/', {
        method: 'POST',
        body: JSON.stringify({ name: newMetricName, unit: newMetricUnit })
      })
      setNewMetricName('')
      setNewMetricUnit('')
      fetchData()
    } catch (err) {
      showAlert('Error', err.message || 'Error creating metric type.')
    } finally {
      setCreatingMetric(false)
    }
  }

  const handleToggleSubscription = async (mdId, currentIsActive) => {
    try {
      // Optimistic update
      const newActiveState = !currentIsActive
      
      const res = await authedFetch(`/api/coach/clients/${clientId}/metrics/subscriptions/`, {
        method: 'PATCH',
        body: JSON.stringify([{ metric_definition_id: mdId, is_active: newActiveState }])
      })
      setSubscriptions(res.subscriptions)
    } catch (err) {
      showAlert('Error', 'Failed to update subscription.')
    }
  }

  if (loading) return <div className="p-6 text-center text-xs font-bold text-zinc-400">Loading metrics...</div>
  if (error) return <div className="p-6 text-center text-xs font-bold text-red-400">{error}</div>

  const hasTrends = Object.keys(trends).length > 0
  const hasPhotos = photos.length > 0

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-black text-zinc-900">Tracked Metrics</h2>
        
        <div className="space-y-2 mb-6">
          {definitions.map(def => {
            const sub = subscriptions.find(s => s.metric_definition.id === def.id)
            const isActive = sub?.is_active || false
            
            return (
              <div key={def.id} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                <div>
                  <p className="text-sm font-bold text-zinc-900">{def.name}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{def.unit}</p>
                </div>
                <button
                  onClick={() => handleToggleSubscription(def.id, isActive)}
                  disabled={def.is_default_weight}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-indigo-500' : 'bg-zinc-200'} ${def.is_default_weight ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            )
          })}
        </div>

        <form onSubmit={handleCreateDefinition} className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">+ Add New Metric Type</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Body Fat"
              value={newMetricName}
              onChange={(e) => setNewMetricName(e.target.value)}
              className="flex-1 rounded-xl border-2 border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-900 outline-none focus:border-zinc-900"
            />
            <input
              type="text"
              placeholder="Unit (%)"
              value={newMetricUnit}
              onChange={(e) => setNewMetricUnit(e.target.value)}
              className="w-24 rounded-xl border-2 border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-900 outline-none focus:border-zinc-900"
            />
            <button
              type="submit"
              disabled={creatingMetric || !newMetricName || !newMetricUnit}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>
      </div>

      {/* Trend Charts */}
      {hasTrends && (
        <div className="rounded-3xl border border-zinc-200 bg-white p-6">
          <h2 className="mb-6 text-lg font-black text-zinc-900">Client Trends (90 Days)</h2>
          <div className="space-y-6">
            {Object.entries(trends).map(([mdId, data]) => {
              const points = data.points
              let deltaStr = null
              let isPositive = false
              let isNegative = false
              
              if (points.length >= 2) {
                const first = points[0].value
                const last = points[points.length - 1].value
                const diff = last - first
                const absDiff = Math.abs(diff).toFixed(1)
                
                if (diff > 0) {
                  deltaStr = `↑ ${absDiff} ${data.metric_unit}`
                  isPositive = true
                } else if (diff < 0) {
                  deltaStr = `↓ ${absDiff} ${data.metric_unit}`
                  isNegative = true
                } else {
                  deltaStr = `No change`
                }
              }

              const color = data.is_default_weight ? '#6366f1' : '#14b8a6'

              return (
                <div key={mdId}>
                  <div className="mb-2 flex items-end justify-between">
                    <div>
                      <h3 className="text-sm font-black text-zinc-900">{data.metric_name}</h3>
                      {points.length > 0 && (
                        <p className="text-xs font-semibold text-zinc-500">
                          Latest: <span className="font-bold text-zinc-900">{points[points.length - 1].value} {data.metric_unit}</span>
                        </p>
                      )}
                    </div>
                    {deltaStr && (
                      <div className={`text-[10px] font-black uppercase tracking-wider ${isPositive ? 'text-indigo-600' : isNegative ? 'text-emerald-600' : 'text-zinc-400'}`}>
                        {deltaStr} since start
                      </div>
                    )}
                  </div>
                  
                  {points.length >= 2 ? (
                    <div className="mt-2 w-full rounded-2xl bg-zinc-50 pt-2 pb-1">
                      <MetricSparkline data={points} color={color} height={40} />
                    </div>
                  ) : (
                    <div className="mt-2 w-full rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4 text-center text-[10px] font-bold text-zinc-400">
                      Need more data points to show trend.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Progress Photos */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-black text-zinc-900">Progress Photos</h2>
        
        {hasPhotos ? (
          <div className="grid grid-cols-2 gap-3">
            {photos.map(photo => (
              <div 
                key={photo.id} 
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-100 cursor-pointer border border-zinc-200 shadow-sm"
                onClick={() => setViewPhoto(photo)}
              >
                <img 
                  src={photo.image} 
                  alt="Progress" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
                  <p className="text-[10px] font-black">{photo.date}</p>
                  {photo.angle && (
                    <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">{photo.angle}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-xs font-bold text-zinc-400 py-4 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
            No photos uploaded yet.
          </p>
        )}
      </div>

      {/* Photo Modal Overlay */}
      {viewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4" onClick={() => setViewPhoto(null)}>
          <button className="absolute top-6 right-6 text-white/50 hover:text-white transition">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <img 
            src={viewPhoto.image} 
            alt="Progress Full" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-6 py-2 backdrop-blur-md">
            <span className="text-sm font-black text-white">{viewPhoto.date}</span>
            {viewPhoto.angle && (
              <span className="ml-2 text-xs font-bold uppercase text-white/70">· {viewPhoto.angle}</span>
            )}
          </div>
        </div>
      )}
      <ConfirmationModal
        open={alertConfig.open}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText="OK"
        cancelText={null}
        onConfirm={() => setAlertConfig({ open: false, title: '', message: '' })}
      />
    </div>
  )
}
