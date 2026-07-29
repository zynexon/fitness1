import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function CoachGroupsPage({ authedFetch }) {
  const navigate = useNavigate()
  
  // State for list view
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // State for create/edit modal
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' or 'edit'
  const [editGroup, setEditGroup] = useState(null)
  const [nameInput, setNameInput] = useState('')
  const [descInput, setDescInput] = useState('')
  const [saving, setSaving] = useState(false)

  // State for selected group view
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [groupDetail, setGroupDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // State for add members modal
  const [showAddMembersModal, setShowAddMembersModal] = useState(false)
  const [allClients, setAllClients] = useState([])
  const [selectedClientIds, setSelectedClientIds] = useState(new Set())
  const [addingMembers, setAddingMembers] = useState(false)

  // State for bulk assign modales
  const [showAssignProgramModal, setShowAssignProgramModal] = useState(false)
  const [programs, setPrograms] = useState([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [assigningProgram, setAssigningProgram] = useState(false)

  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskCategory, setTaskCategory] = useState('general')
  const [taskDate, setTaskDate] = useState('')
  const [assigningTask, setAssigningTask] = useState(false)

  const fetchGroups = async () => {
    try {
      const data = await authedFetch('/api/coach/groups/')
      setGroups(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch groups.')
    } finally {
      setLoading(false)
    }
  }

  const fetchGroupDetail = async (id) => {
    setDetailLoading(true)
    try {
      const data = await authedFetch(`/api/coach/groups/${id}/`)
      setGroupDetail(data)
    } catch (err) {
      alert(err.message || 'Failed to fetch group details.')
      setSelectedGroupId(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const fetchAllClients = async () => {
    try {
      const data = await authedFetch('/api/coach/clients/')
      setAllClients(data)
    } catch (err) {
      alert(err.message || 'Failed to fetch clients.')
    }
  }

  const fetchPrograms = async () => {
    try {
      const data = await authedFetch('/api/coach/programs/')
      setPrograms(data)
      if (data.length > 0) setSelectedProgramId(data[0].id)
    } catch (err) {
      // Ignore
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [])

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupDetail(selectedGroupId)
    }
  }, [selectedGroupId])

  // --- CRUD Group ---

  const handleSaveGroup = async (e) => {
    e.preventDefault()
    if (!nameInput.trim()) return
    
    setSaving(true)
    try {
      if (modalMode === 'create') {
        await authedFetch('/api/coach/groups/', {
          method: 'POST',
          body: JSON.stringify({ name: nameInput, description: descInput }),
        })
      } else {
        await authedFetch(`/api/coach/groups/${editGroup.id}/`, {
          method: 'PATCH',
          body: JSON.stringify({ name: nameInput, description: descInput }),
        })
      }
      setShowModal(false)
      fetchGroups()
      if (selectedGroupId && modalMode === 'edit') fetchGroupDetail(selectedGroupId)
    } catch (err) {
      alert(err.message || 'Error saving group.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteGroup = async (id) => {
    if (!confirm('Are you sure you want to delete this group? Members will not be deleted.')) return
    try {
      await authedFetch(`/api/coach/groups/${id}/`, { method: 'DELETE' })
      if (selectedGroupId === id) setSelectedGroupId(null)
      fetchGroups()
    } catch (err) {
      alert(err.message || 'Error deleting group.')
    }
  }

  const openCreateModal = () => {
    setModalMode('create')
    setEditGroup(null)
    setNameInput('')
    setDescInput('')
    setShowModal(true)
  }

  const openEditModal = (group) => {
    setModalMode('edit')
    setEditGroup(group)
    setNameInput(group.name)
    setDescInput(group.description)
    setShowModal(true)
  }

  // --- Member Management ---

  const handleOpenAddMembers = () => {
    fetchAllClients()
    setSelectedClientIds(new Set())
    setShowAddMembersModal(true)
  }

  const toggleClientSelection = (clientId) => {
    const next = new Set(selectedClientIds)
    if (next.has(clientId)) next.delete(clientId)
    else next.add(clientId)
    setSelectedClientIds(next)
  }

  const handleAddMembers = async () => {
    if (selectedClientIds.size === 0) return
    setAddingMembers(true)
    try {
      await authedFetch(`/api/coach/groups/${selectedGroupId}/members/`, {
        method: 'POST',
        body: JSON.stringify({ client_ids: Array.from(selectedClientIds) })
      })
      setShowAddMembersModal(false)
      fetchGroupDetail(selectedGroupId)
      fetchGroups() // update member counts in list
    } catch (err) {
      alert(err.message || 'Error adding members.')
    } finally {
      setAddingMembers(false)
    }
  }

  const handleRemoveMember = async (clientId) => {
    if (!confirm('Remove this client from the group?')) return
    try {
      await authedFetch(`/api/coach/groups/${selectedGroupId}/members/${clientId}/`, {
        method: 'DELETE'
      })
      fetchGroupDetail(selectedGroupId)
      fetchGroups()
    } catch (err) {
      alert(err.message || 'Error removing member.')
    }
  }

  // --- Bulk Assignment ---

  const handleAssignProgram = async (e) => {
    e.preventDefault()
    if (!selectedProgramId) return
    setAssigningProgram(true)
    try {
      const res = await authedFetch(`/api/coach/groups/${selectedGroupId}/assign-program/`, {
        method: 'POST',
        body: JSON.stringify({ program_id: selectedProgramId }),
      })
      alert(`Successfully assigned program to ${res.assigned_count} clients!`)
      setShowAssignProgramModal(false)
    } catch (err) {
      alert(err.message || 'Error assigning program.')
    } finally {
      setAssigningProgram(false)
    }
  }

  const handleAssignTask = async (e) => {
    e.preventDefault()
    if (!taskTitle) return
    setAssigningTask(true)
    try {
      const res = await authedFetch(`/api/coach/groups/${selectedGroupId}/assign-task/`, {
        method: 'POST',
        body: JSON.stringify({
          title: taskTitle,
          category: taskCategory,
          date: taskDate || null
        }),
      })
      alert(`Successfully assigned task to ${res.assigned_count} clients!`)
      setShowAssignTaskModal(false)
      setTaskTitle('')
    } catch (err) {
      alert(err.message || 'Error assigning task.')
    } finally {
      setAssigningTask(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <p className="text-sm font-bold text-zinc-400">Loading groups...</p>
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

  // Shared Create/Edit Modal
  const createEditModal = showModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-zinc-950">
            {modalMode === 'create' ? 'Create Group' : 'Edit Group'}
          </h2>
          <button onClick={() => setShowModal(false)} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 font-bold">✕</button>
        </div>

        <form onSubmit={handleSaveGroup} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">Group Name</label>
            <input
              type="text"
              required
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Summer Shred"
              className="w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm font-bold text-zinc-900 outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">Description (Optional)</label>
            <textarea
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              className="w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm font-bold text-zinc-900 outline-none min-h-[100px]"
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="rounded-xl px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !nameInput.trim()}
              className="rounded-xl bg-zinc-950 px-6 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  // Selected Group Detail View
  if (selectedGroupId && groupDetail) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => setSelectedGroupId(null)}
            className="mb-4 flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition"
          >
            ← Back to Groups
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight">{groupDetail.name}</h1>
              <p className="text-sm font-semibold text-zinc-500 mt-1 max-w-2xl">{groupDetail.description || 'No description provided.'}</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-[10px] font-black uppercase tracking-wider text-zinc-600">
                  {groupDetail.member_count} Members
                </span>
                <button
                  onClick={() => openEditModal(groupDetail)}
                  className="text-xs font-bold text-zinc-400 hover:text-zinc-900 underline"
                >
                  Edit Details
                </button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => { fetchPrograms(); setShowAssignProgramModal(true); }}
                className="rounded-xl border-2 border-zinc-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                📋 Bulk Program
              </button>
              <button
                onClick={() => setShowAssignTaskModal(true)}
                className="rounded-xl border-2 border-zinc-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                ✅ Bulk Task
              </button>
            </div>
          </div>
        </div>

        {/* Member List */}
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-zinc-100">
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-900">Group Members</h2>
            <button
              onClick={handleOpenAddMembers}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-950 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-zinc-800 transition"
            >
              <span>➕ Add Clients</span>
            </button>
          </div>
          
          {detailLoading ? (
             <div className="p-8 text-center text-xs font-bold text-zinc-400">Loading members...</div>
          ) : groupDetail.members.length === 0 ? (
            <div className="p-12 text-center text-sm font-bold text-zinc-400">
              No clients in this group yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {groupDetail.members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-4 px-6 hover:bg-zinc-50 transition">
                  <div 
                    className="flex-1 cursor-pointer" 
                    onClick={() => navigate(`/coach/clients/${member.id}`)}
                  >
                    <h3 className="text-sm font-bold text-zinc-900">{member.name}</h3>
                    <p className="text-xs font-semibold text-zinc-500">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-0.5">Adherence</div>
                      <div className="text-sm font-bold text-zinc-900">{member.week_adherence_pct}%</div>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-2 rounded-xl text-zinc-400 hover:bg-red-50 hover:text-red-600 transition"
                      title="Remove from group"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Members Modal */}
        {showAddMembersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black text-zinc-950">Add Clients to Group</h2>
                <button onClick={() => setShowAddMembersModal(false)} className="text-zinc-400 hover:text-zinc-600 font-bold">✕</button>
              </div>
              
              <div className="flex-1 overflow-y-auto min-h-[300px] border rounded-2xl p-2 bg-zinc-50">
                {allClients.filter(c => c.client_group?.id !== selectedGroupId).length === 0 ? (
                  <p className="p-4 text-center text-xs font-bold text-zinc-400">All your clients are already in this group.</p>
                ) : (
                  allClients
                    .filter(c => c.client_group?.id !== selectedGroupId)
                    .map(client => {
                      const isSelected = selectedClientIds.has(client.id)
                      const isAnotherGroup = client.client_group != null
                      return (
                        <div 
                          key={client.id}
                          onClick={() => toggleClientSelection(client.id)}
                          className={`flex items-center justify-between p-3 mb-2 rounded-xl cursor-pointer border-2 transition ${
                            isSelected ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-transparent bg-white hover:border-zinc-200 text-zinc-900'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-bold">{client.name}</div>
                            {isAnotherGroup && !isSelected && (
                              <div className="text-[10px] font-black uppercase text-amber-500">
                                Moves from: {client.client_group.name}
                              </div>
                            )}
                          </div>
                          <div className={`w-5 h-5 rounded flex items-center justify-center border-2 ${
                            isSelected ? 'border-white bg-white text-black' : 'border-zinc-300'
                          }`}>
                            {isSelected && <span className="text-xs font-black">✓</span>}
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
              
              <div className="pt-4 flex justify-end gap-3 mt-auto">
                <button
                  onClick={() => setShowAddMembersModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMembers}
                  disabled={addingMembers || selectedClientIds.size === 0}
                  className="rounded-xl bg-zinc-950 px-6 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {addingMembers ? 'Adding...' : `Add ${selectedClientIds.size} Clients`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Program Modal */}
        {showAssignProgramModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-zinc-950">Bulk Assign Program</h2>
                  <p className="text-xs font-semibold text-zinc-500">Assigns to all {groupDetail.member_count} members.</p>
                </div>
                <button onClick={() => setShowAssignProgramModal(false)} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 font-bold">✕</button>
              </div>

              <form onSubmit={handleAssignProgram} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">Select Program</label>
                  <select
                    value={selectedProgramId}
                    onChange={(e) => setSelectedProgramId(e.target.value)}
                    className="w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm font-bold text-zinc-900 outline-none"
                    required
                  >
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={assigningProgram || !selectedProgramId || groupDetail.member_count === 0}
                    className="w-full rounded-2xl bg-zinc-950 py-3.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {assigningProgram ? 'Assigning...' : `Assign to ${groupDetail.member_count} Clients`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Task Modal */}
        {showAssignTaskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-zinc-950">Bulk Assign Task</h2>
                  <p className="text-xs font-semibold text-zinc-500">Assigns to all {groupDetail.member_count} members.</p>
                </div>
                <button onClick={() => setShowAssignTaskModal(false)} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 font-bold">✕</button>
              </div>

              <form onSubmit={handleAssignTask} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">Task Title</label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Run 3 miles"
                    className="w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm font-bold text-zinc-900 outline-none"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">Category</label>
                    <select
                      value={taskCategory}
                      onChange={(e) => setTaskCategory(e.target.value)}
                      className="w-full rounded-xl border-2 border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-900 outline-none"
                    >
                      <option value="general">General</option>
                      <option value="fitness">Fitness</option>
                      <option value="study">Study</option>
                      <option value="work">Work</option>
                      <option value="discipline">Discipline</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">Target Date</label>
                    <input
                      type="date"
                      value={taskDate}
                      onChange={(e) => setTaskDate(e.target.value)}
                      className="w-full rounded-xl border-2 border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-900 outline-none"
                    />
                  </div>
                </div>
                
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={assigningTask || !taskTitle || groupDetail.member_count === 0}
                    className="w-full rounded-2xl bg-zinc-950 py-3.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {assigningTask ? 'Assigning...' : `Assign to ${groupDetail.member_count} Clients`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {createEditModal}
      </div>
    )
  }

  // List View
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Client Groups</h1>
          <p className="text-sm font-semibold text-zinc-500">Organize clients into cohorts for bulk assignments.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-sm transition hover:bg-zinc-800"
        >
          <span>➕</span>
          <span>Create Group</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <div
            key={group.id}
            className="group relative rounded-3xl border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-300 hover:shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div 
                className="cursor-pointer"
                onClick={() => setSelectedGroupId(group.id)}
              >
                <h3 className="text-lg font-black text-zinc-900 group-hover:text-blue-600 transition">{group.name}</h3>
                <p className="text-xs font-semibold text-zinc-500 mt-1 line-clamp-2">
                  {group.description || 'No description.'}
                </p>
              </div>
              <button
                onClick={() => handleDeleteGroup(group.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-zinc-400 hover:text-red-500 transition"
                title="Delete group"
              >
                🗑️
              </button>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
              <div className="px-2.5 py-1 rounded-lg bg-zinc-100 text-[10px] font-black uppercase tracking-wider text-zinc-600">
                {group.member_count} Members
              </div>
              <button
                onClick={() => setSelectedGroupId(group.id)}
                className="text-xs font-bold text-zinc-900 hover:underline"
              >
                Manage →
              </button>
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <p className="text-sm font-bold text-zinc-400">No groups created yet.</p>
          </div>
        )}
      </div>

      {createEditModal}

    </div>
  )
}

export default CoachGroupsPage
