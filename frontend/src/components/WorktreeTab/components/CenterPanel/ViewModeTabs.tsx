import type { CenterViewMode } from '../../types'
import { IconTerminal, IconEdit, IconHistory } from '../../../Icons'

interface ViewModeTabsProps {
  currentMode: CenterViewMode
  onSelectMode: (mode: CenterViewMode) => void
  onHistoryClick: () => void
}

export function ViewModeTabs({
  currentMode,
  onSelectMode,
  onHistoryClick,
}: ViewModeTabsProps): JSX.Element {
  const getTabClassName = (mode: CenterViewMode): string => {
    const isActive = currentMode === mode
    return `px-4 py-2 text-xs font-bold cursor-pointer rounded-t-md flex items-center gap-2 border-t border-l border-r transition-colors ${
      isActive
        ? 'bg-[#1e1e1e] border-[#3c3c3c] text-white relative top-[1px]'
        : 'bg-[#252526] border-transparent text-[#808080] hover:text-[#cccccc]'
    }`
  }

  return (
    <div className="h-10 bg-[#1e1e1e] border-b border-[#3c3c3c] flex items-end px-4 gap-1 select-none flex-shrink-0">
      <button onClick={() => onSelectMode('diff')} className={getTabClassName('diff')}>
        <IconTerminal /> DIFF
      </button>
      <button onClick={() => onSelectMode('editor')} className={getTabClassName('editor')}>
        <IconEdit /> EDITOR
      </button>
      <button onClick={onHistoryClick} className={getTabClassName('history')}>
        <IconHistory /> HISTORY
      </button>
    </div>
  )
}
