import type { ExistingWorktreeListProps } from '../types'
import { IconGitBranch } from '../../Icons'

export function ExistingWorktreeList({
  worktrees,
  onSelect,
}: ExistingWorktreeListProps): JSX.Element {
  if (worktrees.length === 0) {
    return (
      <div className="text-center py-8 text-[#808080] text-[13px]">
        選択可能な既存 worktree がありません
      </div>
    )
  }

  return (
    <>
      <div className="text-[12px] text-[#808080]">
        既存の worktree を選択してください
      </div>
      <div className="max-h-[300px] overflow-y-auto border border-[#3c3c3c] rounded">
        {worktrees.map((wt) => (
          <div
            key={wt.path}
            onClick={() => onSelect(wt.path)}
            className="px-3 py-3 cursor-pointer transition-colors hover:bg-[#2a2d2e] border-b border-[#3c3c3c] last:border-b-0"
          >
            <div className="flex items-center gap-2 text-[#cccccc]">
              <IconGitBranch />
              <span className="font-medium text-[13px]">{wt.branch}</span>
              {wt.isDetached && (
                <span className="text-[10px] bg-[#f14c4c] text-white px-1.5 py-0.5 rounded">
                  detached
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#808080] mt-1 ml-6 truncate">
              {wt.path}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
