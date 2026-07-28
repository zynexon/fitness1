import { useState, useEffect } from 'react'

export default function WorkoutPage({ authedFetch, onXpEarned }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [restDay, setRestDay] = useState(false)
  const [hasActiveProgram, setHasActiveProgram] = useState(false)
  const [workoutLog, setWorkoutLog] = useState(null)
  
  // Keep track of user input for exercises (weight, reps, note)
  const [exerciseInputs, setExerciseInputs] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [successAnim, setSuccessAnim] = useState(false)

  const fetchTodayWorkout = async () => {
    try {
      const data = await authedFetch('/api/workout/today/')
      setHasActiveProgram(data.has_active_program)
      setRestDay(data.rest_day)
      
      if (data.workout_log) {
        setWorkoutLog(data.workout_log)
        
        // Initialize inputs state based on existing log
        const inputs = {}
        data.workout_log.exercise_logs.forEach(el => {
          inputs[el.workout_day_exercise_id] = {
            completed: el.completed,
            actual_weight: el.actual_weight || '',
            actual_reps: el.actual_reps || '',
            note: el.note || '',
          }
        })
        setExerciseInputs(inputs)
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch workout.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTodayWorkout()
  }, [])

  const handleInputChange = (wdeId, field, value) => {
    setExerciseInputs(prev => ({
      ...prev,
      [wdeId]: {
        ...prev[wdeId],
        [field]: value
      }
    }))
  }

  const toggleCompleted = (wdeId) => {
    setExerciseInputs(prev => ({
      ...prev,
      [wdeId]: {
        ...prev[wdeId],
        completed: !prev[wdeId].completed
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!workoutLog) return
    
    setSubmitting(true)
    try {
      const exercisesList = Object.entries(exerciseInputs).map(([wdeId, data]) => ({
        workout_day_exercise_id: wdeId,
        ...data
      }))
      
      const data = await authedFetch('/api/workout/submit/', {
        method: 'POST',
        body: JSON.stringify({
          workout_log_id: workoutLog.id,
          exercises: exercisesList,
        })
      })
      
      setWorkoutLog(data.workout_log)
      
      if (data.xp_awarded > 0) {
        setSuccessAnim(true)
        setTimeout(() => setSuccessAnim(false), 2500)
        onXpEarned(data.xp_awarded, data.total_xp, data.level, data.streak)
      } else {
        alert("Workout updated!")
      }
    } catch (err) {
      alert(err.message || 'Error submitting workout.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-12 text-center text-sm font-bold text-zinc-400">Loading workout...</div>
  if (error) return <div className="p-12 text-center text-sm font-bold text-red-400">{error}</div>

  if (!hasActiveProgram) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 text-5xl">📋</div>
        <h2 className="mb-2 text-xl font-black uppercase tracking-wider text-zinc-900 dark:text-white">
          No Active Program
        </h2>
        <p className="text-sm font-bold text-zinc-500">
          Your coach hasn't assigned an active workout program to you yet. 
          Check back later!
        </p>
      </div>
    )
  }

  if (restDay) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 text-5xl">🧘‍♂️</div>
        <h2 className="mb-2 text-xl font-black uppercase tracking-wider text-zinc-900 dark:text-white">
          Rest Day
        </h2>
        <p className="text-sm font-bold text-zinc-500">
          No workout scheduled for today. Take it easy and recover!
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-32 lg:pb-12 relative">
      {successAnim && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="animate-in zoom-in duration-300 rounded-3xl bg-zinc-900 p-8 text-center shadow-2xl border border-zinc-800">
            <div className="mb-4 text-6xl">💪</div>
            <h2 className="text-3xl font-black uppercase italic tracking-widest text-emerald-400 drop-shadow-md">
              Workout Complete!
            </h2>
            <p className="mt-2 text-xl font-bold text-white">+35 XP</p>
          </div>
        </div>
      )}

      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Today's Workout</p>
        <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
          {workoutLog?.workout_day_title}
        </h1>
        {workoutLog?.completed && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span>✓</span> Completed at {new Date(workoutLog.completed_at).toLocaleTimeString()}
          </div>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {workoutLog?.exercise_logs.map((log) => {
          const wdeId = log.workout_day_exercise_id
          const inputs = exerciseInputs[wdeId] || {}
          
          return (
            <div key={wdeId} className={`rounded-2xl border transition-all duration-300 ${inputs.completed ? 'border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-900/10 dark:border-emerald-500/30' : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'} p-5 shadow-sm`}>
              
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className={`text-lg font-black uppercase tracking-tight ${inputs.completed ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>
                    {log.exercise_name}
                  </h3>
                  
                  <div className="mt-2 flex flex-wrap gap-2">
                    {log.prescribed_sets && (
                      <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        Sets: {log.prescribed_sets}
                      </span>
                    )}
                    {log.prescribed_reps && (
                      <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        Reps: {log.prescribed_reps}
                      </span>
                    )}
                  </div>
                  
                  {log.prescription_notes && (
                    <p className="mt-3 text-sm font-semibold text-zinc-500 italic">
                      Note: {log.prescription_notes}
                    </p>
                  )}
                  
                  {log.exercise_video_url && (
                    <a href={log.exercise_video_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center text-xs font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400">
                      ▶ Watch Video
                    </a>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={() => toggleCompleted(wdeId)}
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                    inputs.completed
                      ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'border-zinc-300 bg-zinc-50 text-zinc-300 hover:border-emerald-400 hover:text-emerald-400 dark:border-zinc-700 dark:bg-zinc-800'
                  }`}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="col-span-1">
                  <label className="block mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Weight</label>
                  <input
                    type="text"
                    value={inputs.actual_weight || ''}
                    onChange={(e) => handleInputChange(wdeId, 'actual_weight', e.target.value)}
                    placeholder="e.g. 135 lbs"
                    className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:text-white dark:focus:border-white dark:focus:ring-white"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Reps</label>
                  <input
                    type="text"
                    value={inputs.actual_reps || ''}
                    onChange={(e) => handleInputChange(wdeId, 'actual_reps', e.target.value)}
                    placeholder="e.g. 10,8,8"
                    className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:text-white dark:focus:border-white dark:focus:ring-white"
                  />
                </div>
                <div className="col-span-2 sm:col-span-2">
                  <label className="block mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Notes</label>
                  <input
                    type="text"
                    value={inputs.note || ''}
                    onChange={(e) => handleInputChange(wdeId, 'note', e.target.value)}
                    placeholder="Felt easy"
                    className="w-full rounded-xl border border-zinc-300 bg-transparent px-3 py-2 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:text-white dark:focus:border-white dark:focus:ring-white"
                  />
                </div>
              </div>

            </div>
          )
        })}

        <div className="sticky bottom-[88px] lg:bottom-6 left-0 right-0 pt-4 pb-2 z-10 flex justify-center pointer-events-none">
          <button
            type="submit"
            disabled={submitting}
            className="pointer-events-auto rounded-full bg-zinc-900 px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl transition hover:scale-105 active:scale-95 disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {submitting ? 'Saving...' : workoutLog?.completed ? 'Update Workout' : 'Submit Workout'}
          </button>
        </div>
      </form>
    </div>
  )
}
