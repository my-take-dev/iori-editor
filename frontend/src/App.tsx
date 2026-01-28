import { useState } from 'react'
import { AppModals } from './components/AppModals'
import { AppContent } from './components/AppContent'
import { SystemLogPanel, type ResourceUsage } from './components/SystemLogPanel/SystemLogPanel'

import { useSessionStore, selectActiveSession, selectSessions } from './stores/sessionStore'
import { useUIStore, selectViewMode } from './stores/uiStore'

import { useWailsReady } from './hooks/useWailsReady'
import { usePanelResize } from './hooks/usePanelResize'
import { useSystemLog } from './hooks/useSystemLog'
import { useSessionHandlers } from './hooks/useSessionHandlers'
import { useWorktreeHandlers } from './hooks/useWorktreeHandlers'
import { useAppInitialization } from './hooks/useAppInitialization'

function App(): JSX.Element {
  const isReady = useWailsReady()

  // Stores
  const viewMode = useUIStore(selectViewMode)
  const setViewMode = useUIStore((s) => s.setViewMode)
  const activeSession = useSessionStore(selectActiveSession)
  const sessions = useSessionStore(selectSessions)
  const setSessions = useSessionStore((s) => s.setSessions)

  // Local state
  const [resourceUsage, setResourceUsage] = useState<ResourceUsage | undefined>(undefined)

  // Panel resize (for log panel)
  const { sizes, collapsed, actions, resizeHandlers } = usePanelResize()
  const { logPanelHeight } = sizes
  const { logPanelCollapsed } = collapsed
  const { toggleLogPanelCollapsed } = actions
  const { startResizingLogPanel } = resizeHandlers

  // System log
  const { logs, clearLogs } = useSystemLog(isReady)

  // Session handlers
  const sessionHandlers = useSessionHandlers({
    activeSession,
    viewMode,
    setViewMode,
  })

  // Worktree handlers
  const worktreeHandlers = useWorktreeHandlers({
    setViewMode,
  })

  // App initialization
  useAppInitialization({
    isReady,
    sessions,
    setSessions,
    setRecentFolders: sessionHandlers.setRecentFolders,
    setAllWorktreeSessionsMap: sessionHandlers.setAllWorktreeSessionsMap,
    setResourceUsage,
  })

  if (!isReady) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-bg-primary">
        <div className="text-text-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full min-w-0 min-h-0 overflow-hidden text-sm bg-bg-primary text-text-primary">
      {/* Modals */}
      <AppModals sessionHandlers={sessionHandlers} worktreeHandlers={worktreeHandlers} />

      {/* Main Content */}
      <AppContent
        isReady={isReady}
        sessionHandlers={sessionHandlers}
        worktreeHandlers={worktreeHandlers}
      />

      {/* Log Panel */}
      {!logPanelCollapsed && (
        <div
          className="h-1 bg-[#252526] hover:bg-[#007acc] cursor-ns-resize flex-shrink-0"
          onMouseDown={startResizingLogPanel}
        />
      )}

      <SystemLogPanel
        logs={logs}
        onClear={clearLogs}
        isCollapsed={logPanelCollapsed}
        onToggleCollapse={toggleLogPanelCollapsed}
        height={logPanelHeight}
        resourceUsage={resourceUsage}
      />
    </div>
  )
}

export default App
