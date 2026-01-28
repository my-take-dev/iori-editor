import type { TabSelectorProps } from '../types'
import { IconPlus, IconFolder } from '../../Icons'

export function TabSelector({
  activeTab,
  selectableCount,
  onTabChange,
}: TabSelectorProps): JSX.Element {
  const baseClass = 'flex-1 px-4 py-2 text-[13px] transition-colors'
  const activeClass = 'text-[#cccccc] border-b-2 border-[#007acc] bg-[#1e1e1e]'
  const inactiveClass = 'text-[#808080] hover:text-[#cccccc]'

  return (
    <div className="flex border-b border-[#3c3c3c]">
      <button
        onClick={() => onTabChange('new')}
        className={`${baseClass} ${activeTab === 'new' ? activeClass : inactiveClass}`}
      >
        <div className="flex items-center justify-center gap-2">
          <IconPlus />
          新規作成
        </div>
      </button>
      <button
        onClick={() => onTabChange('existing')}
        className={`${baseClass} ${activeTab === 'existing' ? activeClass : inactiveClass}`}
      >
        <div className="flex items-center justify-center gap-2">
          <IconFolder />
          既存を選択 ({selectableCount})
        </div>
      </button>
    </div>
  )
}
