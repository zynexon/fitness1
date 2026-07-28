import { useState, useEffect } from 'react'

const ACCESS_TOKEN_KEY = 'zynexon_access_token'

function apiUrl(path) {
  return import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}${path}`
    : path
}

export function MetricSparkline({ data, color, width = 300, height = 48 }) {
  if (!data || data.length < 2) return null


  const pad = 4
  const w = width - pad * 2
  const h = height - pad * 2
  const step = w / (data.length - 1)

  const minV = Math.min(...data.map(d => d.value))
  const maxV = Math.max(...data.map(d => d.value))
  // Add some padding to the range so points don't hit the absolute top/bottom
  const range = maxV - minV || 1
  const paddedMin = minV - range * 0.1
  const paddedRange = range * 1.2

  const points = data.map((d, i) => {
    const x = pad + i * step
    const y = pad + h - ((d.value - paddedMin) / paddedRange) * h
    return { x, y, v: d.value, date: d.date }
  })

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')

  const areaD = `${pathD} L ${points[points.length - 1].x} ${pad + h} L ${points[0].x} ${pad + h} Z`

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke={color} strokeWidth="1.5" />
      ))}
    </svg>
  )
}

function BodyMetricsPage({ authedFetch }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Config/Form State
  const [subscriptions, setSubscriptions] = useState([])
  const [entryDate, setEntryDate] = useState('')
  const [inputValues, setInputValues] = useState({})
  const [submittingEntry, setSubmittingEntry] = useState(false)

  // Trends State
  const [trends, setTrends] = useState({})

  // Photos State
  const [photos, setPhotos] = useState([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoAngle, setPhotoAngle] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  
  // Fullscreen photo modal
  const [viewPhoto, setViewPhoto] = useState(null)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      const [configData, entriesData, photosData] = await Promise.all([
        authedFetch('/api/metrics/config/'),
        authedFetch('/api/metrics/entries/?range=90'),
        authedFetch('/api/metrics/photos/?range=90')
      ])

      setSubscriptions(configData.subscriptions)
      setEntryDate(configData.today_date)
      
      // Initialize inputs with today's saved values (if any)
      const initialInputs = {}
      configData.subscriptions.forEach(sub => {
        const mdId = sub.metric_definition.id
        if (configData.today_values[mdId] !== undefined) {
          initialInputs[mdId] = configData.today_values[mdId]
        }
      })
      setInputValues(initialInputs)

      setTrends(entriesData.metrics)
      setPhotos(photosData.photos)
    } catch (err) {
      setError(err.message || 'Failed to load body metrics.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (mdId, val) => {
    setInputValues(prev => ({ ...prev, [mdId]: val }))
  }

  const handleEntrySubmit = async (e) => {
    e.preventDefault()
    setSubmittingEntry(true)
    
    // Filter out empty inputs
    const valuesArray = Object.entries(inputValues)
      .filter(([_, val]) => val !== '' && val !== undefined)
      .map(([mdId, val]) => ({
        metric_definition_id: mdId,
        value: parseFloat(val)
      }))
      .filter(v => !isNaN(v.value))

    if (valuesArray.length === 0) {
      alert('Please enter at least one value.')
      setSubmittingEntry(false)
      return
    }

    try {
      await authedFetch('/api/metrics/entries/', {
        method: 'POST',
        body: JSON.stringify({
          date: entryDate,
          values: valuesArray
        })
      })
      
      // Refresh trend data after successful submit
      const entriesData = await authedFetch('/api/metrics/entries/?range=90')
      setTrends(entriesData.metrics)
      
      alert('Check-in saved successfully!')
    } catch (err) {
      alert(err.message || 'Error saving check-in.')
    } finally {
      setSubmittingEntry(false)
    }
  }

  const handlePhotoUpload = async (e) => {
    e.preventDefault()
    if (!selectedImage) return

    setUploadingPhoto(true)
    const token = localStorage.getItem(ACCESS_TOKEN_KEY) || ''
    
    const formData = new FormData()
    formData.append('image', selectedImage)
    formData.append('date', entryDate)
    formData.append('angle', photoAngle)

    try {
      // NOTE: This intentionally bypasses authedFetch because FormData 
      // requires the browser to auto-set the multipart/form-data boundary
      const res = await fetch(apiUrl('/api/metrics/photos/'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to upload photo.')
      }

      // Refresh photo list
      const photosData = await authedFetch('/api/metrics/photos/?range=90')
      setPhotos(photosData.photos)
      
      // Reset form
      setSelectedImage(null)
      setPhotoAngle('')
      if (document.getElementById('photo-upload-input')) {
        document.getElementById('photo-upload-input').value = ''
      }
    } catch (err) {
      alert(err.message || 'Upload error')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleDeletePhoto = async (id) => {
    if (!window.confirm('Delete this photo permanently?')) return
    
    try {
      await authedFetch(`/api/metrics/photos/${id}/`, {
        method: 'DELETE'
      })
      setPhotos(prev => prev.filter(p => p.id !== id))
      if (viewPhoto?.id === id) setViewPhoto(null)
    } catch (err) {
      alert('Error deleting photo.')
    }
  }

  if (loading) return <div className="py-12 text-center text-sm font-bold text-zinc-400">Loading progress data...</div>
  if (error) return <div className="py-12 text-center text-sm font-bold text-red-500">{error}</div>

  const hasTrends = Object.keys(trends).length > 0
  const hasPhotos = photos.length > 0

  return (
    <div className="space-y-6 pb-24">
      {/* Privacy Notice */}
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-center">
        <p className="text-xs font-black uppercase tracking-wider text-indigo-700">🔒 Privacy Assured</p>
        <p className="mt-1 text-[11px] font-semibold text-indigo-600">
          Your progress metrics and photos are strictly private, visible only to you and your coach.
        </p>
      </div>

      {/* Check-in Form */}
      {subscriptions.length > 0 ? (
        <form onSubmit={handleEntrySubmit} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between border-b border-zinc-100 pb-4">
            <h2 className="text-xl font-black text-zinc-950">Daily Check-in</h2>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="rounded-xl border-2 border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-bold text-zinc-900 outline-none focus:border-zinc-900"
            />
          </div>

          <div className="space-y-4">
            {subscriptions.map((sub) => {
              const md = sub.metric_definition
              return (
                <div key={md.id} className="flex items-center gap-4">
                  <label className="w-1/3 text-sm font-bold text-zinc-700">{md.name}</label>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="any"
                      placeholder="0.0"
                      value={inputValues[md.id] !== undefined ? inputValues[md.id] : ''}
                      onChange={(e) => handleInputChange(md.id, e.target.value)}
                      className="w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 py-3 pr-12 text-sm font-bold text-zinc-950 outline-none transition focus:border-zinc-900 focus:bg-white"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-zinc-400 pointer-events-none">
                      {md.unit}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            type="submit"
            disabled={submittingEntry}
            className="mt-6 w-full rounded-2xl bg-zinc-950 px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {submittingEntry ? 'Saving...' : 'Save Check-in'}
          </button>
        </form>
      ) : (
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-bold text-zinc-500">Your coach hasn't assigned any metrics to track yet.</p>
        </div>
      )}

      {/* Trend Charts */}
      {hasTrends && (
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-xl font-black text-zinc-950">Trends (90 Days)</h2>
          <div className="space-y-8">
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

              // Use different colors for weight (usually want to lose, so red=up, green=down, though it depends on goal. Defaulting to neutral/brand color)
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
                      <MetricSparkline data={points} color={color} />
                    </div>
                  ) : (
                    <div className="mt-2 w-full rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-6 text-center text-xs font-bold text-zinc-400">
                      Need more data points to show trend line.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Progress Photos */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-black text-zinc-950">Progress Photos</h2>
        
        {/* Upload Form */}
        <form onSubmit={handlePhotoUpload} className="mb-6 flex flex-col sm:flex-row gap-3 rounded-2xl bg-zinc-50 p-4">
          <input
            id="photo-upload-input"
            type="file"
            accept="image/*"
            onChange={(e) => setSelectedImage(e.target.files[0])}
            className="flex-1 text-xs font-bold text-zinc-500 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-xs file:font-black file:text-zinc-900 hover:file:bg-zinc-300"
          />
          <div className="flex gap-2">
            <select
              value={photoAngle}
              onChange={(e) => setPhotoAngle(e.target.value)}
              className="rounded-xl border-2 border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-900 outline-none focus:border-zinc-900"
            >
              <option value="">Angle (Opt)</option>
              <option value="front">Front</option>
              <option value="side">Side</option>
              <option value="back">Back</option>
            </select>
            <button
              type="submit"
              disabled={!selectedImage || uploadingPhoto}
              className="rounded-xl bg-zinc-900 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-white hover:bg-zinc-800 disabled:opacity-50 whitespace-nowrap"
            >
              {uploadingPhoto ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>

        {/* Photo Gallery */}
        {hasPhotos ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map(photo => (
              <div 
                key={photo.id} 
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-100 cursor-pointer border border-zinc-200 shadow-sm transition hover:border-zinc-400"
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
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeletePhoto(photo.id)
                  }}
                  className="absolute top-2 right-2 rounded-full bg-red-500/90 w-7 h-7 flex items-center justify-center text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-xs font-bold text-zinc-400 py-6">No progress photos uploaded yet.</p>
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
    </div>
  )
}

export default BodyMetricsPage
