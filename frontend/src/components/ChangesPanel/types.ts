import type { FileChange } from '../../types/git'
import type { GitOperationResult } from '../../hooks/useGitOperations'

/**
 * Props for the pure presentational ChangesPanelView component.
 * All props are REQUIRED - no optional/conditional data sourcing.
 * This component receives all state and handlers via props (Container/Presentational pattern).
 */
export interface ChangesPanelViewProps {
  // Layout control
  isCollapsed: boolean
  onToggleCollapse: () => void

  // Git repository state
  isGitRepo: boolean
  branch: string
  ahead: number
  behind: number

  // File data
  files: FileChange[]
  selectedIndex: number

  // File selection callback
  onSelectFile: (index: number) => void

  // Git operations - stage/unstage (single file)
  onAccept: (path: string) => void | Promise<void> | Promise<GitOperationResult>
  onUnstage: (path: string) => void | Promise<void> | Promise<GitOperationResult>
  // Git operations - stage/unstage all (pre-computed by container)
  onAcceptAll: () => void
  onUnstageAll: () => void
  onFetch: () => void | Promise<void> | Promise<GitOperationResult>
  onRefresh: () => void | Promise<void>

  // Optional features
  onClone?: () => void

  // UI State - commit message
  commitMessage: string
  setCommitMessage: (message: string) => void

  // UI State - dropdowns
  isDropdownOpen: boolean
  setIsDropdownOpen: (open: boolean) => void
  isMainMenuOpen: boolean
  setIsMainMenuOpen: (open: boolean) => void

  // UI State - section expansion
  isStagedExpanded: boolean
  setIsStagedExpanded: (expanded: boolean) => void
  isChangesExpanded: boolean
  setIsChangesExpanded: (expanded: boolean) => void

  // Refs
  dropdownRef: React.RefObject<HTMLDivElement>
  mainMenuRef: React.RefObject<HTMLDivElement>
  textareaRef: React.RefObject<HTMLTextAreaElement>

  // Commit operations (from useCommitOperations)
  operationError: string | null
  clearOperationError: () => void
  handleCommit: () => Promise<void>
  handleCommitAndPush: () => Promise<void>
  handleMenuCommit: () => Promise<void>
  handlePush: () => Promise<void>
  handlePull: () => Promise<void>

  // Discard operations (from useDiscardOperations)
  discardConfirm: DiscardConfirmState | null
  discardAllConfirm: boolean
  handleDiscardRequest: (path: string, fileName: string) => void
  handleDiscardConfirm: () => void
  handleDiscardAllRequest: () => void
  handleDiscardAllConfirm: () => void
  cancelDiscard: () => void
  cancelDiscardAll: () => void
}

/**
 * Props for the ChangesPanelContainer (used by MainLayout).
 * This container internally uses useGitOperations and useCurrentSession hooks.
 */
export interface ChangesPanelContainerProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  isReady: boolean
  onSelectFile?: (index: number, path: string) => void
  onClone?: () => void
}

/**
 * Facade props - maintains full backward compatibility.
 * Delegates to ChangesPanelContainer (internal mode) or ChangesPanelView (external mode).
 */
// Main ChangesPanel props (supports both internal hooks and external props)
export interface ChangesPanelProps {
  isCollapsed: boolean
  onToggleCollapse: () => void

  // For internal hook mode
  isReady?: boolean
  onSelectFile?: (index: number, path: string) => void

  // For external mode (e.g., WorktreeTab) - if provided, uses these instead of hooks
  files?: FileChange[]
  selectedIndex?: number
  onAccept?: (path: string) => void | Promise<void> | Promise<GitOperationResult>
  onUnstage?: (path: string) => void | Promise<void> | Promise<GitOperationResult>
  onReject?: (path: string) => void | Promise<void> | Promise<GitOperationResult>
  onAcceptAll?: (paths: string[]) => void | Promise<void> | Promise<GitOperationResult>
  onUnstageAll?: (paths: string[]) => void | Promise<void> | Promise<GitOperationResult>
  onRejectAll?: (paths: string[]) => void | Promise<void> | Promise<GitOperationResult>
  onCommit?: (message: string) => void | Promise<void> | Promise<GitOperationResult>
  onPush?: () => void | Promise<void> | Promise<GitOperationResult>
  onPull?: () => void | Promise<void> | Promise<GitOperationResult>
  onFetch?: () => void | Promise<void> | Promise<GitOperationResult>
  onClone?: () => void
  onRefresh?: () => void | Promise<void>
  isGitRepo?: boolean
  branch?: string
  ahead?: number
  behind?: number
}

// MenuItem props
export interface MenuItemProps {
  label: string
  onClick?: () => void
  disabled?: boolean
  shortcut?: string
  hasSubmenu?: boolean
}

// Discard confirmation state
export interface DiscardConfirmState {
  path: string
  fileName: string
}

// ChangesPanelHeader props
export interface ChangesPanelHeaderProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  isGitRepo: boolean
  isMainMenuOpen: boolean
  onToggleMainMenu: () => void
  onRefresh?: () => void
  mainMenuRef: React.RefObject<HTMLDivElement>
  onPull?: () => void
  onPush: () => void
  onClone?: () => void
  onFetch?: () => void
  onCommit: () => void
  commitDisabled: boolean
}

// CommitSection props
export interface CommitSectionProps {
  branch: string
  ahead: number
  behind: number
  commitMessage: string
  onCommitMessageChange: (message: string) => void
  onCommit: () => void
  onCommitAndPush: () => void
  onPush: () => void
  onPull?: () => void
  isDropdownOpen: boolean
  onToggleDropdown: () => void
  dropdownRef: React.RefObject<HTMLDivElement>
  textareaRef: React.RefObject<HTMLTextAreaElement>
  stagedFilesCount: number
  onSelectTemplate: (content: string) => void
  onOpenTemplateManager: () => void
}

// ChangeList props
export interface ChangeListProps {
  stagedFiles: FileChange[]
  unstagedFiles: FileChange[]
  selectedIndex: number
  pathToIndex: Map<string, number>
  isStagedExpanded: boolean
  isChangesExpanded: boolean
  onToggleStagedExpanded: () => void
  onToggleChangesExpanded: () => void
  onSelectFile: (index: number) => void
  onAccept: (path: string) => void
  onUnstage: (path: string) => void
  onDiscardRequest: (path: string, fileName: string) => void
  onUnstageAllFiles: () => void
  onStageAll: () => void
  onDiscardAllRequest: () => void
}

// GitActionMenu props
export interface GitActionMenuProps {
  isOpen: boolean
  onClose: () => void
  onPull?: () => void
  onPush: () => void
  onClone?: () => void
  onFetch?: () => void
  onCommit: () => void
  commitDisabled: boolean
}

// DiscardConfirmDialog props
export interface DiscardConfirmDialogProps {
  fileName: string
  onConfirm: () => void
  onCancel: () => void
}

// DiscardAllDialog props
export interface DiscardAllDialogProps {
  fileCount: number
  onConfirm: () => void
  onCancel: () => void
}

export type { FileChange }
