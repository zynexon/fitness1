function ConfirmationModal({ 
  open, 
  title = "Confirm Action", 
  message = "Are you sure?", 
  confirmText = "YES", 
  cancelText = "NO", 
  onConfirm, 
  onCancel 
}) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 sm:items-center backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-300 bg-white p-5 shadow-xl">
        <h2 className="text-base font-bold text-zinc-900">{title}</h2>
        <p className="mt-2 text-sm text-zinc-600">{message}</p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            {confirmText}
          </button>
          {cancelText && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              {cancelText}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConfirmationModal
