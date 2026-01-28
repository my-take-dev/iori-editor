import type { CenterViewMode, Session, FileChange } from '../../types'
import { DualTerminalPanel } from '../../../DualTerminalPanel/DualTerminalPanel'
import { ViewModeTabs } from './ViewModeTabs'
import { DiffPanel } from './DiffPanel'
import { EditorPanel } from './EditorPanel'
import { HistoryPanel } from './HistoryPanel'

interface CenterPanelProps {
  activeSession: Session | undefined
  centerViewMode: CenterViewMode
  centerSplit: number
  isTerminalMaximized: boolean
  // Diff props
  files: FileChange[]
  selectedFileIndex: number | null
  diffContent: { original: string; modified: string } | null
  // Editor props
  editorFilePath: string
  onSaveFile: (content: string) => Promise<void>
  // View mode handlers
  onSetViewMode: (mode: CenterViewMode) => void
  onHistoryTabClick: () => void
  // Resize handlers
  onStartResizingCenter: () => void
  onToggleTerminalMaximize: () => void
  // Session control
  onDisconnectSession?: () => void
}

export function CenterPanel({
  activeSession,
  centerViewMode,
  centerSplit,
  isTerminalMaximized,
  files,
  selectedFileIndex,
  diffContent,
  editorFilePath,
  onSaveFile,
  onSetViewMode,
  onHistoryTabClick,
  onStartResizingCenter,
  onToggleTerminalMaximize,
  onDisconnectSession,
}: CenterPanelProps): JSX.Element {
  if (!activeSession) {
      return (
        <div className="flex-1 flex items-center justify-center text-[#808080] text-[14px]">
          No active session
        </div>
      )
    }

    const diffFilePath =
      selectedFileIndex !== null && files[selectedFileIndex] ? files[selectedFileIndex].path : ''

    return (
      <>
        {!isTerminalMaximized && (
          <>
            {/* View Mode Tabs */}
            <ViewModeTabs
              currentMode={centerViewMode}
              onSelectMode={onSetViewMode}
              onHistoryClick={onHistoryTabClick}
            />

            {centerViewMode === 'history' ? (
              /* History View - Full height, no terminal */
              <HistoryPanel />
            ) : (
              <>
                {/* Diff/Editor Panel */}
                <div
                  style={{ height: `${centerSplit}%` }}
                  className="flex flex-col min-h-0 bg-[#1e1e1e] relative"
                >
                  {centerViewMode === 'diff' ? (
                    <DiffPanel
                      filePath={diffFilePath}
                      original={diffContent?.original || ''}
                      modified={diffContent?.modified || ''}
                    />
                  ) : (
                    <EditorPanel
                      sessionId={activeSession.id}
                      filePath={editorFilePath}
                      onSave={onSaveFile}
                    />
                  )}
                </div>

                {/* Center Resizer */}
                <div
                  className="resizer-y"
                  onMouseDown={onStartResizingCenter}
                />
              </>
            )}
          </>
        )}

        {/* Terminal - hidden in history mode, full height when maximized */}
        {centerViewMode !== 'history' && (
          <div
            className={`${isTerminalMaximized ? 'h-full' : ''} flex flex-col min-h-0`}
            style={!isTerminalMaximized ? { height: `${100 - centerSplit}%` } : undefined}
          >
            <DualTerminalPanel
              sessionId={activeSession.id}
              isMaximized={isTerminalMaximized}
              onToggleMaximize={onToggleTerminalMaximize}
              onDisconnectSession={onDisconnectSession}
            />
          </div>
        )}
      </>
    )
}
