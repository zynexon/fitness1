import { useState, useEffect } from 'react'

export default function CoachExerciseLibraryPage({ authedFetch }) {
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState(null)
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchExercises = async () => {
    try {
      const data = await authedFetch('/api/coach/exercises/')
      setExercises(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch exercises.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExercises()
  }, [])

  const openModal = (exercise = null) => {
    if (exercise) {
      setEditingExercise(exercise)
      setName(exercise.name)
      setDescription(exercise.description)
      setVideoUrl(exercise.video_url)
    } else {
      setEditingExercise(null)
      setName('')
      setDescription('')
      setVideoUrl('')
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingExercise(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    
    setSaving(true)
    try {
      if (editingExercise) {
        await authedFetch(`/api/coach/exercises/${editingExercise.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ name, description, video_url: videoUrl })
        })
      } else {
        await authedFetch('/api/coach/exercises/', {
          method: 'POST',
          body: JSON.stringify({ name, description, video_url: videoUrl })
        })
      }
      closeModal()
      fetchExercises()
    } catch (err) {
      alert(err.message || 'Error saving exercise.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this exercise? It will be removed from all programs.")) return
    try {
      await authedFetch(`/api/coach/exercises/${id}/`, { method: 'DELETE' })
      fetchExercises()
    } catch (err) {
      alert(err.message || 'Error deleting exercise.')
    }
  }

  if (loading) return <div className="p-12 text-center font-bold text-zinc-400">Loading library...</div>
  if (error) return <div className="p-12 text-center font-bold text-red-400">{error}</div>

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-zinc-900">Exercise Library</h1>
          <p className="mt-1 text-sm font-bold text-zinc-500">Manage your reusable exercise blocks.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-zinc-800"
        >
          + New Exercise
        </button>
      </header>

      {exercises.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-12 text-center text-zinc-400">
          No exercises yet. Create your first one to get started!
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exercises.map((ex) => (
            <div key={ex.id} className="group relative rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm transition hover:border-zinc-700 hover:shadow-md">
              <h3 className="text-lg font-black uppercase tracking-tight text-white">{ex.name}</h3>
              {ex.description && <p className="mt-2 text-sm font-semibold text-zinc-400 line-clamp-2">{ex.description}</p>}
              
              {ex.video_url && (
                <a href={ex.video_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-bold text-indigo-400 hover:text-indigo-300">
                  ▶ Watch Video
                </a>
              )}
              
              <div className="mt-5 flex gap-2 border-t border-zinc-800 pt-4">
                <button
                  onClick={() => openModal(ex)}
                  className="flex-1 rounded-lg bg-zinc-800 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(ex.id)}
                  className="rounded-lg bg-red-950/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-red-400 transition hover:bg-red-900/50 hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h2 className="text-xl font-black uppercase tracking-wider text-white">
              {editingExercise ? 'Edit Exercise' : 'New Exercise'}
            </h2>
            
            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-zinc-500">Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white focus:border-white focus:outline-none"
                  placeholder="e.g. Barbell Back Squat"
                />
              </div>
              
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-zinc-500">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white focus:border-white focus:outline-none"
                  placeholder="Form cues, instructions..."
                />
              </div>
              
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-zinc-500">Video URL (Optional)</label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white focus:border-white focus:outline-none"
                  placeholder="https://youtube.com/..."
                />
              </div>
              
              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-xl bg-zinc-800 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-white py-3 text-sm font-bold uppercase tracking-wider text-black transition hover:bg-zinc-200 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
