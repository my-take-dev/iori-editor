const IconGitBranch = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7v10M17 7v4m0 0a3 3 0 01-3 3H7m10-3l-3-3m3 3l3-3" />
  </svg>
)

const IconChevronDown = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

interface GitOptionsPanelProps {
  selectedPath: string
  isGitRepo: boolean
  currentBranch: string
  branchCount: number
  onUseCurrent: () => void
  onSelectExisting: () => void
  onCreateNew: () => void
  onNoGit: () => void
}

export function GitOptionsPanel({
  selectedPath,
  isGitRepo,
  currentBranch,
  branchCount,
  onUseCurrent,
  onSelectExisting,
  onCreateNew,
  onNoGit,
}: GitOptionsPanelProps): JSX.Element {
  return (
    <div className="space-y-2">
      <div className="text-[12px] text-[#808080] mb-3">
        {isGitRepo ? (
          <>
            Git オプション: <span className="text-[#007acc]">{selectedPath}</span>
            <div className="mt-1 flex items-center gap-1 text-[#cccccc]">
              <IconGitBranch />
              <span>現在のブランチ: <span className="text-[#4ec9b0]">{currentBranch}</span></span>
            </div>
          </>
        ) : (
          <>
            フォルダー: <span className="text-[#007acc]">{selectedPath}</span>
            <div className="mt-1 text-[#f14c4c]">※ Git リポジトリではありません</div>
          </>
        )}
      </div>

      {isGitRepo ? (
        <>
          <button
            onClick={onUseCurrent}
            className="w-full p-3 text-left border border-[#3c3c3c] hover:bg-[#2a2d2e] hover:border-[#007acc] rounded transition-colors group"
          >
            <div className="flex items-center gap-2">
              <IconGitBranch />
              <span className="font-medium text-[#cccccc] text-[13px]">現在のブランチを使用</span>
              <span className="text-[#4ec9b0] text-[12px]">({currentBranch})</span>
            </div>
            <div className="text-[11px] text-[#808080] mt-1 ml-6">
              現在チェックアウトされているブランチでそのまま作業
            </div>
          </button>

          <button
            onClick={onSelectExisting}
            className="w-full p-3 text-left border border-[#3c3c3c] hover:bg-[#2a2d2e] hover:border-[#007acc] rounded transition-colors"
          >
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <IconGitBranch />
                <span className="font-medium text-[#cccccc] text-[13px]">既存のブランチを選択</span>
              </div>
              <IconChevronDown />
            </div>
            <div className="text-[11px] text-[#808080] mt-1 ml-6">
              他のブランチに切り替えて作業（{branchCount} ブランチ）
            </div>
          </button>

          <button
            onClick={onCreateNew}
            className="w-full p-3 text-left border border-[#3c3c3c] hover:bg-[#2a2d2e] hover:border-[#007acc] rounded transition-colors"
          >
            <div className="font-medium text-[#cccccc] text-[13px]">新しいブランチを作成</div>
            <div className="text-[11px] text-[#808080] mt-1">
              既存のブランチから新規ブランチを作成して作業
            </div>
          </button>

          <button
            onClick={onNoGit}
            className="w-full p-3 text-left border border-[#3c3c3c] hover:bg-[#2a2d2e] hover:border-[#007acc] rounded transition-colors"
          >
            <div className="font-medium text-[#cccccc] text-[13px]">Git を使用しない</div>
            <div className="text-[11px] text-[#808080] mt-1">
              Git 機能を無効にしてフォルダを開く
            </div>
          </button>
        </>
      ) : (
        <button
          onClick={onNoGit}
          className="w-full p-3 text-left border border-[#3c3c3c] hover:bg-[#2a2d2e] hover:border-[#007acc] rounded transition-colors"
        >
          <div className="font-medium text-[#cccccc] text-[13px]">フォルダを開く</div>
          <div className="text-[11px] text-[#808080] mt-1">
            Git なしでフォルダを開きます
          </div>
        </button>
      )}
    </div>
  )
}
