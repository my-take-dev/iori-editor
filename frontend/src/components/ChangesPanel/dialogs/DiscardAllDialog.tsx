import type { DiscardAllDialogProps } from '../types'

export function DiscardAllDialog({
  fileCount,
  onConfirm,
  onCancel,
}: DiscardAllDialogProps): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(2px)' }}
      onClick={onCancel}
    >
      <div
        className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-[400px] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-[#3c3c3c] bg-[#1e1e1e] rounded-t-lg">
          <h2 className="font-semibold text-[#cccccc] text-[14px]">すべての変更を破棄</h2>
        </div>
        <div className="p-5">
          <p className="text-[#cccccc] text-[13px] mb-4">
            <span className="font-semibold text-[#e0e0e0]">{fileCount}個</span> のファイルの変更をすべて破棄してもよろしいですか？
          </p>
          <p className="text-[#808080] text-[12px] mb-4">
            この操作は元に戻せません。
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-[#3c3c3c] hover:bg-[#3c3c3c] rounded text-[#cccccc] text-[13px] transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-[#c42b1c] hover:bg-[#d63b2c] rounded text-white text-[13px] transition-colors"
            >
              すべて破棄
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
