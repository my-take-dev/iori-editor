import type { CenterViewMode, Session, FileChange, FileNode, HistoryInfo } from '../../types'
import type { FileNode as FileExplorerNode } from '../../../FileExplorer/types'
import { ChangesPanel } from '../../../ChangesPanel/ChangesPanel'
import { FileExplorer } from '../../../FileExplorer/FileExplorer'
import { HistoryList } from '../../../HistoryViewer'

interface RightPanelProps {
  activeSession: Session | undefined
  centerViewMode: CenterViewMode
  width: number
  isCollapsed: boolean
  // Changes panel props (for diff mode)
  files: FileChange[]
  selectedFileIndex: number | null
  onSelectFile: (index: number) => void
  onAccept: (path: string) => Promise<void>
  onUnstage: (path: string) => Promise<void>
  onReject: (path: string) => Promise<void>
  onRefresh: () => void
  onCommit: (message: string) => Promise<void>
  onPush: () => void
  onPull: () => void
  onFetch: () => void
  // File explorer props (for editor mode)
  fileTree: FileNode[]
  explorerSelectedPath: string
  isLoadingFileTree: boolean
  onExplorerSelectFile: (path: string) => void
  onRenameFile: (oldPath: string, newPath: string) => Promise<void>
  onDeleteFile: (path: string) => Promise<void>
  onRefreshFileTree: () => Promise<void>
  onLoadChildren?: (path: string) => Promise<FileExplorerNode[]>
  // History list props (for history mode)
  histories: HistoryInfo[]
  selectedHistoryFilename: string | null
  isLoadingHistories: boolean
  onHistorySelect: (filename: string) => void
  onHistoryDelete: (filename: string) => void
  onHistoryRefresh: () => void
  // Panel control
  onToggleCollapse: () => void
}

export function RightPanel({
  activeSession,
  centerViewMode,
  width,
  isCollapsed,
  // Changes panel
  files,
  selectedFileIndex,
  onSelectFile,
  onAccept,
  onUnstage,
  onReject,
  onRefresh,
  onCommit,
  onPush,
  onPull,
  onFetch,
  // File explorer
  fileTree,
  explorerSelectedPath,
  isLoadingFileTree,
  onExplorerSelectFile,
  onRenameFile,
  onDeleteFile,
  onRefreshFileTree,
  onLoadChildren,
  // History list
  histories,
  selectedHistoryFilename,
  isLoadingHistories,
  onHistorySelect,
  onHistoryDelete,
  onHistoryRefresh,
  // Panel control
  onToggleCollapse,
}: RightPanelProps): JSX.Element {
  const containerStyle = { width: isCollapsed ? 40 : width }
  const containerClass = 'flex-shrink-0 h-full'

  if (!activeSession) {
    return (
      <div
        style={containerStyle}
        className={`flex flex-col border-l border-[#3c3c3c] bg-[#252526] transition-all ${containerClass}`}
      >
        <div className="flex-1 flex items-center justify-center text-[#808080] text-[12px] p-4 text-center">
          {isCollapsed ? '' : 'セッションを選択してください'}
        </div>
      </div>
    )
  }

  if (centerViewMode === 'diff') {
    return (
      <div style={containerStyle} className={containerClass}>
        <ChangesPanel
          files={files}
          selectedIndex={selectedFileIndex ?? 0}
          onSelectFile={onSelectFile}
          onAccept={onAccept}
          onUnstage={onUnstage}
          onReject={onReject}
          onAcceptAll={async paths => {
            for (const path of paths) await onAccept(path)
          }}
          onUnstageAll={async paths => {
            for (const path of paths) await onUnstage(path)
          }}
          onRejectAll={async paths => {
            for (const path of paths) await onReject(path)
          }}
          onRefresh={onRefresh}
          onCommit={onCommit}
          onPush={onPush}
          onPull={onPull}
          onFetch={onFetch}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
          isGitRepo={true}
          branch={activeSession.branch}
          ahead={0}
          behind={0}
        />
      </div>
    )
  }

  if (centerViewMode === 'editor') {
    return (
      <div style={containerStyle} className={containerClass}>
        <FileExplorer
          files={fileTree}
          onSelectFile={onExplorerSelectFile}
          selectedPath={explorerSelectedPath}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
          isLoading={isLoadingFileTree}
          workDir={activeSession.workDir}
          onRenameFile={onRenameFile}
          onDeleteFile={onDeleteFile}
          onRefresh={onRefreshFileTree}
          onLoadChildren={onLoadChildren}
        />
      </div>
    )
  }

  // history mode
  return (
    <div style={containerStyle} className={containerClass}>
      <HistoryList
        histories={histories}
        selectedFilename={selectedHistoryFilename}
        onSelect={onHistorySelect}
        onDelete={onHistoryDelete}
        onRefresh={onHistoryRefresh}
        isLoading={isLoadingHistories}
      />
    </div>
  )
}
