import type { WorktreeNameInputProps } from '../types'

export function WorktreeNameInput({
  customName,
  effectiveCustomName,
  selectedBranch,
  isLoading,
  disabled,
  onChange,
  onSubmit,
}: WorktreeNameInputProps): JSX.Element {
  return (
    <>
      <div className="space-y-2">
        <div className="text-[12px] text-[#808080]">
          ブランチ名（任意）
        </div>
        <input
          type="text"
          value={customName}
          onChange={(e) => onChange(e.target.value)}
          placeholder="feature-name"
          className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-[#cccccc] text-[13px] focus:border-[#007acc] focus:outline-none"
        />
        <div className="text-[11px] text-[#555]">
          新しいブランチ名: <span className="text-[#4ec9b0]">{selectedBranch}-{effectiveCustomName}-xxxxx</span>
        </div>
      </div>
      <button
        onClick={onSubmit}
        disabled={disabled || isLoading}
        className="w-full py-2 px-3 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#3c3c3c] disabled:text-[#808080] rounded font-medium text-white text-[13px] transition-colors"
      >
        {isLoading ? '作成中...' : 'Worktree を作成'}
      </button>
    </>
  )
}
