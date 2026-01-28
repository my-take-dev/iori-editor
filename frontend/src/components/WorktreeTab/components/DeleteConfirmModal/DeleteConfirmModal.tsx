interface DeleteConfirmModalProps {
  worktreeName: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmModal({
  worktreeName,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onCancel}
    >
      <div
        className="bg-[#252526] border border-[#3c3c3c] rounded-lg p-5 w-[360px]"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-[14px] font-medium text-[#cccccc] mb-3">Worktree を削除</h3>
        <p className="text-[12px] text-[#808080] mb-4">
          <span className="text-[#4ec9b0]">{worktreeName}</span> を削除しますか？
          <br />
          <span className="text-[#f14c4c]">worktree フォルダも削除されます。</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-3 border border-[#3c3c3c] hover:bg-[#3c3c3c] rounded text-[#cccccc] text-[12px] transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 px-3 bg-[#f14c4c] hover:bg-[#d73a3a] rounded text-white text-[12px] font-medium transition-colors"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  )
}
