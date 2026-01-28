const IconCloud = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
)

interface PullConfirmDialogProps {
  baseBranch: string
  baseBranchIsRemote: boolean
  isPulling: boolean
  pullError: string | null
  onPull: () => void
  onSkip: () => void
  onBack: () => void
}

export function PullConfirmDialog({
  baseBranch,
  baseBranchIsRemote,
  isPulling,
  pullError,
  onPull,
  onSkip,
  onBack,
}: PullConfirmDialogProps): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="text-[12px] text-[#808080]">
        基準ブランチ: <span className="text-[#4ec9b0]">{baseBranch}</span>
        {baseBranchIsRemote && (
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
          {baseBranchIsRemote
            ? 'リモートリポジトリから最新の変更をフェッチしてから新しいブランチを作成します。'
            : 'リモートリポジトリから最新の変更をプルしてから新しいブランチを作成します。'
          }
        </div>
      </div>

      {pullError && (
        <div className="p-3 bg-[#5c2020] rounded border border-[#f14c4c]">
          <div className="text-[#f14c4c] font-medium text-[12px] mb-1">更新失敗</div>
          <div className="text-[11px] text-[#cccccc]">{pullError}</div>
          <div className="text-[11px] text-[#808080] mt-2">
            最新化せずにブランチを作成することもできます。
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onSkip}
          disabled={isPulling}
          className="flex-1 py-2 px-3 border border-[#3c3c3c] hover:bg-[#3c3c3c] disabled:opacity-50 rounded text-[#cccccc] text-[13px] transition-colors"
        >
          そのまま作成
        </button>
        <button
          onClick={onPull}
          disabled={isPulling}
          className="flex-1 py-2 px-3 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#3c3c3c] disabled:text-[#808080] rounded font-medium text-white text-[13px] transition-colors"
        >
          {isPulling ? (baseBranchIsRemote ? 'フェッチ中...' : 'プル中...') : '最新化して作成'}
        </button>
      </div>

      <button
        onClick={onBack}
        disabled={isPulling}
        className="w-full py-2 px-3 border border-[#3c3c3c] hover:bg-[#3c3c3c] disabled:opacity-50 rounded text-[#cccccc] text-[13px] transition-colors"
      >
        戻る
      </button>
    </div>
  )
}
