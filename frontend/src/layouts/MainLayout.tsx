import { Suspense, lazy } from 'react'
import { ErrorBoundary, LoadingFallback } from '../components/common'
import { ViewSwitcher } from '../components/ViewSwitcher'
import { DualTerminalPanel } from '../components/DualTerminalPanel/DualTerminalPanel'
import { ChangesPanel } from '../components/ChangesPanel/ChangesPanel'
import { FileExplorer } from '../components/FileExplorer/FileExplorer'
import { HistoryPanel } from '../components/HistoryViewer'
import type { ViewMode } from '../types/viewMode'
import { useCurrentSession } from '../hooks/useCurrentSession'
import { useUIStore, selectIsCreating } from '../stores/uiStore'
import { useDiffStore, selectDiffFilePath } from '../stores/diffStore'

// Lazy-loaded components (heavy Monaco Editor-based components)
const DiffViewer = lazy(() =>
  import('../components/DiffViewer/DiffViewer').then(module => ({ default: module.DiffViewer }))
)
const FileEditor = lazy(() =>
  import('../components/FileEditor/FileEditor').then(module => ({ default: module.FileEditor }))
)

export interface MainLayoutProps {
  // View
  viewMode: Exclude<ViewMode, 'worktree'>
  onViewModeChange: (mode: ViewMode) => void
  onHistoryTabClick: () => void
  isWorktreeMode: boolean
  isReady: boolean

  // Panel sizes
  centerSplit: number
  rightWidth: number
  rightCollapsed: boolean
  terminalMaximized: boolean
  onStartResizingCenter: (e: React.MouseEvent) => void
  onStartResizingRight: (e: React.MouseEvent) => void
  onToggleRightCollapsed: () => void
  onToggleTerminalMaximized: () => void

  // Coordination callbacks
  onClone: () => void
  onSelectFile?: (index: number, path: string) => void

  // Editor
  editorFilePath: string | null
  onSaveFile: (content: string) => Promise<void>
  setEditorFilePath: (path: string) => void
}

export function MainLayout({
  // View
  viewMode,
  onViewModeChange,
  onHistoryTabClick,
  isWorktreeMode,
  isReady,

  // Panel sizes
  centerSplit,
  rightWidth,
  rightCollapsed,
  terminalMaximized,
  onStartResizingCenter,
  onStartResizingRight,
  onToggleRightCollapsed,
  onToggleTerminalMaximized,

  // Coordination callbacks
  onClone,
  onSelectFile,

  // Editor
  editorFilePath,
  onSaveFile,
  setEditorFilePath,
}: MainLayoutProps) {
  // Get session info from hook
  const { session, isGitRepo } = useCurrentSession()

  // Get UI state
  const isCreating = useUIStore(selectIsCreating)

  // Get diff file path from store for conditional rendering
  const selectedFilePath = useDiffStore(selectDiffFilePath)
  const rightPanelReady = isReady && !rightCollapsed

  return (
    <>
      <div className="flex-1 flex flex-col min-w-0 bg-bg-primary relative">
        {!terminalMaximized && (
          <>
            {/* View Mode Tabs */}
            <ViewSwitcher
              currentView={viewMode}
              onViewChange={onViewModeChange}
              showWorktreeTab={isWorktreeMode}
              onHistoryClick={onHistoryTabClick}
            />

            {/* Diff/Editor/History Panel */}
            <div
              style={{ height: viewMode === 'history' ? '100%' : `${centerSplit}%` }}
              className="flex flex-col min-h-0 bg-bg-editor relative"
            >
              {/* Editor Panel - 常にマウント、CSSで表示制御（Monaco Editor プリロード用） */}
              <div
                className="absolute inset-0 flex flex-col"
                style={{ display: viewMode === 'editor' ? 'flex' : 'none' }}
              >
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <FileEditor
                      sessionId={session?.id ?? null}
                      filePath={editorFilePath ?? ''}
                      onSave={onSaveFile}
                    />
                  </Suspense>
                </ErrorBoundary>
              </div>

              {/* Diff Panel */}
              {viewMode === 'diff' && (
                <div className="absolute inset-0 flex flex-col">
                  {selectedFilePath ? (
                    <ErrorBoundary>
                      <Suspense fallback={<LoadingFallback />}>
                        <DiffViewer />
                      </Suspense>
                    </ErrorBoundary>
                  ) : (
                    <>
                      <div className="h-8 px-4 flex items-center bg-bg-editor border-b border-border text-xs flex-shrink-0 justify-between">
                        <span className="font-bold text-white">
                          <span className="text-accent-yellow">DIFF:</span>{' '}
                          No file selected
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-center text-text-muted">
                        {isGitRepo
                          ? 'Select a file from the Changes panel'
                          : 'Not a Git repository'}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* History Panel */}
              {viewMode === 'history' && (
                <ErrorBoundary>
                  <HistoryPanel />
                </ErrorBoundary>
              )}
            </div>

            {/* Center Resizer - hidden in history mode */}
            {viewMode !== 'history' && (
              <div
                className="resizer-y"
                onMouseDown={onStartResizingCenter}
              />
            )}
          </>
        )}

        {/* Terminal Panel - hidden in history mode */}
        {viewMode !== 'history' && (
          <div
            className={`${
              terminalMaximized ? 'h-full' : 'flex-1'
            } flex flex-col min-h-0 bg-bg-primary`}
          >
            {session ? (
              <ErrorBoundary>
                <DualTerminalPanel
                  isMaximized={terminalMaximized}
                  onToggleMaximize={onToggleTerminalMaximized}
                />
              </ErrorBoundary>
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-secondary">
                {isCreating ? 'Creating session...' : 'No active session'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Resizer - hidden in history mode */}
      {!rightCollapsed && viewMode !== 'history' && (
        <div
          className="resizer-x"
          onMouseDown={onStartResizingRight}
        />
      )}

      {/* Right: Changes Panel or File Explorer - hidden in history mode */}
      {viewMode !== 'history' && (
        <div style={{ width: rightCollapsed ? 40 : rightWidth }} className="flex-shrink-0">
          <ErrorBoundary>
            {viewMode === 'diff' ? (
              <ChangesPanel
                isCollapsed={rightCollapsed}
                onToggleCollapse={onToggleRightCollapsed}
                isReady={rightPanelReady}
                onClone={onClone}
                onSelectFile={onSelectFile}
              />
            ) : (
              <FileExplorer
                isCollapsed={rightCollapsed}
                onToggleCollapse={onToggleRightCollapsed}
                isReady={rightPanelReady}
                setEditorFilePath={setEditorFilePath}
              />
            )}
          </ErrorBoundary>
        </div>
      )}
    </>
  )
}
