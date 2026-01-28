import type { ChangesPanelHeaderProps } from '../types'
import { IconChevronLeft, IconChevronRight, IconRefresh, IconMoreHorizontal } from '../../Icons'
import { GitActionMenu } from './GitActionMenu'

export function ChangesPanelHeader({
  isCollapsed,
  onToggleCollapse,
  isGitRepo,
  isMainMenuOpen,
  onToggleMainMenu,
  onRefresh,
  mainMenuRef,
  onPull,
  onPush,
  onClone,
  onFetch,
  onCommit,
  commitDisabled,
}: ChangesPanelHeaderProps): JSX.Element {
  return (
    <div className="h-9 px-2 flex items-center justify-between bg-[#181818] border-b border-[#3c3c3c]">
      <button
        onClick={onToggleCollapse}
        className="p-1 hover:bg-[#3c3c3c] rounded"
      >
        {isCollapsed ? <IconChevronLeft /> : <IconChevronRight />}
      </button>
      {!isCollapsed && (
        <>
          <span className="text-[11px] font-semibold text-[#cccccc] uppercase tracking-wide flex-1 ml-1">
            ソース管理
          </span>
          <div className="flex items-center gap-0.5 relative" ref={mainMenuRef}>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1 hover:bg-[#3c3c3c] rounded text-[#cccccc]"
                title="更新"
              >
                <IconRefresh />
              </button>
            )}
            <button
              onClick={onToggleMainMenu}
              className={`p-1 hover:bg-[#3c3c3c] rounded text-[#cccccc] ${isMainMenuOpen ? 'bg-[#3c3c3c]' : ''}`}
              title="その他のアクション"
            >
              <IconMoreHorizontal />
            </button>

            {isGitRepo && (
              <GitActionMenu
                isOpen={isMainMenuOpen}
                onClose={onToggleMainMenu}
                onPull={onPull}
                onPush={onPush}
                onClone={onClone}
                onFetch={onFetch}
                onCommit={onCommit}
                commitDisabled={commitDisabled}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
