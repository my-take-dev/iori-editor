import type { WorktreeInfo } from '../../types/worktree'

// Tab types
export type TabType = 'new' | 'existing'

// Pull result from branch update
export interface PullResult {
  success: boolean
  errorMsg?: string
}

// Worktree operation result
export interface WorktreeOperationResult {
  success: boolean
  error?: string
}

// Branch information
export interface BranchInfo {
  name: string
  isCurrent: boolean
  isRemote?: boolean
}

// Main component props
export interface WorktreeCreateModalProps {
  isOpen: boolean
  branches: BranchInfo[]
  existingWorktrees: WorktreeInfo[]
  currentBranch: string
  onClose: () => void
  onCreateNew: (baseBranch: string, customName: string) => void
  onSelectExisting: (worktreePath: string) => Promise<WorktreeOperationResult>
  onUpdateBranch?: (branchName: string, isRemote: boolean) => Promise<PullResult>
}

// Hook state interface
export interface WorktreeCreateFlowState {
  activeTab: TabType
  selectedBranch: string
  customName: string
  isLoading: boolean
  showPullConfirm: boolean
  isPulling: boolean
  pullError: string | null
  baseBranchIsRemote: boolean
  pendingBaseBranch: string
  selectableWorktrees: WorktreeInfo[]
  effectiveCustomName: string
  alertMessage: string | null
}

// Hook actions interface
export interface WorktreeCreateFlowActions {
  setActiveTab: (tab: TabType) => void
  setSelectedBranch: (branch: string) => void
  setCustomName: (name: string) => void
  handleRequestCreate: () => void
  handlePullAndContinue: () => Promise<void>
  handleSkipPull: () => Promise<void>
  handleSelectExisting: (path: string) => Promise<void>
  handleCancelPullConfirm: () => void
  clearAlertMessage: () => void
}

// Subcomponent props
export interface ModalHeaderProps {
  onClose: () => void
}

export interface TabSelectorProps {
  activeTab: TabType
  selectableCount: number
  onTabChange: (tab: TabType) => void
}

export interface BranchListProps {
  branches: BranchInfo[]
  selectedBranch: string
  onSelect: (branchName: string) => void
}

export interface WorktreeNameInputProps {
  customName: string
  effectiveCustomName: string
  selectedBranch: string
  isLoading: boolean
  disabled: boolean
  onChange: (name: string) => void
  onSubmit: () => void
}

export interface ExistingWorktreeListProps {
  worktrees: WorktreeInfo[]
  onSelect: (path: string) => void
}

export interface PullConfirmDialogProps {
  branchName: string
  isRemote: boolean
  isPulling: boolean
  error: string | null
  onPullAndContinue: () => void
  onSkipPull: () => void
  onCancel: () => void
}
