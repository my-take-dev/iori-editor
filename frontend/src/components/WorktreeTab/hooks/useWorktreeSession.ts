import { useState, useMemo, useCallback } from 'react'
import type { Session } from '../types'
import {
  useWorktreeStore,
  selectWorktreeSessions,
  selectActiveWorktreeSession,
} from '../../../stores/worktreeStore'
import { useAIStatusStore, selectAllStatuses } from '../../../stores/aiStatusStore'

interface UseWorktreeSessionOptions {
  onDeleteWorktree: (sessionId: string) => void
}

interface DeleteConfirmState {
  id: string
  name: string
}

export interface UseWorktreeSessionReturn {
  displayableSessions: Session[]
  activeSession: Session | undefined
  deleteConfirm: DeleteConfirmState | null
  handleDeleteRequest: (session: Session) => void
  handleDeleteConfirm: () => Promise<void>
  handleDeleteCancel: () => void
}

/**
 * Hook for managing worktree session filtering and delete confirmation
 * Filters sessions based on workDir blocking logic and manages delete modal state
 * Now uses worktreeStore and aiStatusStore directly
 */
export function useWorktreeSession({
  onDeleteWorktree,
}: UseWorktreeSessionOptions): UseWorktreeSessionReturn {
  // Get state from stores
  const worktreeSessions = useWorktreeStore(selectWorktreeSessions)
  const activeWorktreeSessionId = useWorktreeStore(selectActiveWorktreeSession)
  const aiStatuses = useAIStatusStore(selectAllStatuses)

  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)

  // Filter out sessions whose folder is already in use
  const displayableSessions = useMemo(() => {
    // 1. Currently selected session's workDir
    const currentSession = worktreeSessions.find(s => s.id === activeWorktreeSessionId)
    const currentSessionWorkDir = currentSession?.workDir?.toLowerCase()

    // 2. Terminal active sessions' workDirs
    const terminalActiveWorkDirs = worktreeSessions
      .filter(s => aiStatuses[s.id] && aiStatuses[s.id] !== 'idle')
      .map(s => s.workDir.toLowerCase())

    // Combine blocked workDirs
    const blockedWorkDirs = new Set([
      ...(currentSessionWorkDir ? [currentSessionWorkDir] : []),
      ...terminalActiveWorkDirs,
    ])

    // Show session if: it's the current session, has active terminal, OR workDir is not blocked
    return worktreeSessions.filter(session => {
      const isCurrentSession = session.id === activeWorktreeSessionId
      const hasActiveTerminal = aiStatuses[session.id] && aiStatuses[session.id] !== 'idle'
      return isCurrentSession || hasActiveTerminal || !blockedWorkDirs.has(session.workDir.toLowerCase())
    })
  }, [worktreeSessions, activeWorktreeSessionId, aiStatuses])

  const activeSession = useMemo(() => {
    return displayableSessions.find(s => s.id === activeWorktreeSessionId)
  }, [displayableSessions, activeWorktreeSessionId])

  const handleDeleteRequest = useCallback((session: Session): void => {
    setDeleteConfirm({ id: session.id, name: session.name })
  }, [])

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (deleteConfirm) {
      await onDeleteWorktree(deleteConfirm.id)
      setDeleteConfirm(null)
    }
  }, [deleteConfirm, onDeleteWorktree])

  const handleDeleteCancel = useCallback((): void => {
    setDeleteConfirm(null)
  }, [])

  return {
    displayableSessions,
    activeSession,
    deleteConfirm,
    handleDeleteRequest,
    handleDeleteConfirm,
    handleDeleteCancel,
  }
}
