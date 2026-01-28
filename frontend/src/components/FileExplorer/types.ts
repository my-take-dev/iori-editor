import type { FlatNode } from '../../utils/treeUtils'

// Re-export for convenience
export type { FlatNode }

export interface FileNode {
  name: string
  path: string
  isDir: boolean
  hasChildren?: boolean
  children?: FileNode[]
}

export interface ContextMenuState {
  x: number
  y: number
  node: FlatNode
}

export interface FileContextMenuProps {
  x: number
  y: number
  node: FlatNode
  workDir: string
  onClose: () => void
  onCopyPath: () => void
  onCopyRelativePath: () => void
  onRename: () => void
  onDelete: () => void
}

export interface DeleteDialogProps {
  fileName: string
  onConfirm: () => void
  onCancel: () => void
}

export interface RenameDialogProps {
  currentName: string
  onConfirm: (newName: string) => void
  onCancel: () => void
}

export interface FileExplorerHeaderProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export interface FileExplorerListProps {
  isLoading: boolean
  flatNodes: FlatNode[]
  containerHeight: number
  listRef: React.RefObject<import('react-window').FixedSizeList>
  itemData: VirtualRowData
}

export interface FileExplorerDialogsProps {
  deleteTarget: FlatNode | null
  renameTarget: FlatNode | null
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onConfirmRename: (newName: string) => void
  onCancelRename: () => void
}

export interface VirtualRowData {
  flatNodes: FlatNode[]
  onSelectFile: (path: string) => void
  selectedPath?: string
  onToggleExpand: (path: string) => void
  onContextMenu: (e: React.MouseEvent, node: FlatNode) => void
  workDir: string
}

export interface FileExplorerProps {
  isCollapsed: boolean
  onToggleCollapse: () => void

  // For internal hook mode
  isReady?: boolean
  setEditorFilePath?: (path: string) => void

  // For external mode (e.g., WorktreeTab) - if provided, uses these instead of hooks
  files?: FileNode[]
  onSelectFile?: (path: string) => void
  selectedPath?: string
  isLoading?: boolean
  workDir?: string
  onRenameFile?: (oldPath: string, newPath: string) => Promise<void>
  onDeleteFile?: (path: string) => Promise<void>
  onRefresh?: () => void | Promise<void>
  onLoadChildren?: (path: string) => Promise<FileNode[]>
}
