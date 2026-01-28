interface NewBranchFormProps {
  baseBranch: string
  newBranchName: string
  onNameChange: (name: string) => void
  onCreate: () => void
  onBack: () => void
  isLoading?: boolean
}

export function NewBranchForm({
  baseBranch,
  newBranchName,
  onNameChange,
  onCreate,
  onBack,
  isLoading,
}: NewBranchFormProps): JSX.Element {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter' && !isLoading) {
      onCreate()
    } else if (e.key === 'Escape') {
      onBack()
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-[12px] text-[#808080]">
        <span className="text-[#4ec9b0]">{baseBranch}</span> から新しいブランチを作成
      </div>
      <input
        type="text"
        value={newBranchName}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="ブランチ名 (例: feature/my-feature)"
        className="w-full px-3 py-2 bg-[#3c3c3c] border border-[#3c3c3c] focus:border-[#007acc] rounded text-[#cccccc] text-[13px] placeholder-[#808080] focus:outline-none"
        autoFocus
        onKeyDown={handleKeyDown}
      />
      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 py-2 px-3 border border-[#3c3c3c] hover:bg-[#3c3c3c] rounded text-[#cccccc] text-[13px] transition-colors"
        >
          戻る
        </button>
        <button
          onClick={onCreate}
          disabled={!newBranchName.trim() || isLoading}
          className="flex-1 py-2 px-3 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#3c3c3c] disabled:text-[#808080] rounded font-medium text-white text-[13px] transition-colors"
        >
          {isLoading ? '作成中...' : 'ブランチを作成して開始'}
        </button>
      </div>
    </div>
  )
}
