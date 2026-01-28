import { memo } from 'react'
import type { Session, AIStatus } from '../../types'
import { IconGitBranch, IconRobot, IconClose } from '../../../Icons'

interface SessionListItemProps {
  session: Session
  isActive: boolean
  aiStatus: AIStatus
  onSelect: () => void
  onDeleteRequest: () => void
}

export const SessionListItem = memo(function SessionListItem({
  session,
  isActive,
  aiStatus,
  onSelect,
  onDeleteRequest,
}: SessionListItemProps): JSX.Element {
  let bgClass: string
  if (isActive) {
    bgClass = 'bg-[#094771] hover:bg-[#106ebe]'
  } else if (aiStatus === 'working') {
    bgClass = 'bg-green-500/30 hover:bg-green-500/40'
  } else if (aiStatus === 'waiting') {
    bgClass = 'bg-yellow-500/30 hover:bg-yellow-500/40'
  } else {
    bgClass = 'hover:bg-[#2a2d2e]'
  }

  return (
    <div
      onClick={onSelect}
      className={`px-2 py-2 cursor-pointer border-b border-[#3c3c3c] transition-colors group ${bgClass}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <IconGitBranch />
          <span className="text-[12px] text-[#cccccc] truncate">{session.name}</span>
        </div>
        <button
          onClick={e => {
            e.stopPropagation()
            onDeleteRequest()
          }}
          className="p-1 text-[#808080] hover:text-[#f14c4c] transition-colors opacity-0 group-hover:opacity-100"
        >
          <IconClose />
        </button>
      </div>
      {aiStatus !== 'idle' && (
        <div className="flex items-center gap-1 mt-1">
          <IconRobot />
          <span
            className={`text-[10px] ${aiStatus === 'working' ? 'text-green-400' : 'text-yellow-400'}`}
          >
            {aiStatus === 'working' ? 'Working' : 'Waiting'}
          </span>
        </div>
      )}
    </div>
  )
})
SessionListItem.displayName = 'SessionListItem'
