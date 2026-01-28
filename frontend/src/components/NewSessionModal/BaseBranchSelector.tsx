import type { BranchInfo } from './NewSessionModal'

const IconGitBranch = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7v10M17 7v4m0 0a3 3 0 01-3 3H7m10-3l-3-3m3 3l3-3" />
  </svg>
)

const IconCloud = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
)

interface BaseBranchSelectorProps {
  branches: BranchInfo[]
  onSelect: (branchName: string, isRemote: boolean) => void
  onBack: () => void
}

export function BaseBranchSelector({
  branches,
  onSelect,
  onBack,
}: BaseBranchSelectorProps): JSX.Element {
  return (
    <div className="space-y-3">
      <div className="text-[12px] text-[#808080]">
        元にするブランチを選択してください
      </div>
      <div className="max-h-[250px] overflow-y-auto border border-[#3c3c3c] rounded">
        {branches.map((branch) => (
          <div
            key={branch.name}
            onClick={() => onSelect(branch.name, branch.isRemote || false)}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-[#2a2d2e] text-[#cccccc]"
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
          </div>
        ))}
      </div>
      <button
        onClick={onBack}
        className="w-full py-2 px-3 border border-[#3c3c3c] hover:bg-[#3c3c3c] rounded text-[#cccccc] text-[13px] transition-colors"
      >
        戻る
      </button>
    </div>
  )
}
