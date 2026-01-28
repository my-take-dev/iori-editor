import type { Session, AIStatus } from '../../types'
import { IconChevronLeft } from '../../../Icons'
import { SessionListItem } from './SessionListItem'
import { NewSessionButton } from './NewSessionButton'

interface SessionListProps {
  sessions: Session[]
  activeSessionId: string | null
  aiStatuses: Record<string, AIStatus>
  width: number
  isCollapsed: boolean
  onSelectSession: (sessionId: string) => void
  onDeleteRequest: (session: Session) => void
  onCreateWorktree: () => void
  onToggleCollapse: () => void
  parentSession?: Session
  onExitWorktreeMode?: () => void
}

export function SessionList({
  sessions,
  activeSessionId,
  aiStatuses,
  width,
  isCollapsed,
  onSelectSession,
  onDeleteRequest,
  onCreateWorktree,
  onToggleCollapse,
  parentSession,
  onExitWorktreeMode,
}: SessionListProps): JSX.Element {
  return (
    <div
      style={{ width: isCollapsed ? 40 : width }}
      className="flex flex-col border-r border-[#3c3c3c] bg-[#252526] transition-all"
    >
      {/* Header */}
      <div className="h-8 px-2 flex items-center justify-between border-b border-[#3c3c3c]">
        {!isCollapsed && (
          <span className="text-[11px] text-[#808080] uppercase font-medium">Sessions</span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 text-[#808080] hover:text-white transition-colors"
          style={{
            transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          <IconChevronLeft />
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Exit to Parent Session */}
          {parentSession && onExitWorktreeMode && (
            <button
              onClick={onExitWorktreeMode}
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-[#cccccc] hover:bg-[#3c3c3c] border-b border-[#3c3c3c] transition-colors"
              title={`Exit to ${parentSession.name}`}
            >
              <span className="text-[#808080]">←</span>
              <span className="truncate">Exit: {parentSession.name}</span>
            </button>
          )}

          {/* Session List */}
          <div className="flex-1 overflow-y-auto">
            {sessions.map(session => {
              const isActive = session.id === activeSessionId
              const aiStatus = aiStatuses[session.id] || 'idle'

              return (
                <SessionListItem
                  key={session.id}
                  session={session}
                  isActive={isActive}
                  aiStatus={aiStatus}
                  onSelect={() => onSelectSession(session.id)}
                  onDeleteRequest={() => onDeleteRequest(session)}
                />
              )
            })}
          </div>

          {/* New Button */}
          <NewSessionButton onClick={onCreateWorktree} />
        </>
      )}
    </div>
  )
}
