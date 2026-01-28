import { useState, useCallback } from 'react'
import { useWorktreeStore } from '../stores/worktreeStore'
import type { ViewMode } from '../types/viewMode'
import type { AIStatus } from '../stores/aiStatusStore'
import {
  GetWorktreeSessions,
} from '../wailsjs/go/main/App'

/** Worktreeセッション情報のマップ型 */
export type AllWorktreeSessionsMap = Record<string, { id: string; branch: string; status: AIStatus }[]>

export interface UseSessionNavigationReturn {
  // State
  allWorktreeSessionsMap: AllWorktreeSessionsMap
  setAllWorktreeSessionsMap: (map: AllWorktreeSessionsMap) => void

  // Handlers
  handleSessionSelected: (sessionId: string) => Promise<void>
}

interface UseSessionNavigationOptions {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

/**
 * Hook for session navigation handlers
 * Handles session selection and worktree mode switching
 */
export function useSessionNavigation({
  viewMode,
  setViewMode,
}: UseSessionNavigationOptions): UseSessionNavigationReturn {
  // Local state
  const [allWorktreeSessionsMap, setAllWorktreeSessionsMap] = useState<AllWorktreeSessionsMap>({})

  // Worktree Store
  const enterWorktreeMode = useWorktreeStore((s) => s.enterWorktreeMode)
  const exitWorktreeMode = useWorktreeStore((s) => s.exitWorktreeMode)
  const setWorktreeSessions = useWorktreeStore((s) => s.setWorktreeSessions)
  const setActiveWorktreeSession = useWorktreeStore((s) => s.setActiveWorktreeSession)

  // Handle session selection - check worktrees and switch mode accordingly
  const handleSessionSelected = useCallback(async (sessionId: string) => {
    // Always check worktrees for the selected session
    try {
      const wtSessions = await GetWorktreeSessions(sessionId)

      if (wtSessions && wtSessions.length > 0) {
        // Session has worktrees - enter/stay in worktree mode
        enterWorktreeMode(sessionId)
        setWorktreeSessions(wtSessions)
        setActiveWorktreeSession(wtSessions[0].id)
        setViewMode('worktree')
      } else if (viewMode === 'worktree') {
        // Session has no worktrees but we're in worktree mode - exit
        exitWorktreeMode()
        setViewMode('diff')
      }
      // viewMode === 'diff' and no worktrees - do nothing
    } catch (err) {
      console.error('Failed to load worktree sessions:', err)
      if (viewMode === 'worktree') {
        exitWorktreeMode()
        setViewMode('diff')
      }
    }
  }, [viewMode, enterWorktreeMode, exitWorktreeMode, setWorktreeSessions, setActiveWorktreeSession, setViewMode])

  return {
    // State
    allWorktreeSessionsMap,
    setAllWorktreeSessionsMap,

    // Handlers
    handleSessionSelected,
  }
}
