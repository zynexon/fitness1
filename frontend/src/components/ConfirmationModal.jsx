function ConfirmationModal({ open, taskName, onYes, onNo, onClose }) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-zinc-300 bg-white p-5 shadow-xl">
        <h2 className="text-base font-bold text-zinc-900">Did you actually complete this?</h2>
        <p className="mt-2 text-sm text-zinc-600">Task: {taskName}</p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onYes}
            className="flex-1 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            YES
          </button>
          <button
            type="button"
            onClick={onNo}
            className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
          >
            NO
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-xl px-4 py-2 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default ConfirmationModal
