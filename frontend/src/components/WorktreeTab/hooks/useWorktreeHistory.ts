import { useCallback } from 'react'
import type { CenterViewMode } from '../types'
import { useWorktreeHistoryStore } from '../../../stores/worktreeHistoryStore'

interface UseWorktreeHistoryOptions {
  activeSessionId?: string
  onSetCenterViewMode: (mode: CenterViewMode) => void
}

export interface UseWorktreeHistoryReturn {
  selectedHistoryFilename: string | null
  handleHistoryTabClick: () => Promise<void>
  handleHistorySelect: (filename: string) => Promise<void>
}

/**
 * Hook for managing history panel state
 * Handles history filename selection and view mode transitions
 * Now uses worktreeHistoryStore for history operations
 */
export function useWorktreeHistory({
  activeSessionId,
  onSetCenterViewMode,
}: UseWorktreeHistoryOptions): UseWorktreeHistoryReturn {
  // Get state and actions from store
  const selectedFilename = useWorktreeHistoryStore((s) => s.selectedFilename)
  const storeHistoryTabClick = useWorktreeHistoryStore((s) => s.handleHistoryTabClick)
  const storeHistorySelect = useWorktreeHistoryStore((s) => s.handleHistorySelect)

  const handleHistoryTabClick = useCallback(async (): Promise<void> => {
    onSetCenterViewMode('history')
    await storeHistoryTabClick(activeSessionId)
  }, [onSetCenterViewMode, storeHistoryTabClick, activeSessionId])

  const handleHistorySelect = useCallback(
    async (filename: string): Promise<void> => {
      await storeHistorySelect(filename, activeSessionId)
    },
    [storeHistorySelect, activeSessionId]
  )

  return {
    selectedHistoryFilename: selectedFilename,
    handleHistoryTabClick,
    handleHistorySelect,
  }
}
