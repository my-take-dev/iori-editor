import { IconError } from '../../Icons'

interface CloneErrorProps {
  error: string
  onBack: () => void
  onClose: () => void
}

export function CloneError({
  error,
  onBack,
  onClose,
}: CloneErrorProps): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center py-4">
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
          <IconError />
        </div>
        <div className="text-[#f14c4c] text-[14px] font-medium mt-4">
          クローン失敗
        </div>
        <div className="text-[#808080] text-[12px] mt-2 text-center">
          {error}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 py-2 px-3 border border-[#3c3c3c] hover:bg-[#3c3c3c] rounded text-[#cccccc] text-[13px] transition-colors"
        >
          戻る
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2 px-3 bg-[#3c3c3c] hover:bg-[#4c4c4c] rounded text-[#cccccc] text-[13px] transition-colors"
        >
          閉じる
        </button>
      </div>
    </div>
  )
}
