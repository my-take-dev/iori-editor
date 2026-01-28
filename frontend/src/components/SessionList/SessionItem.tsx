import { useState, memo, useCallback, type MouseEvent } from 'react'
import { IconSpinner, IconPause, IconRobot, IconClose, IconGitBranch, IconChevronDown } from '../Icons'
import type { AIStatus, SessionItemProps, WorktreeStatusDotInfo } from './types'

const AIStatusIndicator = memo(function AIStatusIndicator({ status }: { status: AIStatus }): JSX.Element {
  switch (status) {
    case 'working':
      return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
          <IconSpinner />
          <span className="text-[10px] font-bold uppercase">Working</span>
        </div>
      )
    case 'waiting':
      return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
          <IconPause />
          <span className="text-[10px] font-bold uppercase">Waiting</span>
        </div>
      )
    case 'idle':
    default:
      return (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">
          <IconRobot />
          <span className="text-[10px] font-bold uppercase">Idle</span>
        </div>
      )
  }
})
AIStatusIndicator.displayName = 'AIStatusIndicator'

const WORKTREE_STATUS_CONFIG = {
  working: { label: 'Working', bgClass: 'bg-green-500' },
  waiting: { label: 'Waiting', bgClass: 'bg-yellow-500' },
  idle: { label: 'Idle', bgClass: 'bg-gray-500' },
} as const

const WorktreeStatusDots = memo(function WorktreeStatusDots({ worktrees }: { worktrees: WorktreeStatusDotInfo[] }): JSX.Element | null {
  if (worktrees.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-1 px-1">
      {worktrees.map((wt) => {
        const config = WORKTREE_STATUS_CONFIG[wt.status] ?? WORKTREE_STATUS_CONFIG.idle

        return (
          <span
            key={wt.id}
            title={`${wt.branch}: ${config.label}`}
            className={`w-2 h-2 rounded-full cursor-default transition-colors ${config.bgClass}`}
          />
        )
      })}
    </div>
  )
})
WorktreeStatusDots.displayName = 'WorktreeStatusDots'

export const SessionItem = memo(function SessionItem({
  session,
  isActive,
  index,
  aiStatus,
  branchSwitchInfo,
  onSelect,
  onDelete,
  onBranchSwitch,
  onWorktreeMode,
  onServerMode,
  worktreeSessionsInfo,
}: SessionItemProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false)

  let borderColor: string
  if (isActive) {
    borderColor = 'border-l-accent-blue'
  } else if (aiStatus === 'working') {
    borderColor = 'border-l-green-500'
  } else if (aiStatus === 'waiting') {
    borderColor = 'border-l-yellow-500'
  } else {
    borderColor = 'border-l-transparent'
  }

  let bgColor: string
  let hoverBgColor: string
  if (isActive) {
    bgColor = 'bg-accent-blue-bg/30'
    hoverBgColor = 'hover:bg-accent-blue-bg/40'
  } else if (aiStatus === 'working') {
    bgColor = 'bg-green-500/30'
    hoverBgColor = 'hover:bg-green-500/40'
  } else if (aiStatus === 'waiting') {
    bgColor = 'bg-yellow-500/30'
    hoverBgColor = 'hover:bg-yellow-500/40'
  } else {
    bgColor = ''
    hoverBgColor = 'hover:bg-bg-secondary'
  }

  const handleDelete = useCallback((e: MouseEvent): void => {
    e.stopPropagation()
    onDelete(session.id, session.name)
  }, [onDelete, session.id, session.name])

  const handleBranchClick = useCallback((e: MouseEvent): void => {
    e.stopPropagation()
    if (branchSwitchInfo.canSwitch) {
      onBranchSwitch(session.id, session.workDir)
    }
  }, [branchSwitchInfo.canSwitch, onBranchSwitch, session.id, session.workDir])

  const getBranchTooltip = useCallback((): string => {
    if (branchSwitchInfo.canSwitch) {
      return 'クリックでブランチを切り替え'
    }
    // With discriminated union, reason is guaranteed to exist when canSwitch is false
    return `切り替え不可: ${branchSwitchInfo.reason}`
  }, [branchSwitchInfo])

  return (
    <div
      onClick={() => onSelect(session.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`p-3 border-b border-border cursor-pointer transition-colors ${bgColor} ${hoverBgColor} border-l-2 ${borderColor} relative group`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-text-primary truncate flex-1">{session.name}</span>
        <button
          onClick={handleDelete}
          className={`p-1 rounded hover:bg-red-500/20 hover:text-red-400 text-text-muted transition-all ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          title="セッションを閉じる"
        >
          <IconClose size="sm" />
        </button>
      </div>

      <div className="mt-2">
        <AIStatusIndicator status={aiStatus} />
      </div>

      <div className="text-xs text-text-muted flex items-center gap-2 mt-2">
        {session.isGitRepo && session.branch ? (
          <button
            onClick={handleBranchClick}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
              branchSwitchInfo.canSwitch
                ? 'text-accent-purple hover:bg-accent-purple/20 cursor-pointer'
                : 'text-text-muted cursor-not-allowed opacity-60'
            }`}
            title={getBranchTooltip()}
          >
            <IconGitBranch size="sm" />
            <span>{session.branch}</span>
            {branchSwitchInfo.canSwitch && <IconChevronDown size="sm" />}
          </button>
        ) : !session.isGitRepo ? (
          <span className="text-text-muted">(no git)</span>
        ) : null}
      </div>

      {session.isGitRepo && !session.isWorktree && (
        <div className="mt-2 flex gap-2">
          {onWorktreeMode && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onWorktreeMode(session.id)
              }}
              className="text-[10px] text-[#b4b4b4] hover:text-[#007acc] px-1.5 py-0.5 rounded hover:bg-[#007acc]/10 transition-colors"
            >
              [worktree]
            </button>
          )}
          {onServerMode && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onServerMode(session.id, session.branch || 'main', session.workDir)
              }}
              className="text-[10px] text-[#b4b4b4] hover:text-[#4caf50] px-1.5 py-0.5 rounded hover:bg-[#4caf50]/10 transition-colors"
              title="スマホからアクセス可能なサーバーを起動"
            >
              [server]
            </button>
          )}
        </div>
      )}

      {worktreeSessionsInfo && worktreeSessionsInfo.length > 0 && (
        <WorktreeStatusDots worktrees={worktreeSessionsInfo} />
      )}

      <div className="text-[10px] text-text-muted mt-1 opacity-60">Ctrl+Shift+{index + 1}</div>
    </div>
  )
})
SessionItem.displayName = 'SessionItem'
