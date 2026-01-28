import { useCallback } from 'react'
import { GetFileDiff } from '../wailsjs/go/main/App'
import {
  useDiffStore,
  selectDiffOriginal,
  selectDiffModified,
  selectDiffFilePath,
  selectDiffError,
} from '../stores/diffStore'

export interface UseDiffContentReturn {
  original: string
  modified: string
  filePath: string
  error: string | null
  loadDiff: (path: string) => Promise<void>
  clearDiff: () => void
}

interface UseDiffContentOptions {
  sessionId: string | undefined
}

/**
 * Hook for managing diff content loading and state
 * Handles fetching diff data from the backend for a specific file
 * State is stored in Zustand store for global access
 */
export function useDiffContent({
  sessionId,
}: UseDiffContentOptions): UseDiffContentReturn {
  const original = useDiffStore(selectDiffOriginal)
  const modified = useDiffStore(selectDiffModified)
  const filePath = useDiffStore(selectDiffFilePath)
  const error = useDiffStore(selectDiffError)
  const setDiff = useDiffStore((s) => s.setDiff)
  const setError = useDiffStore((s) => s.setError)
  const storeClearDiff = useDiffStore((s) => s.clearDiff)

  const loadDiff = useCallback(
    async (path: string): Promise<void> => {
      if (!sessionId || !path) {
        storeClearDiff()
        return
      }

      try {
        const diff = await GetFileDiff(sessionId, path)
        setDiff(diff.original || '', diff.modified || '', path)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Diff の読み込みに失敗しました'
        console.error('Failed to load diff:', err)
        setError(errorMsg)
      }
    },
    [sessionId, setDiff, setError, storeClearDiff]
  )

  const clearDiff = useCallback((): void => {
    storeClearDiff()
  }, [storeClearDiff])

  return {
    original,
    modified,
    filePath,
    error,
    loadDiff,
    clearDiff,
  }
}
