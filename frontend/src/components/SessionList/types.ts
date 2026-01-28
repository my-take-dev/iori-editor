import type { Session } from '../../types/session'
import type { AIStatus } from '../../stores/aiStatusStore'

export type { AIStatus }

// BranchSwitchInfo contains information about branch switching capability
// Using discriminated union to enforce that `reason` is required when `canSwitch` is false
export type BranchSwitchInfo =
  | { canSwitch: true; hasChanges: boolean; hasUnpushed: boolean }
  | { canSwitch: false; reason: string; hasChanges: boolean; hasUnpushed: boolean }

// Helper to create a "can switch" info
export function canSwitchBranch(hasChanges: boolean, hasUnpushed: boolean): BranchSwitchInfo {
  return { canSwitch: true, hasChanges, hasUnpushed }
}

// Helper to create a "cannot switch" info with reason
export function cannotSwitchBranch(reason: string, hasChanges: boolean, hasUnpushed: boolean): BranchSwitchInfo {
  return { canSwitch: false, reason, hasChanges, hasUnpushed }
}

export interface WorktreeStatusDotInfo {
  id: string
  branch: string
  status: AIStatus
}

export interface SessionItemProps {
  session: Session
  isActive: boolean
  index: number
  aiStatus: AIStatus
  branchSwitchInfo: BranchSwitchInfo
  onSelect: (id: string) => void
  onDelete: (id: string, name: string) => void
  onBranchSwitch: (sessionId: string, workDir: string) => void
  onWorktreeMode?: (sessionId: string) => void
  onServerMode?: (sessionId: string, baseBranch: string, repoPath: string) => void
  worktreeSessionsInfo?: WorktreeStatusDotInfo[]
}

export interface SessionListProps {
  onCreateSession: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  width: number
  aiStatuses?: Record<string, AIStatus>
  branchSwitchInfos?: Record<string, BranchSwitchInfo>
  onBranchChanged?: (sessionId: string, newBranch: string) => void
  onWorktreeMode?: (sessionId: string) => void
  onServerMode?: (sessionId: string, baseBranch: string, repoPath: string) => void
  onSessionSelected?: (sessionId: string) => void
  allWorktreeSessionsMap?: Record<string, WorktreeStatusDotInfo[]>
}

export interface BranchSelectorModalProps {
  isOpen: boolean
  workDir: string
  currentBranch: string
  isSwitching: boolean
  onSelect: (branchName: string) => void
  onCancel: () => void
}
