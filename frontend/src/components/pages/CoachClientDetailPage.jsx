import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CoachBodyMetricsPanel from './CoachBodyMetricsPanel'

import branding from '../../config/branding'

function CoachClientDetailPage({ authedFetch }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [noteInput, setNoteInput] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  
  const [taskTitle, setTaskTitle] = useState('')
  const [taskCategory, setTaskCategory] = useState('general')
  const [taskDate, setTaskDate] = useState('')
  const [assigningTask, setAssigningTask] = useState(false)

  // Program state
  const [programData, setProgramData] = useState({ has_active_program: false, assignment: null, workout_history: [] })
  const [coachPrograms, setCoachPrograms] = useState([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [assigningProgram, setAssigningProgram] = useState(false)

  const fetchClient = async () => {
    try {
      const [data, progData, coachProgs] = await Promise.all([
        authedFetch(`/api/coach/clients/${id}/`),
        authedFetch(`/api/coach/clients/${id}/program/`),
        authedFetch('/api/coach/programs/')
      ])
      setClient(data)
      setNoteInput(data.coach_note || '')
      setProgramData(progData)
      setCoachPrograms(coachProgs)
      if (coachProgs.length > 0) setSelectedProgramId(coachProgs[0].id)
    } catch (err) {
      setError(err.message || 'Failed to fetch client details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClient()
  }, [id])

  const handleSaveNote = async () => {
    setSavingNote(true)
    try {
      await authedFetch(`/api/coach/clients/${id}/note/`, {
        method: 'PATCH',
        body: JSON.stringify({ note: noteInput }),
      })
      alert('Note saved!')
    } catch (err) {
      alert(err.message || 'Error saving note.')
    } finally {
      setSavingNote(false)
    }
  }

  const handleAssignTask = async (e) => {
    e.preventDefault()
    if (!taskTitle) return
    setAssigningTask(true)
    try {
      await authedFetch(`/api/coach/clients/${id}/tasks/`, {
        method: 'POST',
        body: JSON.stringify({
          title: taskTitle,
          category: taskCategory,
          date: taskDate || null
        }),
      })
      alert('Task assigned!')
      setTaskTitle('')
      fetchClient()
    } catch (err) {
      alert(err.message || 'Error assigning task.')
    } finally {
      setAssigningTask(false)
    }
  }

  const handleAssignProgram = async (e) => {
    e.preventDefault()
    if (!selectedProgramId) return
    setAssigningProgram(true)
    try {
      await authedFetch(`/api/coach/clients/${id}/assign-program/`, {
        method: 'POST',
        body: JSON.stringify({ program_id: selectedProgramId }),
      })
      alert('Program assigned!')
      fetchClient()
    } catch (err) {
      alert(err.message || 'Error assigning program.')
    } finally {
      setAssigningProgram(false)
    }
  }

  const handleUnassignProgram = async () => {
    if (!window.confirm('Remove active program from this client?')) return
    try {
      await authedFetch(`/api/coach/clients/${id}/program/`, { method: 'DELETE' })
      fetchClient()
    } catch (err) {
      alert(err.message || 'Error removing program.')
    }
  }

  if (loading) return <div className="p-12 text-center text-sm font-bold text-zinc-400">Loading client...</div>
  if (error || !client) return <div className="p-12 text-center text-sm font-bold text-red-400">{error || 'Not found'}</div>

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

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/coach/clients')} className="text-zinc-400 hover:text-zinc-900 transition">
          ← Back
        </button>
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
            {client.name}
            {client.client_group && (
              <button 
                onClick={() => navigate('/coach/groups')}
                className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-[10px] font-black uppercase tracking-wider text-zinc-500 transition cursor-pointer"
                title="View in Groups"
              >
                🏷️ {client.client_group.name}
              </button>
            )}
          </h1>
          <p className="text-sm font-semibold text-zinc-500 mt-1">{client.email}</p>
        </div>
        <div className={`ml-auto px-3 py-1.5 rounded-lg border text-xs font-black uppercase tracking-wider ${riskColors[client.risk_level]}`}>
          {riskLabels[client.risk_level]}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-zinc-200 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Adherence</p>
              <p className="text-2xl font-black text-zinc-900">{client.week_adherence_pct}%</p>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Streak</p>
              <p className="text-2xl font-black text-zinc-900">{client.streak}d</p>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Level</p>
              <p className="text-2xl font-black text-zinc-900">{client.level}</p>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Last Active</p>
              <p className="text-sm font-bold text-zinc-900 mt-2">{client.last_active_date || 'Never'}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 md:p-8">
            <h2 className="text-lg font-black text-zinc-900 mb-4">Assign Task</h2>
            <form onSubmit={handleAssignTask} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Run 5km"
                  className="w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-950 outline-none transition focus:border-zinc-900 focus:bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">Category</label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    className="w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-950 outline-none transition focus:border-zinc-900 focus:bg-white"
                  >
                    <option value="fitness">Fitness</option>
                    <option value="study">Study</option>
                    <option value="discipline">Discipline</option>
                    <option value="work">Work</option>
                    <option value="logic">Logic</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">Date (Optional)</label>
                  <input
                    type="date"
                    value={taskDate}
                    onChange={(e) => setTaskDate(e.target.value)}
                    className="w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-950 outline-none transition focus:border-zinc-900 focus:bg-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={assigningTask}
                className="w-full rounded-2xl bg-zinc-950 px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white transition hover:bg-zinc-800 disabled:opacity-50"
              >
                {assigningTask ? 'Assigning...' : 'Assign Task'}
              </button>
            </form>
          </div>
          
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 md:p-8">
            <h2 className="text-lg font-black text-zinc-900 mb-4">Today's Tasks</h2>
            {client.tasks && client.tasks.length > 0 ? (
              <ul className="space-y-3">
                {client.tasks.map(t => (
                  <li key={t.id} className="flex items-center gap-3 p-3 rounded-2xl border border-zinc-100 bg-zinc-50">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${t.completed ? 'bg-emerald-500 text-white' : 'bg-zinc-200'}`}>
                      {t.completed && '✓'}
                    </div>
                    <span className={`text-sm font-bold ${t.completed ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>
                      {t.task_title || t.task?.title || t.custom_title || t.title}
                    </span>
                    {t.is_custom && (
                      <span className="ml-auto text-[10px] font-black uppercase tracking-wider text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">Coach</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm font-bold text-zinc-400">No tasks for today.</p>
            )}
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 md:p-8">
            <h2 className="text-lg font-black text-zinc-900 mb-4">Workout Program</h2>
            
            {programData.has_active_program ? (
              <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Active Program</span>
                    <h3 className="text-lg font-black uppercase text-zinc-900">{programData.assignment.program_name}</h3>
                    <p className="text-xs font-bold text-zinc-500">Started {new Date(programData.assignment.start_date).toLocaleDateString()}</p>
                  </div>
                  <button onClick={handleUnassignProgram} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-200">
                    Unassign
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAssignProgram} className="mb-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">Assign Program</label>
                <div className="flex gap-2">
                  <select
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    className="flex-1 rounded-xl border-2 border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-900 outline-none focus:border-zinc-900"
                  >
                    {coachPrograms.length === 0 && <option value="">No programs available...</option>}
                    {coachPrograms.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={assigningProgram || coachPrograms.length === 0}
                    className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-black uppercase tracking-wider text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Assign
                  </button>
                </div>
              </form>
            )}

            <h3 className="mb-3 text-sm font-black uppercase text-zinc-700">Recent Workouts (28 days)</h3>
            {programData.workout_history.length > 0 ? (
              <div className="space-y-3">
                {programData.workout_history.map(log => (
                  <div key={log.id} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                    <div>
                      <p className={`text-sm font-black uppercase ${log.completed ? 'text-emerald-600' : 'text-zinc-600'}`}>
                        {log.workout_day_title}
                      </p>
                      <p className="text-xs font-bold text-zinc-500">{new Date(log.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      {log.completed ? (
                        <span className="rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-600">+{log.xp_awarded} XP</span>
                      ) : (
                        <span className="text-[10px] font-bold text-zinc-400">Missed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-bold text-zinc-400">No workout history.</p>
            )}
          </div>

          {/* Body Metrics Panel */}
          <CoachBodyMetricsPanel clientId={id} authedFetch={authedFetch} />
        </div>

        {/* Right Col */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-black text-zinc-900 mb-4">Coach Notes</h2>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Private notes about this client..."
              className="w-full h-48 rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white resize-none mb-4"
            />
            <button
              onClick={handleSaveNote}
              disabled={savingNote}
              className="w-full rounded-2xl bg-zinc-100 border border-zinc-200 px-4 py-3 text-sm font-black uppercase tracking-wider text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-50"
            >
              {savingNote ? 'Saving...' : 'Save Notes'}
            </button>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-black text-zinc-900 mb-4">Weekly Report</h2>
            {client.weekly_report ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-zinc-500">Grade</span>
                  <span className="font-black text-zinc-900">{client.weekly_report.grade}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-zinc-500">Score</span>
                  <span className="font-black text-zinc-900">{client.weekly_report.performance_score}/100</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-zinc-500">Active Days</span>
                  <span className="font-black text-zinc-900">{client.weekly_report.active_days}/7</span>
                </div>
                <p className="text-xs font-semibold text-zinc-500 mt-4 italic">
                  "{client.weekly_report.verdict}"
                </p>
              </div>
            ) : (
              <p className="text-xs font-semibold text-zinc-400">No report available yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CoachClientDetailPage
