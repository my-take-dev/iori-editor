import type { BranchInfo } from './NewSessionModal'

const IconGitBranch = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7v10M17 7v4m0 0a3 3 0 01-3 3H7m10-3l-3-3m3 3l3-3" />
  </svg>
)

const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const IconCloud = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
)

interface BranchSelectorProps {
  branches: BranchInfo[]
  selectedPath: string
  selectedBranch: string
  onSelect: (branchName: string) => void
  onConfirm: () => void
  onBack: () => void
  isLoading?: boolean
}

export function BranchSelector({
  branches,
  selectedPath,
  selectedBranch,
  onSelect,
  onConfirm,
  onBack,
  isLoading,
}: BranchSelectorProps): JSX.Element {
  return (
    <div className="space-y-3">
      <div className="text-[12px] text-[#808080]">
        ブランチを選択: <span className="text-[#007acc]">{selectedPath}</span>
      </div>
      <div className="max-h-[250px] overflow-y-auto border border-[#3c3c3c] rounded">
        {branches.map((branch) => (
          <div
            key={branch.name}
            onClick={() => onSelect(branch.name)}
            className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
              selectedBranch === branch.name
                ? 'bg-[#094771] text-white'
                : 'hover:bg-[#2a2d2e] text-[#cccccc]'
            }`}
          >
            <IconGitBranch />
            <span className="flex-1 text-[13px]">{branch.name}</span>
            {branch.isRemote && (
              <span className="flex items-center gap-0.5 text-[10px] bg-[#6e40c9] text-white px-1.5 py-0.5 rounded">
                <IconCloud />
                リモート
              </span>
            )}
            {branch.isCurrent && (
              <span className="text-[10px] bg-[#0e639c] text-white px-1.5 py-0.5 rounded">
                現在
              </span>
            )}
            {selectedBranch === branch.name && (
              <IconCheck />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 py-2 px-3 border border-[#3c3c3c] hover:bg-[#3c3c3c] rounded text-[#cccccc] text-[13px] transition-colors"
        >
          戻る
        </button>
        <button
          onClick={onConfirm}
          disabled={!selectedBranch || isLoading}
          className="flex-1 py-2 px-3 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#3c3c3c] disabled:text-[#808080] rounded font-medium text-white text-[13px] transition-colors"
        >
          {isLoading ? '切り替え中...' : 'このブランチで開始'}
        </button>
      </div>
    </div>
  )
}
