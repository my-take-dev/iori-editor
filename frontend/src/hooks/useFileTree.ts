import { useState, useCallback, useEffect } from 'react'
import { useUIStore } from '../stores/uiStore'
import { useFileExplorerStore } from '../stores/fileExplorerStore'
import type { FileNode } from '../components/FileExplorer/FileExplorer'
import type { FileChange } from '../types/git'
import { GetFileTree, GetDirectoryChildren } from '../wailsjs/go/main/App'
import { mergeChildrenIntoTree } from '../utils/treeUtils'

export interface UseFileTreeReturn {
  // State
  fileTree: FileNode[]
  isLoadingFileTree: boolean
  explorerSelectedPath: string

  // Actions
  refreshFileTree: () => Promise<void>
  handleLoadChildren: (path: string) => Promise<FileNode[]>
  handleExplorerSelectFile: (path: string) => void
  handleSelectFile: (index: number) => void
  clearExplorerPath: () => void
}

interface UseFileTreeOptions {
  activeSessionId: string | undefined
  isReady: boolean
  files: FileChange[]
  loadDiff: (path: string) => void
  loadFileForEditor: (path: string) => void
  setSelectedChangeIdx: (index: number) => void
  setEditorFilePath: (path: string) => void
}

/**
 * Hook for file tree operations
 * Handles file tree loading, lazy loading of directories, and file selection
 */
export function useFileTree({
  activeSessionId,
  isReady,
  files,
  loadDiff,
  loadFileForEditor,
  setSelectedChangeIdx,
  setEditorFilePath,
}: UseFileTreeOptions): UseFileTreeReturn {
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [isLoadingFileTree, setIsLoadingFileTree] = useState(false)
  const [explorerSelectedPath, setExplorerSelectedPath] = useState('')

  const viewMode = useUIStore((s) => s.viewMode)
  const setViewMode = useUIStore((s) => s.setViewMode)

  const clearLoadedPaths = useFileExplorerStore((s) => s.clearLoadedPaths)

  const refreshFileTree = useCallback(async () => {
    if (!activeSessionId) {
      setFileTree([])
      return
    }

    setIsLoadingFileTree(true)
    clearLoadedPaths() // Clear lazy loading state on refresh
    try {
      console.time('[Perf] GetFileTree')
      const tree = await GetFileTree(activeSessionId)
      console.timeEnd('[Perf] GetFileTree')
      setFileTree(tree || [])
    } catch (err) {
      console.timeEnd('[Perf] GetFileTree')
      console.error('Failed to get file tree:', err)
      setFileTree([])
    } finally {
      setIsLoadingFileTree(false)
    }
  }, [activeSessionId, clearLoadedPaths])

  useEffect(() => {
    if (isReady && activeSessionId) {
      refreshFileTree()
    }
  }, [isReady, activeSessionId, refreshFileTree])

  const handleLoadChildren = useCallback(async (path: string): Promise<FileNode[]> => {
    if (!activeSessionId) return []

    try {
      const children = await GetDirectoryChildren(activeSessionId, path)
      // Merge children into existing tree
      setFileTree((prevTree) => mergeChildrenIntoTree(prevTree, path, children || []))
      return children || []
    } catch (err) {
      console.error('Failed to load directory children:', err)
      return []
    }
  }, [activeSessionId])

  const handleExplorerSelectFile = useCallback((path: string) => {
    console.time(`[Perf] useFileTree.handleExplorerSelectFile:${path}`)
    if (!activeSessionId) {
      console.timeEnd(`[Perf] useFileTree.handleExplorerSelectFile:${path}`)
      return
    }
    setExplorerSelectedPath(path)
    setEditorFilePath(path)
    setViewMode('editor')
    console.timeEnd(`[Perf] useFileTree.handleExplorerSelectFile:${path}`)
  }, [activeSessionId, setEditorFilePath, setViewMode])

  const handleSelectFile = useCallback((index: number) => {
    setSelectedChangeIdx(index)
    const file = files[index]
    if (file) {
      loadDiff(file.path)
      if (viewMode === 'editor') {
        loadFileForEditor(file.path)
      }
    }
  }, [files, loadDiff, loadFileForEditor, viewMode, setSelectedChangeIdx])

  const clearExplorerPath = useCallback(() => {
    setExplorerSelectedPath('')
  }, [])

  return {
    // State
    fileTree,
    isLoadingFileTree,
    explorerSelectedPath,

    // Actions
    refreshFileTree,
    handleLoadChildren,
    handleExplorerSelectFile,
    handleSelectFile,
    clearExplorerPath,
  }
}
