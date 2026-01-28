import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FixedSizeList as List } from 'react-window'
import { useFileExplorerStore } from '../../stores/fileExplorerStore'
import { useFileExplorerData } from '../../hooks/useFileExplorerData'
import { flattenTree } from '../../utils/treeUtils'
import type { FileExplorerProps, VirtualRowData } from './types'
import { FileExplorerHeader } from './components/FileExplorerHeader'
import { FileExplorerList } from './components/FileExplorerList'
import { FileContextMenu } from './components/FileContextMenu'
import { FileExplorerDialogs } from './dialogs/FileExplorerDialogs'
import { useFileExplorerHandlers } from './hooks'

// Re-export types for backwards compatibility
export type { FileNode } from './types'

export function FileExplorer({
  isCollapsed,
  onToggleCollapse,
  isReady = false,
  setEditorFilePath,
  // External props (for WorktreeTab mode)
  files: externalFiles,
  onSelectFile: externalOnSelectFile,
  selectedPath: externalSelectedPath,
  isLoading: externalIsLoading,
  workDir: externalWorkDir,
  onRenameFile: externalOnRenameFile,
  onDeleteFile: externalOnDeleteFile,
  onRefresh: externalOnRefresh,
  onLoadChildren: externalOnLoadChildren,
}: FileExplorerProps): JSX.Element {
  // Determine if using external mode (WorktreeTab provides props directly)
  const useExternalMode = externalFiles !== undefined

  // Get data from hook (only when not in external mode)
  const hookData = useFileExplorerData({
    isReady: useExternalMode ? false : isReady,
    setEditorFilePath: useExternalMode ? undefined : setEditorFilePath,
  })

  // Use external props or hook results
  const files = externalFiles ?? hookData.fileTree
  const isLoading = externalIsLoading ?? hookData.isLoadingFileTree
  const selectedPath = externalSelectedPath ?? hookData.explorerSelectedPath
  const workDir = externalWorkDir ?? hookData.workDir ?? ''
  const onRefresh = externalOnRefresh ?? hookData.refreshFileTree
  const onLoadChildren = externalOnLoadChildren ?? hookData.handleLoadChildren
  const onSelectFile = externalOnSelectFile ?? hookData.handleExplorerSelectFile
  const onRenameFile = externalOnRenameFile ?? hookData.handleRenameFile
  const onDeleteFile = externalOnDeleteFile ?? hookData.handleDeleteFile

  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<List>(null)
  const [containerHeight, setContainerHeight] = useState(window.innerHeight)

  const {
    expandedPaths,
    toggleExpanded,
    loadedPaths,
    loadingPaths,
    markPathAsLoaded,
    setPathLoading,
  } = useFileExplorerStore()

  // Flatten tree based on expanded state
  const flatNodes = useMemo(
    () => flattenTree(files, expandedPaths, loadingPaths),
    [files, expandedPaths, loadingPaths]
  )

  // Use extracted handlers hook
  const {
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
  } = useFileExplorerHandlers({
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
  })

  // Observe container size for react-window
  // Re-run when isCollapsed changes to ensure observer is set up after sidebar expands
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [isCollapsed])

  // Reset scroll position when files change (session switch)
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0, 'start')
    }
  }, [files])

  // Scroll to selected file
  useEffect(() => {
    if (selectedPath && listRef.current) {
      const index = flatNodes.findIndex((n) => n.path === selectedPath)
      if (index >= 0) {
        listRef.current.scrollToItem(index, 'smart')
      }
    }
  }, [selectedPath, flatNodes])

  // Memoize item data for react-window
  const itemData = useMemo<VirtualRowData>(() => ({
    flatNodes,
    onSelectFile: handleOptimisticSelect,
    selectedPath: optimisticSelectedPath ?? selectedPath,
    onToggleExpand: handleToggleExpand,
    onContextMenu: handleContextMenu,
    workDir,
  }), [flatNodes, handleOptimisticSelect, optimisticSelectedPath, selectedPath, handleToggleExpand, handleContextMenu, workDir])

  return (
    <div className="flex flex-col h-full bg-bg-sidebar border-l border-border contain-panel">
      <FileExplorerHeader
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      />

      {!isCollapsed && (
        <FileExplorerList
          ref={containerRef}
          isLoading={isLoading}
          flatNodes={flatNodes}
          containerHeight={containerHeight}
          listRef={listRef}
          itemData={itemData}
        />
      )}

      {/* Context Menu - Portal to body to escape contain:paint */}
      {contextMenu && createPortal(
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          workDir={workDir}
          onClose={closeContextMenu}
          onCopyPath={handleCopyPath}
          onCopyRelativePath={handleCopyRelativePath}
          onRename={handleRename}
          onDelete={handleDelete}
        />,
        document.body
      )}

      <FileExplorerDialogs
        deleteTarget={deleteTarget}
        renameTarget={renameTarget}
        onConfirmDelete={confirmDelete}
        onCancelDelete={closeDeleteDialog}
        onConfirmRename={confirmRename}
        onCancelRename={closeRenameDialog}
      />
    </div>
  )
}
