import { useState, useCallback, useEffect } from 'react'
import { useFileExplorerStore } from '../stores/fileExplorerStore'
import { useUIStore } from '../stores/uiStore'
import { useCurrentSession } from './useCurrentSession'
import type { FileNode } from '../components/FileExplorer/types'
import { GetFileTree, GetDirectoryChildren, RenameFile, DeleteFile } from '../wailsjs/go/main/App'
import { mergeChildrenIntoTree } from '../utils/treeUtils'

export interface UseFileExplorerDataReturn {
  // State
  fileTree: FileNode[]
  isLoadingFileTree: boolean
  explorerSelectedPath: string
  workDir: string | undefined

  // Actions
  refreshFileTree: () => Promise<void>
  handleLoadChildren: (path: string) => Promise<FileNode[]>
  handleExplorerSelectFile: (path: string) => void
  handleRenameFile: (oldPath: string, newPath: string) => Promise<void>
  handleDeleteFile: (path: string) => Promise<void>
}

interface UseFileExplorerDataOptions {
  isReady: boolean
  setEditorFilePath?: (path: string) => void
}

/**
 * Hook for FileExplorer data management
 * Handles file tree loading, lazy loading, and file operations
 */
export function useFileExplorerData({
  isReady,
  setEditorFilePath,
}: UseFileExplorerDataOptions): UseFileExplorerDataReturn {
  // Get session from hook
  const { sessionId, workDir } = useCurrentSession()

  // Local state
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [isLoadingFileTree, setIsLoadingFileTree] = useState(false)
  const [explorerSelectedPath, setExplorerSelectedPath] = useState('')

  // UI Store
  const setViewMode = useUIStore((s) => s.setViewMode)

  // File Explorer Store
  const clearLoadedPaths = useFileExplorerStore((s) => s.clearLoadedPaths)

  // Refresh file tree
  const refreshFileTree = useCallback(async () => {
    if (!sessionId) {
      setFileTree([])
      return
    }

    setIsLoadingFileTree(true)
    clearLoadedPaths()
    try {
      const tree = await GetFileTree(sessionId)
      setFileTree(tree || [])
    } catch (err) {
      console.error('Failed to get file tree:', err)
      setFileTree([])
    } finally {
      setIsLoadingFileTree(false)
    }
  }, [sessionId, clearLoadedPaths])

  // Load file tree when session changes
  useEffect(() => {
    if (!isReady) return

    if (sessionId) {
      refreshFileTree()
    } else {
      // セッションがない場合はファイルツリーをクリア
      setFileTree([])
      clearLoadedPaths()
    }
  }, [isReady, sessionId, refreshFileTree, clearLoadedPaths])

  // Handle lazy loading of directory children
  const handleLoadChildren = useCallback(async (path: string): Promise<FileNode[]> => {
    if (!sessionId) return []

    try {
      const children = await GetDirectoryChildren(sessionId, path)
      setFileTree((prevTree) => mergeChildrenIntoTree(prevTree, path, children || []))
      return children || []
    } catch (err) {
      console.error('Failed to load directory children:', err)
      return []
    }
  }, [sessionId])

  // Handle file selection from explorer
  const handleExplorerSelectFile = useCallback((path: string) => {
    if (!sessionId) return
    setExplorerSelectedPath(path)
    setEditorFilePath?.(path)
    setViewMode('editor')
  }, [sessionId, setEditorFilePath, setViewMode])

  // Handle file rename
  const handleRenameFile = useCallback(async (oldPath: string, newPath: string) => {
    if (!sessionId) return
    try {
      await RenameFile(sessionId, oldPath, newPath)
      await refreshFileTree()
    } catch (err) {
      console.error('Failed to rename file:', err)
      throw err
    }
  }, [sessionId, refreshFileTree])

  // Handle file delete
  const handleDeleteFile = useCallback(async (path: string) => {
    if (!sessionId) return
    try {
      await DeleteFile(sessionId, path)
      await refreshFileTree()
    } catch (err) {
      console.error('Failed to delete file:', err)
      throw err
    }
  }, [sessionId, refreshFileTree])

  return {
    // State
    fileTree,
    isLoadingFileTree,
    explorerSelectedPath,
    workDir,

    // Actions
    refreshFileTree,
    handleLoadChildren,
    handleExplorerSelectFile,
    handleRenameFile,
    handleDeleteFile,
  }
}
