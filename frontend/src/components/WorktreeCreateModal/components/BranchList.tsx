import type { BranchListProps } from '../types'
import { IconGitBranch } from '../../Icons'

export function BranchList({
  branches,
  selectedBranch,
  onSelect,
}: BranchListProps): JSX.Element {
  return (
    <>
      <div className="text-[12px] text-[#808080]">
        元にするブランチを選択してください
      </div>
      <div className="max-h-[180px] overflow-y-auto border border-[#3c3c3c] rounded">
        {branches.map((branch) => {
          const isSelected = selectedBranch === branch.name
          const baseClass = 'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors'
          const selectedClass = 'bg-[#094771] text-white'
          const unselectedClass = 'hover:bg-[#2a2d2e] text-[#cccccc]'

          return (
            <div
              key={branch.name}
              onClick={() => onSelect(branch.name)}
              className={`${baseClass} ${isSelected ? selectedClass : unselectedClass}`}
            >
              <IconGitBranch />
              <span className="flex-1 text-[13px]">{branch.name}</span>
              {branch.isCurrent && (
                <span className="text-[10px] bg-[#0e639c] text-white px-1.5 py-0.5 rounded">
                  現在
                </span>
              )}
              {branch.isRemote && (
                <span className="text-[10px] bg-[#6e40c9] text-white px-1.5 py-0.5 rounded">
                  リモート
                </span>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
