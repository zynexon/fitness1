import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ConfirmationModal from '../../ConfirmationModal'

export default function CoachProgramsPage({ authedFetch }) {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const [alertConfig, setAlertConfig] = useState({ open: false, title: '', message: '' })
  const showAlert = (title, message = '') => setAlertConfig({ open: true, title, message })
  
  const [confirmConfig, setConfirmConfig] = useState({ open: false, title: '', message: '', onConfirm: null })
  const showConfirm = (title, message, onConfirm) => setConfirmConfig({ open: true, title, message, onConfirm })

  const fetchPrograms = async () => {
    try {
      const data = await authedFetch('/api/coach/programs/')
      setPrograms(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch programs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrograms()
  }, [])

  const openModal = () => {
    setName('')
    setDescription('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    
    setSaving(true)
    try {
      await authedFetch('/api/coach/programs/', {
        method: 'POST',
        body: JSON.stringify({ name, description })
      })
      setName('')
      setDescription('')
      closeModal()
      fetchPrograms()
    } catch (err) {
      showAlert('Error', err.message || 'Error creating program.')
    } finally {
      setSaving(false)
    }
  }

  const requestDeleteProgram = (id) => {
    showConfirm(
      'Delete Program',
      'Are you sure you want to delete this program? It will be removed from all assigned clients.',
      () => handleDeleteProgram(id)
    )
  }

  const handleDeleteProgram = async (id) => {
    setConfirmConfig({ open: false, title: '', message: '', onConfirm: null })
    try {
      await authedFetch(`/api/coach/programs/${id}/`, { method: 'DELETE' })
      fetchPrograms()
    } catch (err) {
      showAlert('Error', err.message || 'Error deleting program.')
    }
  }

  if (loading) return <div className="p-12 text-center font-bold text-zinc-400">Loading programs...</div>
  if (error) return <div className="p-12 text-center font-bold text-red-400">{error}</div>

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-zinc-900">Programs</h1>
          <p className="mt-1 text-sm font-bold text-zinc-500">Build workout plans to assign to clients.</p>
        </div>
        <button
          onClick={openModal}
          className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-zinc-800"
        >
          + New Program
        </button>
      </header>

      {programs.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-12 text-center text-zinc-400">
          No programs yet. Create your first one to get started!
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {programs.map((prog) => (
            <div key={prog.id} className="group flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm transition hover:border-zinc-700 hover:shadow-md">
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">{prog.name}</h3>
                  <span className="rounded-full bg-zinc-800 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                    {prog.day_count} Days
                  </span>
                </div>
                {prog.description && <p className="mt-3 text-sm font-semibold text-zinc-400 line-clamp-2">{prog.description}</p>}
              </div>
              
              <div className="mt-6 flex gap-2">
                <Link
                  to={`/coach/programs/${prog.id}`}
                  className="flex-1 rounded-lg bg-white py-2 text-center text-xs font-bold uppercase tracking-wider text-black transition hover:bg-zinc-200"
                >
                  Builder
                </Link>
                <button
                  onClick={() => requestDeleteProgram(prog.id)}
                  className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-400 transition hover:bg-red-900/50 hover:text-red-300"
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
            <h2 className="text-xl font-black uppercase tracking-wider text-white">New Program</h2>
            
            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-zinc-500">Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white focus:border-white focus:outline-none"
                  placeholder="e.g. 12-Week Hypertrophy"
                />
              </div>
              
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-zinc-500">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white focus:border-white focus:outline-none"
                  placeholder="Program overview..."
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
                  {saving ? 'Creating...' : 'Create Program'}
                </button>
              </div>
            </form>
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

      <ConfirmationModal
        open={confirmConfig.open}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig({ open: false, title: '', message: '', onConfirm: null })}
      />
    </div>
  )
}
