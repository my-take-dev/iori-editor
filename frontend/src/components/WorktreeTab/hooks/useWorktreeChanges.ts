import { useState, useEffect, useCallback, useRef } from 'react'
import type { FileChange } from '../types'
import { useWorktreeOperationsStore } from '../../../stores/worktreeOperationsStore'

interface UseWorktreeChangesOptions {
  sessionId: string | null
  isActive?: boolean
}

export interface UseWorktreeChangesReturn {
  files: FileChange[]
  selectedFileIndex: number | null
  diffContent: { original: string; modified: string } | null
  loadChanges: (force?: boolean) => Promise<void>
  handleSelectFile: (index: number) => void
  handleAccept: (path: string) => Promise<void>
  handleUnstage: (path: string) => Promise<void>
  handleReject: (path: string) => Promise<void>
  handleCommit: (message: string) => Promise<void>
}

const CHANGES_CACHE_TTL_MS = 15000

/**
 * Hook for managing changes panel state and handlers
 * Handles file changes list, diff loading, and git staging operations
 * Now uses worktreeOperationsStore for Git operations
 */
export function useWorktreeChanges({
  sessionId,
  isActive = true,
}: UseWorktreeChangesOptions): UseWorktreeChangesReturn {
  const [files, setFiles] = useState<FileChange[]>([])
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null)
  const [diffContent, setDiffContent] = useState<{ original: string; modified: string } | null>(null)
  const changesCacheRef = useRef(new Map<string, { files: FileChange[]; timestamp: number }>())
  const requestIdRef = useRef(0)
  const activeSessionRef = useRef<string | null>(sessionId)

  // Get individual operations from store (stable references)
  const getChanges = useWorktreeOperationsStore((s) => s.getChanges)
  const getFileDiff = useWorktreeOperationsStore((s) => s.getFileDiff)
  const acceptChange = useWorktreeOperationsStore((s) => s.acceptChange)
  const unstageChange = useWorktreeOperationsStore((s) => s.unstageChange)
  const rejectChange = useWorktreeOperationsStore((s) => s.rejectChange)
  const commit = useWorktreeOperationsStore((s) => s.commit)

  useEffect(() => {
    activeSessionRef.current = sessionId
  }, [sessionId])

  const loadChanges = useCallback(async (force = false): Promise<void> => {
    if (!sessionId) return

    const sessionKey = sessionId
    const cached = changesCacheRef.current.get(sessionKey)
    const now = Date.now()

    if (cached && !force) {
      setFiles(cached.files)
    }

    const isFresh = cached && (now - cached.timestamp) < CHANGES_CACHE_TTL_MS
    if (cached && isFresh && !force) {
      return
    }

    const requestId = ++requestIdRef.current
    try {
      const changes = (await getChanges(sessionKey)) || []
      if (requestIdRef.current !== requestId || activeSessionRef.current !== sessionKey) {
        return
      }
      setFiles(changes)
      changesCacheRef.current.set(sessionKey, { files: changes, timestamp: Date.now() })
    } catch (err) {
      if (!cached) {
        setFiles([])
      }
      console.error('Failed to load changes:', err)
    }
  }, [sessionId, getChanges])

  // Load changes when session changes
  useEffect(() => {
    if (sessionId && isActive) {
      loadChanges()
    } else {
      if (!sessionId) {
        setFiles([])
        setSelectedFileIndex(null)
        setDiffContent(null)
      }
    }
  }, [sessionId, isActive, loadChanges])

  // Load diff when file is selected
  useEffect(() => {
    let cancelled = false
    if (sessionId && selectedFileIndex !== null && files[selectedFileIndex]) {
      const file = files[selectedFileIndex]
      getFileDiff(sessionId, file.path)
        .then(result => {
          if (!cancelled) setDiffContent(result)
        })
        .catch(err => {
          if (!cancelled) {
            console.error('[useWorktreeChanges] Diff error:', err)
            setDiffContent(null)
          }
        })
    } else {
      setDiffContent(null)
    }
    return () => { cancelled = true }
  }, [sessionId, selectedFileIndex, files, getFileDiff])

  const handleSelectFile = useCallback((index: number): void => {
    setSelectedFileIndex(index)
  }, [])

  const handleAccept = useCallback(
    async (path: string): Promise<void> => {
      if (!sessionId) return
      await acceptChange(sessionId, path)
      loadChanges(true)
    },
    [sessionId, acceptChange, loadChanges]
  )

  const handleUnstage = useCallback(
    async (path: string): Promise<void> => {
      if (!sessionId) return
      await unstageChange(sessionId, path)
      loadChanges(true)
    },
    [sessionId, unstageChange, loadChanges]
  )

  const handleReject = useCallback(
    async (path: string): Promise<void> => {
      if (!sessionId) return
      await rejectChange(sessionId, path)
      loadChanges(true)
    },
    [sessionId, rejectChange, loadChanges]
  )

  const handleCommit = useCallback(
    async (message: string): Promise<void> => {
      if (!sessionId) return
      await commit(sessionId, message)
      loadChanges(true)
    },
    [sessionId, commit, loadChanges]
  )

  return {
    files,
    selectedFileIndex,
    diffContent,
    loadChanges,
    handleSelectFile,
    handleAccept,
    handleUnstage,
    handleReject,
    handleCommit,
  }
}
