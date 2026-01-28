import { useState, useEffect, useCallback, useRef } from 'react'
import type { FileNode } from '../types'
import { useWorktreeOperationsStore } from '../../../stores/worktreeOperationsStore'
import { useFileExplorerStore } from '../../../stores/fileExplorerStore'
import { mergeChildrenIntoTree } from '../../../utils/treeUtils'

interface UseWorktreeEditorOptions {
  sessionId: string | null
  isActive?: boolean
  onChangesReload?: (force?: boolean) => Promise<void>
}

export interface UseWorktreeEditorReturn {
  editorFilePath: string
  fileTree: FileNode[]
  isLoadingFileTree: boolean
  explorerSelectedPath: string
  loadFileTree: (force?: boolean) => Promise<void>
  handleExplorerSelectFile: (path: string) => void
  handleSaveFile: (content: string) => Promise<void>
  handleRenameFile: (oldPath: string, newPath: string) => Promise<void>
  handleDeleteFile: (path: string) => Promise<void>
  handleLoadChildren: (path: string) => Promise<FileNode[]>
  clearEditorState: () => void
}

const FILE_TREE_CACHE_TTL_MS = 60000

/**
 * Hook for managing editor and file tree state
 * Handles file tree loading, file selection, and file operations
 * Now uses worktreeOperationsStore for file operations
 */
export function useWorktreeEditor({
  sessionId,
  isActive = true,
  onChangesReload,
}: UseWorktreeEditorOptions): UseWorktreeEditorReturn {
  const [editorFilePath, setEditorFilePath] = useState('')
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [isLoadingFileTree, setIsLoadingFileTree] = useState(false)
  const [explorerSelectedPath, setExplorerSelectedPath] = useState('')
  const treeCacheRef = useRef(new Map<string, { tree: FileNode[]; timestamp: number }>())
  const requestIdRef = useRef(0)
  const activeSessionRef = useRef<string | null>(sessionId)
  const lastSessionRef = useRef<string | null>(null)

  // Get individual operations from store (stable references)
  const getFileTree = useWorktreeOperationsStore((s) => s.getFileTree)
  const getDirectoryChildren = useWorktreeOperationsStore((s) => s.getDirectoryChildren)
  const writeFile = useWorktreeOperationsStore((s) => s.writeFile)
  const renameFile = useWorktreeOperationsStore((s) => s.renameFile)
  const deleteFile = useWorktreeOperationsStore((s) => s.deleteFile)

  // File explorer store for clearing loaded paths
  const clearLoadedPaths = useFileExplorerStore((s) => s.clearLoadedPaths)

  useEffect(() => {
    activeSessionRef.current = sessionId
  }, [sessionId])

  const loadFileTree = useCallback(async (force = false): Promise<void> => {
    if (!sessionId) return

    // Clear loaded paths on session change or force refresh
    const isSessionChange = sessionId !== lastSessionRef.current
    if (force || isSessionChange) {
      clearLoadedPaths()
      lastSessionRef.current = sessionId
    }

    const sessionKey = sessionId
    const cached = treeCacheRef.current.get(sessionKey)
    const now = Date.now()

    if (cached && !force) {
      setFileTree(cached.tree)
    }

    const isFresh = cached && (now - cached.timestamp) < FILE_TREE_CACHE_TTL_MS
    if (cached && isFresh && !force) {
      return
    }

    const requestId = ++requestIdRef.current
    const shouldShowLoading = !cached || cached.tree.length === 0
    if (shouldShowLoading) {
      setIsLoadingFileTree(true)
    }

    try {
      const tree = (await getFileTree(sessionKey)) || []
      if (requestIdRef.current !== requestId || activeSessionRef.current !== sessionKey) {
        return
      }
      setFileTree(tree)
      treeCacheRef.current.set(sessionKey, { tree, timestamp: Date.now() })
    } catch (err) {
      if (!cached) {
        setFileTree([])
      }
      console.error('Failed to load file tree:', err)
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoadingFileTree(false)
      }
    }
  }, [sessionId, getFileTree, clearLoadedPaths])

  // Handle lazy loading of directory children
  const handleLoadChildren = useCallback(
    async (path: string): Promise<FileNode[]> => {
      if (!sessionId) return []
      try {
        const children = await getDirectoryChildren(sessionId, path)
        setFileTree((prevTree) => mergeChildrenIntoTree(prevTree, path, children || []))
        return children || []
      } catch (err) {
        console.error('Failed to load directory children:', err)
        return []
      }
    },
    [sessionId, getDirectoryChildren]
  )

  // Load file tree when session changes or explorer becomes active
  useEffect(() => {
    if (sessionId && isActive) {
      loadFileTree()
    } else {
      if (!sessionId) {
        setFileTree([])
        setExplorerSelectedPath('')
        setEditorFilePath('')
      }
    }
  }, [sessionId, isActive, loadFileTree])

  // Reset editor state when session changes
  useEffect(() => {
    setEditorFilePath('')
    setExplorerSelectedPath('')
  }, [sessionId])

  const handleExplorerSelectFile = useCallback(
    (path: string): void => {
      if (!sessionId) return
      setExplorerSelectedPath(path)
      setEditorFilePath(path)
    },
    [sessionId]
  )

  const handleSaveFile = useCallback(
    async (content: string): Promise<void> => {
      if (!sessionId || !editorFilePath) return
      try {
        await writeFile(sessionId, editorFilePath, content)
        if (onChangesReload) {
          await onChangesReload(true)
        }
      } catch (err) {
        console.error('Failed to save file:', err)
        alert('ファイルの保存に失敗しました: ' + (err as Error).message)
        throw err // Re-throw to let caller know save failed
      }
    },
    [sessionId, editorFilePath, writeFile, onChangesReload]
  )

  const handleRenameFile = useCallback(
    async (oldPath: string, newPath: string): Promise<void> => {
      if (!sessionId) return
      await renameFile(sessionId, oldPath, newPath)
      treeCacheRef.current.delete(sessionId)
      await loadFileTree(true)
    },
    [sessionId, renameFile, loadFileTree]
  )

  const handleDeleteFile = useCallback(
    async (path: string): Promise<void> => {
      if (!sessionId) return
      await deleteFile(sessionId, path)
      treeCacheRef.current.delete(sessionId)
      await loadFileTree(true)
    },
    [sessionId, deleteFile, loadFileTree]
  )

  const clearEditorState = useCallback((): void => {
    setEditorFilePath('')
    setExplorerSelectedPath('')
    setFileTree([])
  }, [])

  return {
    editorFilePath,
    fileTree,
    isLoadingFileTree,
    explorerSelectedPath,
    loadFileTree,
    handleExplorerSelectFile,
    handleSaveFile,
    handleRenameFile,
    handleDeleteFile,
    handleLoadChildren,
    clearEditorState,
  }
}
