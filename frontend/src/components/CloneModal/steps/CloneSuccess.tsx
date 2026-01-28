import { IconCheck } from '../../Icons'

interface CloneSuccessProps {
  clonedPath: string
  onClose: () => void
  onStartSession: () => void
}

export function CloneSuccess({
  clonedPath,
  onClose,
  onStartSession,
}: CloneSuccessProps): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center py-4">
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
          <IconCheck />
        </div>
        <div className="text-[#cccccc] text-[14px] font-medium mt-4">
          クローン完了
        </div>
        <div className="text-[#808080] text-[12px] mt-2 text-center">
          {clonedPath}
        </div>
      </div>

      <div className="text-[12px] text-[#808080] text-center">
        このフォルダでセッションを開始しますか？
      </div>

      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-2 px-3 border border-[#3c3c3c] hover:bg-[#3c3c3c] rounded text-[#cccccc] text-[13px] transition-colors"
        >
          閉じる
        </button>
        <button
          onClick={onStartSession}
          className="flex-1 py-2 px-3 bg-[#0e639c] hover:bg-[#1177bb] rounded font-medium text-white text-[13px] transition-colors"
        >
          セッションを開始
        </button>
      </div>
    </div>
  )
}
