import { useState, useRef, useMemo, useCallback, useLayoutEffect } from 'react'
import type { WorktreeTabProps, CenterViewMode } from './types'

// Hooks
import { useWorktreeSession, useWorktreeChanges, useWorktreeEditor, useWorktreeHistory } from './hooks'
import { usePanelResize } from '../../hooks/usePanelResize'

// Components
import { SessionList } from './components/SessionList'
import { CenterPanel } from './components/CenterPanel'
import { RightPanel } from './components/RightPanel'
import { DeleteConfirmModal } from './components/DeleteConfirmModal'

// Stores
import {
  useWorktreeStore,
  selectActiveWorktreeSession,
} from '../../stores/worktreeStore'
import { CloseWorktreeSession } from '../../wailsjs/go/main/App'
import { useAIStatusStore, selectAllStatuses } from '../../stores/aiStatusStore'
import { useWorktreeOperationsStore } from '../../stores/worktreeOperationsStore'
import { useWorktreeHistoryStore } from '../../stores/worktreeHistoryStore'

export function WorktreeTab({
  parentSession,
  lifecycleHandlers,
  terminalControl,
}: WorktreeTabProps): JSX.Element {
  // Get state from stores
  const activeWorktreeSessionId = useWorktreeStore(selectActiveWorktreeSession)
  const removeWorktreeSession = useWorktreeStore((s) => s.removeWorktreeSession)
  const aiStatuses = useAIStatusStore(selectAllStatuses)

  // Get individual operations from store (stable references)
  const push = useWorktreeOperationsStore((s) => s.push)
  const pull = useWorktreeOperationsStore((s) => s.pull)
  const fetch = useWorktreeOperationsStore((s) => s.fetch)

  // History store state
  const histories = useWorktreeHistoryStore((s) => s.histories)
  const isLoadingHistories = useWorktreeHistoryStore((s) => s.isLoading)
  const historyDelete = useWorktreeHistoryStore((s) => s.handleHistoryDelete)
  const historyRefresh = useWorktreeHistoryStore((s) => s.loadHistoryList)

  // Center view mode
  const [centerViewMode, setCenterViewMode] = useState<CenterViewMode>('diff')
  const previousWorktreeSessionIdRef = useRef<string | null>(null)

  // Ref for center container (used for center split calculation)
  const centerContainerRef = useRef<HTMLDivElement>(null)

  // Memoize constraints to prevent unnecessary re-renders
  const constraints = useMemo(() => ({
    leftWidth: { min: 150, max: 400 },
    rightWidth: { min: 150, max: 400 },
    centerSplit: { min: 20, max: 80 },
  }), [])

  // Panel resize hook with custom constraints
  const { sizes, collapsed, actions, resizeHandlers } = usePanelResize({
    initialLeftWidth: 200,
    initialRightWidth: 250,
    initialCenterSplit: 50,
    constraints,
    centerContainerRef,
  })
  const { setRightCollapsed } = actions
  const isChangesActive = centerViewMode === 'diff' && !collapsed.rightCollapsed
  const isExplorerActive = centerViewMode === 'editor' && !collapsed.rightCollapsed

  // Session hook (now gets data from stores internally)
  const {
    displayableSessions,
    activeSession,
    deleteConfirm,
    handleDeleteRequest,
    handleDeleteConfirm,
    handleDeleteCancel,
  } = useWorktreeSession({
    onDeleteWorktree: lifecycleHandlers.onDeleteWorktree,
  })

  useLayoutEffect(() => {
    if (!activeWorktreeSessionId) {
      previousWorktreeSessionIdRef.current = activeWorktreeSessionId
      return
    }

    if (previousWorktreeSessionIdRef.current !== activeWorktreeSessionId) {
      setRightCollapsed(true)
      if (centerViewMode === 'history') {
        setCenterViewMode('diff')
      }
    }

    previousWorktreeSessionIdRef.current = activeWorktreeSessionId
  }, [activeWorktreeSessionId, setRightCollapsed, centerViewMode])

  // Changes hook (now uses operations store internally)
  const {
    files,
    selectedFileIndex,
    diffContent,
    loadChanges,
    handleSelectFile,
    handleAccept,
    handleUnstage,
    handleReject,
    handleCommit,
  } = useWorktreeChanges({
    sessionId: activeWorktreeSessionId,
    isActive: isChangesActive,
  })

  // Editor hook (now uses operations store internally)
  const {
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
  } = useWorktreeEditor({
    sessionId: activeWorktreeSessionId,
    isActive: isExplorerActive,
    onChangesReload: loadChanges,
  })

  // History hook (now uses history store internally)
  const { selectedHistoryFilename, handleHistoryTabClick, handleHistorySelect } = useWorktreeHistory({
    activeSessionId: activeWorktreeSessionId ?? undefined,
    onSetCenterViewMode: setCenterViewMode,
  })

  // Handler for disconnecting session (close without deleting worktree)
  const handleDisconnectSession = useCallback(async () => {
    if (activeWorktreeSessionId) {
      try {
        await CloseWorktreeSession(activeWorktreeSessionId)
        removeWorktreeSession(activeWorktreeSessionId)
      } catch (error) {
        console.error('Failed to disconnect session:', error)
      }
    }
  }, [activeWorktreeSessionId, removeWorktreeSession])

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-[#1e1e1e]">
      {/* Left Panel - Session List */}
      <SessionList
        sessions={displayableSessions}
        activeSessionId={activeWorktreeSessionId}
        aiStatuses={aiStatuses}
        width={sizes.leftWidth}
        isCollapsed={collapsed.leftCollapsed}
        onSelectSession={lifecycleHandlers.onSelectWorktreeSession}
        onDeleteRequest={handleDeleteRequest}
        onCreateWorktree={lifecycleHandlers.onCreateWorktree}
        onToggleCollapse={actions.toggleLeftCollapsed}
        parentSession={parentSession}
        onExitWorktreeMode={lifecycleHandlers.onExitWorktreeMode}
      />

      {/* Left Resizer */}
      {!collapsed.leftCollapsed && (
        <div
          className="resizer-x"
          onMouseDown={resizeHandlers.startResizingLeft}
        />
      )}

      {/* Center Panel */}
      <div ref={centerContainerRef} className="flex-1 flex flex-col min-w-0">
        <CenterPanel
          activeSession={activeSession}
          centerViewMode={centerViewMode}
          centerSplit={sizes.centerSplit}
          isTerminalMaximized={terminalControl.isTerminalMaximized}
          files={files}
          selectedFileIndex={selectedFileIndex}
          diffContent={diffContent}
          editorFilePath={editorFilePath}
          onSaveFile={handleSaveFile}
          onSetViewMode={setCenterViewMode}
          onHistoryTabClick={handleHistoryTabClick}
          onStartResizingCenter={resizeHandlers.startResizingCenter}
          onToggleTerminalMaximize={terminalControl.onToggleTerminalMaximize}
          onDisconnectSession={handleDisconnectSession}
        />
      </div>

      {/* Right Resizer */}
      {!collapsed.rightCollapsed && (
        <div
          className="resizer-x"
          onMouseDown={resizeHandlers.startResizingRight}
        />
      )}

      {/* Right Panel */}
      <RightPanel
        activeSession={activeSession}
        centerViewMode={centerViewMode}
        width={sizes.rightWidth}
        isCollapsed={collapsed.rightCollapsed}
        // Changes panel
        files={files}
        selectedFileIndex={selectedFileIndex}
        onSelectFile={handleSelectFile}
        onAccept={handleAccept}
        onUnstage={handleUnstage}
        onReject={handleReject}
        onRefresh={() => loadChanges(true)}
        onCommit={handleCommit}
        onPush={() => activeWorktreeSessionId && push(activeWorktreeSessionId)}
        onPull={() => activeWorktreeSessionId && pull(activeWorktreeSessionId)}
        onFetch={() => activeWorktreeSessionId && fetch(activeWorktreeSessionId)}
        // File explorer
        fileTree={fileTree}
        explorerSelectedPath={explorerSelectedPath}
        isLoadingFileTree={isLoadingFileTree}
        onExplorerSelectFile={handleExplorerSelectFile}
        onRenameFile={handleRenameFile}
        onDeleteFile={handleDeleteFile}
        onRefreshFileTree={() => loadFileTree(true)}
        onLoadChildren={handleLoadChildren}
        // History list
        histories={histories}
        selectedHistoryFilename={selectedHistoryFilename}
        isLoadingHistories={isLoadingHistories}
        onHistorySelect={handleHistorySelect}
        onHistoryDelete={historyDelete}
        onHistoryRefresh={historyRefresh}
        // Panel control
        onToggleCollapse={actions.toggleRightCollapsed}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          worktreeName={deleteConfirm.name}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  )
}

export type { WorktreeTabProps }
