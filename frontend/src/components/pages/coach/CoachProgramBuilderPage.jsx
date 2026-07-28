import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

const WEEKDAYS = [
  { val: 0, label: 'Monday' },
  { val: 1, label: 'Tuesday' },
  { val: 2, label: 'Wednesday' },
  { val: 3, label: 'Thursday' },
  { val: 4, label: 'Friday' },
  { val: 5, label: 'Saturday' },
  { val: 6, label: 'Sunday' },
]

export default function CoachProgramBuilderPage({ authedFetch }) {
  const { id } = useParams()
  const [program, setProgram] = useState(null)
  const [libraryExercises, setLibraryExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modals state
  const [dayModal, setDayModal] = useState({ open: false, isEdit: false, dayData: null, weekday: 0, title: '' })
  const [exerciseModal, setExerciseModal] = useState({ open: false, isEdit: false, dayId: null, wdeData: null, exerciseId: '', sets: '', reps: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    try {
      const [progData, libData] = await Promise.all([
        authedFetch(`/api/coach/programs/${id}/`),
        authedFetch('/api/coach/exercises/')
      ])
      setProgram(progData)
      setLibraryExercises(libData)
    } catch (err) {
      setError(err.message || 'Failed to fetch builder data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  // ── Day Actions ──
  const openDayModal = (weekday, existingDay = null) => {
    setDayModal({
      open: true,
      isEdit: !!existingDay,
      dayData: existingDay,
      weekday: existingDay ? existingDay.weekday : weekday,
      title: existingDay ? existingDay.title : ''
    })
  }

  const handleSaveDay = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (dayModal.isEdit) {
        await authedFetch(`/api/coach/programs/${id}/days/${dayModal.dayData.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ title: dayModal.title, weekday: dayModal.weekday })
        })
      } else {
        await authedFetch(`/api/coach/programs/${id}/days/`, {
          method: 'POST',
          body: JSON.stringify({ title: dayModal.title, weekday: dayModal.weekday })
        })
      }
      setDayModal({ open: false })
      fetchData()
    } catch (err) {
      alert(err.message || 'Error saving day.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDay = async (dayId) => {
    if (!window.confirm('Delete this workout day and all its prescribed exercises?')) return
    try {
      await authedFetch(`/api/coach/programs/${id}/days/${dayId}/`, { method: 'DELETE' })
      fetchData()
    } catch (err) {
      alert(err.message || 'Error deleting day.')
    }
  }

  // ── Exercise Actions ──
  const openExerciseModal = (dayId, existingWde = null) => {
    setExerciseModal({
      open: true,
      isEdit: !!existingWde,
      dayId: dayId,
      wdeData: existingWde,
      exerciseId: existingWde ? existingWde.exercise_id : (libraryExercises[0]?.id || ''),
      sets: existingWde && existingWde.prescribed_sets !== null ? existingWde.prescribed_sets : '',
      reps: existingWde ? existingWde.prescribed_reps : '',
      notes: existingWde ? existingWde.notes : ''
    })
  }

  const handleSaveExercise = async (e) => {
    e.preventDefault()
    if (!exerciseModal.isEdit && !exerciseModal.exerciseId) return alert('Select an exercise')
    setSaving(true)
    
    const payload = {
      prescribed_sets: exerciseModal.sets === '' ? null : parseInt(exerciseModal.sets, 10),
      prescribed_reps: exerciseModal.reps,
      notes: exerciseModal.notes
    }

    try {
      if (exerciseModal.isEdit) {
        await authedFetch(`/api/coach/programs/${id}/days/${exerciseModal.dayId}/exercises/${exerciseModal.wdeData.id}/`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        })
      } else {
        payload.exercise_id = exerciseModal.exerciseId
        await authedFetch(`/api/coach/programs/${id}/days/${exerciseModal.dayId}/exercises/`, {
          method: 'POST',
          body: JSON.stringify(payload)
        })
      }
      setExerciseModal({ open: false })
      fetchData()
    } catch (err) {
      alert(err.message || 'Error saving exercise.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExercise = async (dayId, wdeId) => {
    if (!window.confirm('Remove this exercise from the day?')) return
    try {
      await authedFetch(`/api/coach/programs/${id}/days/${dayId}/exercises/${wdeId}/`, { method: 'DELETE' })
      fetchData()
    } catch (err) {
      alert(err.message || 'Error removing exercise.')
    }
  }

  if (loading) return <div className="p-12 text-center font-bold text-zinc-400">Loading builder...</div>
  if (error || !program) return <div className="p-12 text-center font-bold text-red-400">{error || 'Not found'}</div>

  // Create lookup dictionary for days
  const daysByWeekday = {}
  program.workout_days.forEach(day => {
    daysByWeekday[day.weekday] = day
  })

  return (
    <div className="mx-auto max-w-5xl p-6 pb-24">
      <header className="mb-6 flex items-center gap-4">
        <Link to="/coach/programs" className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-zinc-500 hover:bg-zinc-300 hover:text-zinc-900 transition">
          ←
        </Link>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-zinc-900">{program.name}</h1>
          <p className="mt-1 text-sm font-bold text-zinc-500">Program Builder</p>
        </div>
      </header>

      <div className="space-y-6">
        {WEEKDAYS.map((wd) => {
          const day = daysByWeekday[wd.val]
          
          if (!day) {
            return (
              <div key={wd.val} className="flex items-center justify-between rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-5 opacity-60 transition hover:opacity-100 hover:border-zinc-700">
                <div className="flex items-center gap-4">
                  <span className="w-24 text-sm font-black uppercase tracking-widest text-zinc-500">{wd.label}</span>
                  <span className="text-sm font-bold text-zinc-600 italic">Rest Day</span>
                </div>
                <button
                  onClick={() => openDayModal(wd.val)}
                  className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-zinc-700"
                >
                  Add Workout
                </button>
              </div>
            )
          }

          return (
            <div key={wd.val} className="rounded-2xl border border-zinc-700 bg-zinc-900 overflow-hidden shadow-lg">
              <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-800/50 p-4">
                <div className="flex items-center gap-4">
                  <span className="w-24 text-sm font-black uppercase tracking-widest text-zinc-400">{wd.label}</span>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">{day.title}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openDayModal(wd.val, day)}
                    className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteDay(day.id)}
                    className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-red-400 transition hover:bg-red-900/50 hover:text-red-300"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="p-4">
                {day.exercises.length === 0 ? (
                  <div className="py-6 text-center text-sm font-bold text-zinc-500 italic">
                    No exercises added yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {day.exercises.map((wde, idx) => (
                      <div key={wde.id} className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-3 transition hover:border-zinc-700">
                        <div className="flex items-center gap-4">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-black text-zinc-400">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-black uppercase tracking-tight text-white">{wde.exercise_name}</p>
                            <div className="mt-1 flex gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                              {wde.prescribed_sets && <span>{wde.prescribed_sets} Sets</span>}
                              {wde.prescribed_sets && wde.prescribed_reps && <span>•</span>}
                              {wde.prescribed_reps && <span>{wde.prescribed_reps} Reps</span>}
                              {(wde.prescribed_sets || wde.prescribed_reps) && wde.notes && <span>•</span>}
                              {wde.notes && <span className="text-zinc-400 italic normal-case">{wde.notes}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => openExerciseModal(day.id, wde)} className="p-1.5 text-zinc-400 hover:text-white">✏️</button>
                          <button onClick={() => handleDeleteExercise(day.id, wde.id)} className="p-1.5 text-red-500/70 hover:text-red-400">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <button
                  onClick={() => openExerciseModal(day.id)}
                  className="mt-4 w-full rounded-xl border border-dashed border-zinc-700 py-3 text-xs font-bold uppercase tracking-wider text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
                >
                  + Add Exercise
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Day Modal ── */}
      {dayModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h2 className="text-xl font-black uppercase tracking-wider text-white">
              {dayModal.isEdit ? 'Edit Workout Day' : 'Add Workout Day'}
            </h2>
            <form onSubmit={handleSaveDay} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-zinc-500">Weekday</label>
                <select
                  value={dayModal.weekday}
                  onChange={(e) => setDayModal({...dayModal, weekday: parseInt(e.target.value)})}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white focus:border-white focus:outline-none"
                >
                  {WEEKDAYS.map(w => (
                    <option key={w.val} value={w.val}>{w.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-zinc-500">Title *</label>
                <input
                  type="text"
                  required
                  value={dayModal.title}
                  onChange={(e) => setDayModal({...dayModal, title: e.target.value})}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white focus:border-white focus:outline-none"
                  placeholder="e.g. Upper Body Power"
                />
              </div>
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setDayModal({open:false})} className="flex-1 rounded-xl bg-zinc-800 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-zinc-700">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-white py-3 text-sm font-bold uppercase tracking-wider text-black transition hover:bg-zinc-200 disabled:opacity-50">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Exercise Modal ── */}
      {exerciseModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h2 className="text-xl font-black uppercase tracking-wider text-white">
              {exerciseModal.isEdit ? 'Edit Prescription' : 'Add Exercise'}
            </h2>
            <form onSubmit={handleSaveExercise} className="mt-6 space-y-4">
              {!exerciseModal.isEdit && (
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-zinc-500">Exercise *</label>
                  <select
                    value={exerciseModal.exerciseId}
                    onChange={(e) => setExerciseModal({...exerciseModal, exerciseId: e.target.value})}
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white focus:border-white focus:outline-none"
                  >
                    {libraryExercises.length === 0 && <option value="">No exercises in library...</option>}
                    {libraryExercises.map(ex => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-zinc-500">Sets</label>
                  <input
                    type="number"
                    min="1"
                    value={exerciseModal.sets}
                    onChange={(e) => setExerciseModal({...exerciseModal, sets: e.target.value})}
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white focus:border-white focus:outline-none"
                    placeholder="e.g. 3"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-zinc-500">Reps</label>
                  <input
                    type="text"
                    value={exerciseModal.reps}
                    onChange={(e) => setExerciseModal({...exerciseModal, reps: e.target.value})}
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white focus:border-white focus:outline-none"
                    placeholder="e.g. 8-12"
                  />
                </div>
              </div>
              
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-zinc-500">Coach Notes</label>
                <input
                  type="text"
                  value={exerciseModal.notes}
                  onChange={(e) => setExerciseModal({...exerciseModal, notes: e.target.value})}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white focus:border-white focus:outline-none"
                  placeholder="e.g. Pause at the bottom"
                />
              </div>

              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setExerciseModal({open:false})} className="flex-1 rounded-xl bg-zinc-800 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-zinc-700">Cancel</button>
                <button type="submit" disabled={saving || (!exerciseModal.isEdit && !exerciseModal.exerciseId)} className="flex-1 rounded-xl bg-white py-3 text-sm font-bold uppercase tracking-wider text-black transition hover:bg-zinc-200 disabled:opacity-50">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
