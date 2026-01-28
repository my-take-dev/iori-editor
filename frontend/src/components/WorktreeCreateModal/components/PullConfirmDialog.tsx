import type { PullConfirmDialogProps } from '../types'
import { IconCloud } from '../../Icons'

export function PullConfirmDialog({
  branchName,
  isRemote,
  isPulling,
  error,
  onPullAndContinue,
  onSkipPull,
  onCancel,
}: PullConfirmDialogProps): JSX.Element {
  function getActionLabel(): string {
    if (isPulling) {
      return isRemote ? 'フェッチ中...' : 'プル中...'
    }
    return '最新化して作成'
  }

  function getDescription(): string {
    if (isRemote) {
      return 'リモートリポジトリから最新の変更をフェッチしてから Worktree を作成します。'
    }
    return 'リモートリポジトリから最新の変更をプルしてから Worktree を作成します。'
  }

  return (
    <div className="space-y-4">
      <div className="text-[12px] text-[#808080]">
        基準ブランチ: <span className="text-[#4ec9b0]">{branchName}</span>
        {isRemote && (
          <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] bg-[#6e40c9] text-white px-1.5 py-0.5 rounded">
            <IconCloud />
            リモート
          </span>
        )}
      </div>

      <div className="p-3 bg-[#1e1e1e] border border-[#3c3c3c] rounded">
        <div className="text-[13px] text-[#cccccc] mb-2">
          基準ブランチを最新化してから作成しますか?
        </div>
        <div className="text-[11px] text-[#808080]">
          {getDescription()}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#5c2020] rounded border border-[#f14c4c]">
          <div className="text-[#f14c4c] font-medium text-[12px] mb-1">更新失敗</div>
          <div className="text-[11px] text-[#cccccc]">{error}</div>
          <div className="text-[11px] text-[#808080] mt-2">
            最新化せずに Worktree を作成することもできます。
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onSkipPull}
          disabled={isPulling}
          className="flex-1 py-2 px-3 border border-[#3c3c3c] hover:bg-[#3c3c3c] disabled:opacity-50 rounded text-[#cccccc] text-[13px] transition-colors"
        >
          そのまま作成
        </button>
        <button
          onClick={onPullAndContinue}
          disabled={isPulling}
          className="flex-1 py-2 px-3 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#3c3c3c] disabled:text-[#808080] rounded font-medium text-white text-[13px] transition-colors"
        >
          {getActionLabel()}
        </button>
      </div>

      <button
        onClick={onCancel}
        disabled={isPulling}
        className="w-full py-2 px-3 border border-[#3c3c3c] hover:bg-[#3c3c3c] disabled:opacity-50 rounded text-[#cccccc] text-[13px] transition-colors"
      >
        戻る
      </button>
    </div>
  )
}
