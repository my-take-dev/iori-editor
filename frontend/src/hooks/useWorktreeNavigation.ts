import { useCallback } from 'react'
import { useUIStore } from '../stores/uiStore'
import { useWorktreeStore } from '../stores/worktreeStore'
import type { ViewMode } from '../types/viewMode'
import { GetWorktreeSessions } from '../wailsjs/go/main/App'

export interface UseWorktreeNavigationReturn {
  handleOpenWorktreeMode: (sessionId: string) => void
  handleSelectWorktreeSingleMode: () => Promise<void>
  handleExitWorktreeMode: () => void
}

interface UseWorktreeNavigationOptions {
  setViewMode: (mode: ViewMode) => void
}

export function useWorktreeNavigation({
  setViewMode,
}: UseWorktreeNavigationOptions): UseWorktreeNavigationReturn {
  // UI Store
  const openWorktreeModeModal = useUIStore((s) => s.openWorktreeModeModal)
  const closeWorktreeModeModal = useUIStore((s) => s.closeWorktreeModeModal)
  const worktreeModeTargetSessionId = useUIStore((s) => s.worktreeModeTargetSessionId)

  // Worktree Store
  const enterWorktreeMode = useWorktreeStore((s) => s.enterWorktreeMode)
  const exitWorktreeMode = useWorktreeStore((s) => s.exitWorktreeMode)
  const setWorktreeSessions = useWorktreeStore((s) => s.setWorktreeSessions)
  const setActiveWorktreeSession = useWorktreeStore((s) => s.setActiveWorktreeSession)

  // Open worktree mode selection modal
  const handleOpenWorktreeMode = useCallback((sessionId: string) => {
    openWorktreeModeModal(sessionId)
  }, [openWorktreeModeModal])

  // Enter worktree single mode
  const handleSelectWorktreeSingleMode = useCallback(async () => {
    if (!worktreeModeTargetSessionId) return

    try {
      const wtSessions = await GetWorktreeSessions(worktreeModeTargetSessionId)
      // Only proceed if API call succeeds
      closeWorktreeModeModal()
      enterWorktreeMode(worktreeModeTargetSessionId)
      setWorktreeSessions(wtSessions || [])
      if (wtSessions && wtSessions.length > 0) {
        setActiveWorktreeSession(wtSessions[0].id)
      }
      setViewMode('worktree')
    } catch (err) {
      console.error('Failed to load worktree sessions:', err)
      // Keep modal open on error so user can retry or cancel
    }
  }, [worktreeModeTargetSessionId, enterWorktreeMode, setWorktreeSessions, setActiveWorktreeSession, closeWorktreeModeModal, setViewMode])

  // Exit worktree mode and return to parent session
  const handleExitWorktreeMode = useCallback(() => {
    exitWorktreeMode()
    setViewMode('diff')
  }, [exitWorktreeMode, setViewMode])

  return {
    handleOpenWorktreeMode,
    handleSelectWorktreeSingleMode,
    handleExitWorktreeMode,
  }
}
