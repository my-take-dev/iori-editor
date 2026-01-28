import { IconEdit, IconGitBranch, IconHistory, IconDiff } from '../Icons'
import type { ViewMode } from '../../types/viewMode'

interface ViewSwitcherProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
  showWorktreeTab: boolean
  onHistoryClick?: () => void
}

/**
 * Tab switcher component for view modes (DIFF, EDITOR, HISTORY, WORKTREE)
 */
export function ViewSwitcher({
  currentView,
  onViewChange,
  showWorktreeTab,
  onHistoryClick,
}: ViewSwitcherProps): JSX.Element {
  const handleHistoryClick = () => {
    if (onHistoryClick) {
      onHistoryClick()
    } else {
      onViewChange('history')
    }
  }

  return (
    <div className="h-10 bg-bg-primary border-b border-border flex items-end px-4 gap-1 select-none flex-shrink-0">
      {/* DIFF tab - hide when in worktree mode */}
      {!showWorktreeTab && (
        <button
          onClick={() => onViewChange('diff')}
          className={`px-4 py-2 text-xs font-bold cursor-pointer rounded-t-md flex items-center gap-2 border-t border-l border-r transition-colors ${
            currentView === 'diff'
              ? 'bg-bg-editor border-border text-white relative top-[1px]'
              : 'bg-bg-primary border-transparent text-text-muted hover:text-text-secondary'
          }`}
        >
          <IconDiff /> DIFF
        </button>
      )}
      {/* EDITOR tab - hide when in worktree mode */}
      {!showWorktreeTab && (
        <button
          onClick={() => onViewChange('editor')}
          className={`px-4 py-2 text-xs font-bold cursor-pointer rounded-t-md flex items-center gap-2 border-t border-l border-r transition-colors ${
            currentView === 'editor'
              ? 'bg-bg-editor border-border text-white relative top-[1px]'
              : 'bg-bg-primary border-transparent text-text-muted hover:text-text-secondary'
          }`}
        >
          <IconEdit /> EDITOR
        </button>
      )}
      {/* HISTORY tab - always show */}
      <button
        onClick={handleHistoryClick}
        className={`px-4 py-2 text-xs font-bold cursor-pointer rounded-t-md flex items-center gap-2 border-t border-l border-r transition-colors ${
          currentView === 'history'
            ? 'bg-bg-editor border-border text-white relative top-[1px]'
            : 'bg-bg-primary border-transparent text-text-muted hover:text-text-secondary'
        }`}
      >
        <IconHistory /> HISTORY
      </button>
      {/* WORKTREE tab - show only in worktree mode */}
      {showWorktreeTab && (
        <button
          onClick={() => onViewChange('worktree')}
          className={`px-4 py-2 text-xs font-bold cursor-pointer rounded-t-md flex items-center gap-2 border-t border-l border-r transition-colors ${
            currentView === 'worktree'
              ? 'bg-bg-editor border-border text-white relative top-[1px]'
              : 'bg-bg-primary border-transparent text-text-muted hover:text-text-secondary'
          }`}
        >
          <IconGitBranch /> WORKTREE
        </button>
      )}
    </div>
  )
}
