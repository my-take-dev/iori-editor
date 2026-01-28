import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EventsOn } from '../wailsjs/runtime/runtime'
import {
  GetChanges,
  GetGitSyncInfo,
  AcceptChange,
  UnstageChange,
  RejectChange,
  AcceptChanges,
  UnstageChanges,
  RejectChanges,
  CommitChanges,
  PushChanges,
  PullChanges,
  FetchChanges,
} from '../wailsjs/go/main/App'
import type { FileChange } from '../types/git'
import { debounce } from '../utils/debounce'
import { getErrorMessage } from '../utils/errorUtils'

export interface GitSyncState {
  ahead: number
  behind: number
}

export interface GitOperationResult {
  success: boolean
  error?: string
}

export interface UseGitOperationsReturn {
  files: FileChange[]
  selectedChangeIdx: number
  gitAhead: number
  gitBehind: number
  setSelectedChangeIdx: (idx: number) => void
  refreshChanges: () => Promise<void>
  handleAcceptChange: (path: string) => Promise<GitOperationResult>
  handleUnstageChange: (path: string) => Promise<GitOperationResult>
  handleRejectChange: (path: string) => Promise<GitOperationResult>
  handleAcceptAll: (paths: string[]) => Promise<GitOperationResult>
  handleUnstageAll: (paths: string[]) => Promise<GitOperationResult>
  handleRejectAll: (paths: string[]) => Promise<GitOperationResult>
  handleCommit: (message: string) => Promise<GitOperationResult>
  handlePush: () => Promise<GitOperationResult>
  handlePull: () => Promise<GitOperationResult>
  handleFetch: () => Promise<GitOperationResult>
}

interface UseGitOperationsOptions {
  sessionId: string | undefined
  isGitRepo: boolean
  isReady: boolean
}

/**
 * Hook for managing Git operations
 * Handles file changes, staging, committing, and remote sync operations
 */
