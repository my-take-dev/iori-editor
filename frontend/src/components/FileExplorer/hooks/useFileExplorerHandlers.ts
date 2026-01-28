import { useState, useCallback, useEffect } from 'react'
import type { ContextMenuState, FlatNode } from '../types'

interface UseFileExplorerHandlersParams {
  flatNodes: FlatNode[]
  selectedPath?: string
  workDir: string
  onSelectFile: (path: string) => void
  onDeleteFile?: (path: string) => Promise<void>
  onRenameFile?: (oldPath: string, newPath: string) => Promise<void>
  onRefresh?: () => void | Promise<void>
  onLoadChildren?: (path: string) => Promise<unknown>
  // Store methods
  expandedPaths: Set<string>
  loadedPaths: Set<string>
  toggleExpanded: (path: string) => void
  markPathAsLoaded: (path: string) => void
  setPathLoading: (path: string, loading: boolean) => void
}

interface UseFileExplorerHandlersReturn {
  // State
  contextMenu: ContextMenuState | null
  deleteTarget: FlatNode | null
  renameTarget: FlatNode | null
  optimisticSelectedPath: string | null
  // Handlers
  handleToggleExpand: (path: string) => Promise<void>
  handleOptimisticSelect: (path: string) => void
  handleContextMenu: (e: React.MouseEvent, node: FlatNode) => void
  handleCopyPath: () => Promise<void>
  handleCopyRelativePath: () => Promise<void>
  handleRename: () => void
  handleDelete: () => void
  confirmDelete: () => Promise<void>
  confirmRename: (newName: string) => Promise<void>
  // State setters for external use
  closeContextMenu: () => void
  closeDeleteDialog: () => void
  closeRenameDialog: () => void
}

export function useFileExplorerHandlers({
  flatNodes,
  selectedPath,
  workDir,
  onSelectFile,
  onDeleteFile,
  onRenameFile,
  onRefresh,
  onLoadChildren,
  expandedPaths,
  loadedPaths,
  toggleExpanded,
  markPathAsLoaded,
  setPathLoading,
}: UseFileExplorerHandlersParams): UseFileExplorerHandlersReturn {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FlatNode | null>(null)
  const [renameTarget, setRenameTarget] = useState<FlatNode | null>(null)
  const [optimisticSelectedPath, setOptimisticSelectedPath] = useState<string | null>(null)

  // Sync optimistic path with prop
  useEffect(() => {
    if (selectedPath) {
      setOptimisticSelectedPath(null)
    }
  }, [selectedPath])

  // Handle expand with lazy loading
  const handleToggleExpand = useCallback(async (path: string) => {
    const node = flatNodes.find((n) => n.path === path)
    if (!node || !node.isDir) return

    if (expandedPaths.has(path)) {
      toggleExpanded(path)
      return
    }

    if (node.hasChildren && !loadedPaths.has(path) && onLoadChildren) {
      setPathLoading(path, true)
      try {
        await onLoadChildren(path)
        markPathAsLoaded(path)
      } catch (err) {
        console.error('Failed to load children:', err)
      } finally {
        setPathLoading(path, false)
      }
    }

    toggleExpanded(path)
  }, [flatNodes, expandedPaths, loadedPaths, onLoadChildren, toggleExpanded, markPathAsLoaded, setPathLoading])

  // Optimistic selection handler
  const handleOptimisticSelect = useCallback((path: string) => {
    setOptimisticSelectedPath(path)
    requestAnimationFrame(() => {
      onSelectFile(path)
    })
  }, [onSelectFile])

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FlatNode) => {
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }, [])

  const handleCopyPath = useCallback(async () => {
    if (!contextMenu) return
    const fullPath = workDir
      ? `${workDir}/${contextMenu.node.path}`.replace(/\//g, '\\')
      : contextMenu.node.path
    try {
      await navigator.clipboard.writeText(fullPath)
    } catch (err) {
      console.error('Failed to copy path:', err)
    }
  }, [contextMenu, workDir])

  const handleCopyRelativePath = useCallback(async () => {
    if (!contextMenu) return
    try {
      await navigator.clipboard.writeText(contextMenu.node.path)
    } catch (err) {
      console.error('Failed to copy relative path:', err)
    }
  }, [contextMenu])

  const handleRename = useCallback(() => {
    if (!contextMenu) return
    setRenameTarget(contextMenu.node)
  }, [contextMenu])

  const handleDelete = useCallback(() => {
    if (!contextMenu) return
    setDeleteTarget(contextMenu.node)
  }, [contextMenu])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || !onDeleteFile) return
    try {
      await onDeleteFile(deleteTarget.path)
      onRefresh?.()
      setDeleteTarget(null)
    } catch (err) {
      console.error('Failed to delete file:', err)
      setDeleteTarget(null)
    }
  }, [deleteTarget, onDeleteFile, onRefresh])

  const confirmRename = useCallback(async (newName: string) => {
    if (!renameTarget || !onRenameFile) return

    // Validate filename for path traversal
    if (newName.includes('/') || newName.includes('\\') || newName.includes('..') || newName.includes('\0')) {
      console.error('Invalid filename: contains path traversal characters')
      setRenameTarget(null)
      return
    }

    try {
      const parts = renameTarget.path.split('/')
      parts[parts.length - 1] = newName
      const newPath = parts.join('/')
      await onRenameFile(renameTarget.path, newPath)
      onRefresh?.()
      setRenameTarget(null)
    } catch (err) {
      console.error('Failed to rename file:', err)
      setRenameTarget(null)
    }
  }, [renameTarget, onRenameFile, onRefresh])

  const closeContextMenu = useCallback(() => setContextMenu(null), [])
  const closeDeleteDialog = useCallback(() => setDeleteTarget(null), [])
  const closeRenameDialog = useCallback(() => setRenameTarget(null), [])

  return {
    contextMenu,
    deleteTarget,
    renameTarget,
    optimisticSelectedPath,
    handleToggleExpand,
    handleOptimisticSelect,
    handleContextMenu,
    handleCopyPath,
    handleCopyRelativePath,
    handleRename,
    handleDelete,
    confirmDelete,
    confirmRename,
    closeContextMenu,
    closeDeleteDialog,
    closeRenameDialog,
  }
}
