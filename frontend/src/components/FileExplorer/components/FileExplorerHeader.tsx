import { memo } from 'react'
import type { FileExplorerHeaderProps } from '../types'
import { IconChevronLeft, IconChevronRight } from '../../Icons'

export const FileExplorerHeader = memo(function FileExplorerHeader({
  isCollapsed,
  onToggleCollapse,
}: FileExplorerHeaderProps): JSX.Element {
  return (
    <div className="h-10 px-2 flex items-center border-b border-border font-bold text-text-secondary uppercase justify-between bg-bg-primary">
      <button
        onClick={onToggleCollapse}
        className="p-1 hover:bg-bg-tertiary rounded"
      >
        {isCollapsed ? <IconChevronLeft /> : <IconChevronRight />}
      </button>
      {!isCollapsed && <span className="px-2">Explorer</span>}
    </div>
  )
})
