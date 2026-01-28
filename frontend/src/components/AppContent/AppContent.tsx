import { useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react'
import { SessionList, type BranchSwitchInfo, canSwitchBranch } from '../SessionList'
import { WorktreeTab } from '../WorktreeTab/WorktreeTab'
import { MainLayout } from '../../layouts'
import { ErrorBoundary } from '../common'

import { useSessionStore, selectActiveSession, selectSessions } from '../../stores/sessionStore'
import {
  useWorktreeStore,
  selectWorktreeModeSessionId,
  selectActiveWorktreeSessionObject,
  selectIsWorktreeMode,
} from '../../stores/worktreeStore'
import { useUIStore, selectViewMode } from '../../stores/uiStore'
import { useAIStatusStore, selectAllStatuses } from '../../stores/aiStatusStore'
import { useDiffStore } from '../../stores/diffStore'
import { useWorktreeHistoryStore } from '../../stores/worktreeHistoryStore'

import { usePanelResize } from '../../hooks/usePanelResize'
import { useDiffContent } from '../../hooks/useDiffContent'
import { useEditorState } from '../../hooks/useEditorState'
import { useAppShortcuts } from '../../hooks/useAppShortcuts'

import type { UseSessionHandlersReturn } from '../../hooks/useSessionHandlers'
import type { UseWorktreeHandlersReturn } from '../../hooks/useWorktreeHandlers'

interface AppContentProps {
  isReady: boolean
  sessionHandlers: UseSessionHandlersReturn
  worktreeHandlers: UseWorktreeHandlersReturn
}

/**
 * Main content area containing SessionList, MainLayout, and WorktreeTab
 */
export function AppContent({
  isReady,
  sessionHandlers,
  worktreeHandlers,
}: AppContentProps): JSX.Element {
  // UI Store
  const viewMode = useUIStore(selectViewMode)
  const setViewMode = useUIStore((s) => s.setViewMode)
  const openNewSessionModal = useUIStore((s) => s.openNewSessionModal)
  const openCloneModal = useUIStore((s) => s.openCloneModal)
  const openServerModeModal = useUIStore((s) => s.openServerModeModal)

  // AI Status Store
  const aiStatuses = useAIStatusStore(selectAllStatuses)

  // Session Store
  const activeSession = useSessionStore(selectActiveSession)
  const sessions = useSessionStore(selectSessions)

  // Worktree Store
  const worktreeModeSessionId = useWorktreeStore(selectWorktreeModeSessionId)
  const isWorktreeMode = useWorktreeStore(selectIsWorktreeMode)
  const activeWorktreeSession = useWorktreeStore(selectActiveWorktreeSessionObject)
  const setActiveWorktreeSession = useWorktreeStore((s) => s.setActiveWorktreeSession)

  // History Store (for worktree mode history tab click)
  const historyTabClick = useWorktreeHistoryStore((s) => s.handleHistoryTabClick)

  // Panel resize
  const { sizes, collapsed, actions, resizeHandlers } = usePanelResize()
  const { leftWidth, rightWidth, centerSplit } = sizes
  const { leftCollapsed, rightCollapsed, terminalMaximized } = collapsed
  const {
    toggleLeftCollapsed,
    toggleRightCollapsed,
    toggleTerminalMaximized,
    setRightCollapsed,
    setTerminalMaximized,
  } = actions
  const { startResizingLeft, startResizingRight, startResizingCenter } = resizeHandlers

  // Determine current session based on mode (using proper reactive state)
  const currentSession = isWorktreeMode ? activeWorktreeSession : activeSession
  const currentSessionId = currentSession?.id
  const previousSessionIdRef = useRef<string | undefined>(undefined)

  // Diff content (for coordination)
  const { loadDiff } = useDiffContent({ sessionId: currentSessionId })
  const clearDiffStore = useDiffStore((s) => s.clearDiff)

  // Editor state
  const { editorFilePath, setEditorFilePath, loadFileForEditor, handleSaveFile, clearEditorState } =
    useEditorState({
      sessionId: currentSessionId,
      onSaveComplete: async () => {}, // Git refresh is handled internally by ChangesPanel
    })

  // Combined history tab click handler (for non-worktree mode)
  const handleHistoryTabClick = useCallback(async () => {
    setViewMode('history')
    await historyTabClick(activeSession?.id)
  }, [setViewMode, historyTabClick, activeSession?.id])

  // Handle server mode
  const handleOpenServerMode = useCallback((sessionId: string, baseBranch: string, repoPath: string) => {
    openServerModeModal({
      sessionId,
      baseBranch,
      repoPath,
    })
  }, [openServerModeModal])

  // Keyboard shortcuts
  useAppShortcuts({
    onDiffShortcut: () => setViewMode('diff'),
    onEditorShortcut: () => setViewMode('editor'),
    onHistoryShortcut: handleHistoryTabClick,
    enabled: isReady,
  })

  // Reset editor and diff state when session changes or mode changes
  useEffect(() => {
    clearEditorState()
    clearDiffStore()
  }, [activeSession?.id, isWorktreeMode, clearEditorState, clearDiffStore])

  // When switching sessions, show only the terminal and hide the right sidebar for faster startup
  useLayoutEffect(() => {
    if (!currentSessionId) {
      previousSessionIdRef.current = currentSessionId
      return
    }

    if (previousSessionIdRef.current !== currentSessionId) {
      setTerminalMaximized(true)
      setRightCollapsed(true)
      if (viewMode === 'history') {
        setViewMode('diff')
      }
    }

    previousSessionIdRef.current = currentSessionId
  }, [currentSessionId, setTerminalMaximized, setRightCollapsed, viewMode, setViewMode])

  // Handle file selection coordination (load diff when file is selected in ChangesPanel)
  const handleSelectFile = useCallback((_index: number, path: string) => {
    loadDiff(path)
    if (viewMode === 'editor') {
      loadFileForEditor(path)
    }
  }, [loadDiff, viewMode, loadFileForEditor])

  // Build branch switch infos for SessionList
  // Note: We still need to track git state for branch switching validation
  // This will be accessed from the ChangesPanel's internal state
  const branchSwitchInfos = useMemo(() => {
    const infos: Record<string, BranchSwitchInfo> = {}
    for (const session of sessions) {
      // For now, allow switching - proper validation would require accessing git state
      infos[session.id] = canSwitchBranch(false, false)
    }
    return infos
  }, [sessions])

  // Find parent session for WorktreeTab
  const parentSession = sessions.find(s => s.id === worktreeModeSessionId)

  return (
    <div className="flex flex-1 min-h-0 min-w-0">
      {/* Left: Sessions Panel */}
      <ErrorBoundary>
        <SessionList
          onCreateSession={openNewSessionModal}
          isCollapsed={leftCollapsed}
          onToggleCollapse={toggleLeftCollapsed}
          width={leftWidth}
          aiStatuses={aiStatuses}
          branchSwitchInfos={branchSwitchInfos}
          onBranchChanged={async () => {
            // Git refresh is handled internally by ChangesPanel
          }}
          onWorktreeMode={worktreeHandlers.handleOpenWorktreeMode}
          onServerMode={handleOpenServerMode}
          onSessionSelected={sessionHandlers.handleSessionSelected}
          allWorktreeSessionsMap={sessionHandlers.allWorktreeSessionsMap}
        />
      </ErrorBoundary>

      {!leftCollapsed && <div className="resizer-x" onMouseDown={startResizingLeft} />}

      {/* Center: Main Area */}
      <ErrorBoundary>
        {viewMode === 'worktree' ? (
          <WorktreeTab
            parentSession={parentSession}
            lifecycleHandlers={{
              onExitWorktreeMode: worktreeHandlers.handleExitWorktreeMode,
              onSelectWorktreeSession: setActiveWorktreeSession,
              onCreateWorktree: worktreeHandlers.handleOpenWorktreeCreateModal,
              onDeleteWorktree: worktreeHandlers.handleDeleteWorktree,
            }}
            terminalControl={{
              isTerminalMaximized: terminalMaximized,
              onToggleTerminalMaximize: toggleTerminalMaximized,
            }}
          />
        ) : (
          <MainLayout
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onHistoryTabClick={handleHistoryTabClick}
            isWorktreeMode={isWorktreeMode}
            isReady={isReady}
            centerSplit={centerSplit}
            rightWidth={rightWidth}
            rightCollapsed={rightCollapsed}
            terminalMaximized={terminalMaximized}
            onStartResizingCenter={startResizingCenter}
            onStartResizingRight={startResizingRight}
            onToggleRightCollapsed={toggleRightCollapsed}
            onToggleTerminalMaximized={toggleTerminalMaximized}
            onClone={openCloneModal}
            onSelectFile={handleSelectFile}
            editorFilePath={editorFilePath}
            onSaveFile={handleSaveFile}
            setEditorFilePath={setEditorFilePath}
          />
        )}
      </ErrorBoundary>
    </div>
  )
}
