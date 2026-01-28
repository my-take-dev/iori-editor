import { useCallback } from 'react'
import type { Session } from '../types/session'
import {
  RenameFile,
  DeleteFile,
} from '../wailsjs/go/main/App'

export interface UseFileOperationsReturn {
  handleRenameFile: (oldPath: string, newPath: string) => Promise<void>
  handleDeleteFile: (path: string) => Promise<void>
}

interface UseFileOperationsOptions {
  activeSession: Session | undefined
}

/**
 * Hook for file operation handlers
 * Handles file rename and delete operations within a session
 */
export function useFileOperations({
  activeSession,
}: UseFileOperationsOptions): UseFileOperationsReturn {
  // File rename handler
  const handleRenameFile = useCallback(async (oldPath: string, newPath: string) => {
    if (!activeSession) {
      throw new Error('Cannot rename file: No active session')
    }
    await RenameFile(activeSession.id, oldPath, newPath)
  }, [activeSession])

  // File delete handler
  const handleDeleteFile = useCallback(async (path: string) => {
    if (!activeSession) {
      throw new Error('Cannot delete file: No active session')
    }
    await DeleteFile(activeSession.id, path)
  }, [activeSession])

  return {
    handleRenameFile,
    handleDeleteFile,
  }
}
