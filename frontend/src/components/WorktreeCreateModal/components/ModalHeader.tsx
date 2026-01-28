import type { ModalHeaderProps } from '../types'
import { IconGitBranch } from '../../Icons'

export function ModalHeader({ onClose }: ModalHeaderProps): JSX.Element {
  return (
    <div className="px-5 py-3 border-b border-[#3c3c3c] flex justify-between items-center bg-[#1e1e1e] rounded-t-lg">
      <div className="flex items-center gap-2">
        <IconGitBranch />
        <h2 className="font-semibold text-[#cccccc] text-[14px]">Worktree を追加</h2>
      </div>
      <button
        onClick={onClose}
        className="text-[#808080] hover:text-white transition-colors text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}
