import type { Session } from '../../types/session'
import type { AIStatus } from '../../stores/aiStatusStore'

export type { AIStatus }
export type CenterViewMode = 'diff' | 'editor' | 'history'

/**
 * Grouped lifecycle handlers for worktree mode
 */
export interface WorktreeLifecycleHandlers {
  onExitWorktreeMode?: () => void
  onSelectWorktreeSession: (sessionId: string) => void
  onCreateWorktree: () => void
  onDeleteWorktree: (sessionId: string) => void
}

/**
 * Terminal control props
 */
export interface TerminalControlProps {
  isTerminalMaximized: boolean
  onToggleTerminalMaximize: () => void
}

/**
 * Simplified WorktreeTab props - using stores for operations and history
 */
export interface WorktreeTabProps {
  parentSession?: Session
  lifecycleHandlers: WorktreeLifecycleHandlers
  terminalControl: TerminalControlProps
}

// Re-export types for convenience
export type { Session } from '../../types/session'
export type { FileChange } from '../../types/git'
export type { HistoryInfo, TerminalHistory } from '../../types/history'
export type { FileNode } from '../FileExplorer'
