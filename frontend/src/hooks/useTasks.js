import { useMemo, useState } from 'react'

function useTasks() {
  const [selectedTask, setSelectedTask] = useState(null)
  const [justCompletedId, setJustCompletedId] = useState(null)
  const [tasks, setTasks] = useState([])

  const completedCount = useMemo(() => tasks.filter((task) => task.completed).length, [tasks])
  const dailyStatusMessage = useMemo(() => {
    if (completedCount === 0) {
      return 'Win the first battle of the day.'
    }

    if (tasks.length > 0 && completedCount === tasks.length) {
      return 'You won today 🏆'
    }

    return "You showed up. That's power."
  }, [completedCount, tasks.length])

  return {
    selectedTask,
    setSelectedTask,
    justCompletedId,
    setJustCompletedId,
    tasks,
    setTasks,
    completedCount,
    dailyStatusMessage,
  }
}

export default useTasks