export function useGitOperations({
  sessionId,
  isGitRepo,
  isReady,
}: UseGitOperationsOptions): UseGitOperationsReturn {
  const [files, setFiles] = useState<FileChange[]>([])
  const [selectedChangeIdx, setSelectedChangeIdx] = useState(0)
  const [gitAhead, setGitAhead] = useState(0)
  const [gitBehind, setGitBehind] = useState(0)

  // Refresh changes and sync info
  const refreshChanges = useCallback(async (): Promise<void> => {
    if (!sessionId || !isGitRepo) {
      setFiles([])
      setGitAhead(0)
      setGitBehind(0)
      return
    }

    try {
      console.time('[Perf] refreshChanges (GetChanges + GetGitSyncInfo)')
      const [changes, syncInfo] = await Promise.all([
        GetChanges(sessionId),
        GetGitSyncInfo(sessionId),
      ])
      console.timeEnd('[Perf] refreshChanges (GetChanges + GetGitSyncInfo)')
      setFiles(changes || [])
      setGitAhead(syncInfo?.ahead || 0)
      setGitBehind(syncInfo?.behind || 0)
    } catch (err) {
      console.timeEnd('[Perf] refreshChanges (GetChanges + GetGitSyncInfo)')
      console.error('Failed to get changes:', err)
      setFiles([])
    }
  }, [sessionId, isGitRepo])

  // Fetch changes when session changes
  useEffect(() => {
    if (isReady && sessionId) {
      refreshChanges()
    }
  }, [isReady, sessionId, refreshChanges])

  // Reset selection when session changes
  useEffect(() => {
    setSelectedChangeIdx(0)
  }, [sessionId])

  // Use ref to store latest refreshChanges to avoid recreating debounced function
  const refreshChangesRef = useRef(refreshChanges)
  useEffect(() => {
    refreshChangesRef.current = refreshChanges
  }, [refreshChanges])

  // Debounced refresh for file change events
  const debouncedRefreshChanges = useMemo(
    () =>
      debounce(() => {
        refreshChangesRef.current()
      }, 300),
    []
  )

  // Listen for file change events with debounce
  useEffect(() => {
    if (!isReady) return

    const unsubscribe = EventsOn('file:changed', () => {
      debouncedRefreshChanges()
    })

    return () => {
      unsubscribe()
      debouncedRefreshChanges.cancel()
    }
  }, [isReady, debouncedRefreshChanges])

  // Common wrapper for Git operations
  const executeGitOp = useCallback(
    async <T>(
      operation: () => Promise<T>,
      errorContext: string,
      defaultErrorMessage: string
    ): Promise<GitOperationResult> => {
      if (!sessionId) {
        return { success: false, error: 'セッションが見つかりません' }
      }
      try {
        await operation()
        await refreshChanges()
        return { success: true }
      } catch (err) {
        const errorMsg = getErrorMessage(err) || defaultErrorMessage
        console.error(`Failed to ${errorContext}:`, err)
        return { success: false, error: errorMsg }
      }
    },
    [sessionId, refreshChanges]
  )

  // Common wrapper for batch Git operations with partial failure handling
  const executeBatchGitOp = useCallback(
    async (
      operation: () => Promise<{ failed?: { path: string; error: string }[] }>,
      errorContext: string,
      partialErrorMessage: string,
      defaultErrorMessage: string
    ): Promise<GitOperationResult> => {
      if (!sessionId) {
        return { success: false, error: 'セッションが見つかりません' }
      }
      try {
        const result = await operation()
        await refreshChanges()
        if (result.failed && result.failed.length > 0) {
          console.warn(`Some files failed to ${errorContext}:`, result.failed)
          return { success: false, error: `${result.failed.length}${partialErrorMessage}` }
        }
        return { success: true }
      } catch (err) {
        const errorMsg = getErrorMessage(err) || defaultErrorMessage
        console.error(`Failed to ${errorContext}:`, err)
        return { success: false, error: errorMsg }
      }
    },
    [sessionId, refreshChanges]
  )

  // Single file operations
  const handleAcceptChange = useCallback(
    (path: string) =>
      executeGitOp(
        () => AcceptChange(sessionId!, path),
        'accept change',
        'ステージに失敗しました'
      ),
    [sessionId, executeGitOp]
  )

  const handleUnstageChange = useCallback(
    (path: string) =>
      executeGitOp(
        () => UnstageChange(sessionId!, path),
        'unstage change',
        'アンステージに失敗しました'
      ),
    [sessionId, executeGitOp]
  )

  const handleRejectChange = useCallback(
    (path: string) =>
      executeGitOp(
        () => RejectChange(sessionId!, path),
        'reject change',
        '変更の破棄に失敗しました'
      ),
    [sessionId, executeGitOp]
  )

  // Batch operations
  const handleAcceptAll = useCallback(
    (paths: string[]) => {
      if (paths.length === 0) return Promise.resolve({ success: true })
      return executeBatchGitOp(
        () => AcceptChanges(sessionId!, paths),
        'stage',
        '件のファイルのステージに失敗しました',
        'ステージに失敗しました'
      )
    },
    [sessionId, executeBatchGitOp]
  )

  const handleUnstageAll = useCallback(
    (paths: string[]) => {
      if (paths.length === 0) return Promise.resolve({ success: true })
      return executeBatchGitOp(
        () => UnstageChanges(sessionId!, paths),
        'unstage',
        '件のファイルのアンステージに失敗しました',
        'アンステージに失敗しました'
      )
    },
    [sessionId, executeBatchGitOp]
  )

  const handleRejectAll = useCallback(
    (paths: string[]) => {
      if (paths.length === 0) return Promise.resolve({ success: true })
      return executeBatchGitOp(
        () => RejectChanges(sessionId!, paths),
        'reject',
        '件のファイルの破棄に失敗しました',
        '変更の破棄に失敗しました'
      )
    },
    [sessionId, executeBatchGitOp]
  )

  // Commit and remote operations
  const handleCommit = useCallback(
    (message: string) =>
      executeGitOp(
        () => CommitChanges(sessionId!, message),
        'commit',
        'コミットに失敗しました'
      ),
    [sessionId, executeGitOp]
  )

  const handlePush = useCallback(
    () =>
      executeGitOp(
        () => PushChanges(sessionId!),
        'push',
        'プッシュに失敗しました'
      ),
    [sessionId, executeGitOp]
  )

  const handlePull = useCallback(
    () =>
      executeGitOp(
        () => PullChanges(sessionId!),
        'pull',
        'プルに失敗しました'
      ),
    [sessionId, executeGitOp]
  )

  const handleFetch = useCallback(
    () =>
      executeGitOp(
        () => FetchChanges(sessionId!),
        'fetch',
        'フェッチに失敗しました'
      ),
    [sessionId, executeGitOp]
  )

  return {
    files,
    selectedChangeIdx,
    gitAhead,
    gitBehind,
    setSelectedChangeIdx,
    refreshChanges,
    handleAcceptChange,
    handleUnstageChange,
    handleRejectChange,
    handleAcceptAll,
    handleUnstageAll,
    handleRejectAll,
    handleCommit,
    handlePush,
    handlePull,
    handleFetch,
  }
}
