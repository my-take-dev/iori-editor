// NewSessionModal 関連の型定義

export interface RecentFolder {
  path: string
  name: string
  date: string
}

export interface BranchInfo {
  name: string
  isCurrent: boolean
  isRemote: boolean
}

export type GitOption = 'current' | 'existing' | 'newbranch' | 'worktree' | 'none'

export interface PullResult {
  success: boolean
  errorMsg?: string
}

// ウィザードのステップ定義
export type WizardStep =
  | 'FOLDER_SELECT'
  | 'GIT_OPTIONS'
  | 'BRANCH_SELECT'
  | 'BASE_BRANCH_SELECT'
  | 'PULL_CONFIRM'
  | 'NEW_BRANCH_INPUT'
  | 'DUPLICATE_ERROR'

// NewBranchFlow内のサブステップ
export type NewBranchSubStep = 'BASE_SELECT' | 'PULL_CONFIRM' | 'NAME_INPUT'

// Props interfaces
export interface NewSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (gitOption: GitOption, folderPath: string, branchName?: string) => void
  onSelectFolder: () => Promise<string>
  onGetBranches: (path: string) => Promise<BranchInfo[]>
  onCheckoutBranch: (path: string, branchName: string) => Promise<void>
  onCreateBranch: (path: string, newBranchName: string, baseBranchName: string) => Promise<void>
  onUpdateBranch?: (path: string, branchName: string, isRemote: boolean) => Promise<PullResult>
  recentFolders: RecentFolder[]
  existingSessionPaths: string[]
}

// Step component props
export interface StepFolderSelectProps {
  onSelectFolder: () => void
  onSelectRecent: (folder: RecentFolder) => void
  recentFolders: RecentFolder[]
  isLoading: boolean
}

export interface StepGitOptionsProps {
  selectedPath: string
  isGitRepo: boolean
  currentBranch: string
  branchCount: number
  onUseCurrent: () => void
  onSelectExisting: () => void
  onCreateNew: () => void
  onNoGit: () => void
}

export interface StepDuplicateErrorProps {
  selectedPath: string
  onSelectDifferent: () => void
}

export interface StepBranchSelectProps {
  branches: BranchInfo[]
  selectedPath: string
  selectedBranch: string
  onSelect: (branchName: string) => void
  onConfirm: () => void
  onBack: () => void
  isLoading: boolean
}

export interface StepNewBranchFlowProps {
  subStep: NewBranchSubStep
  // Base branch select
  branches: BranchInfo[]
  onSelectBaseBranch: (branchName: string, isRemote: boolean) => void
  onBackFromBaseBranch: () => void
  // Pull confirm
  baseBranch: string
  baseBranchIsRemote: boolean
  isPulling: boolean
  pullError: string | null
  onPull: () => void
  onSkip: () => void
  onBackFromPullConfirm: () => void
  // Name input
  newBranchName: string
  onNameChange: (name: string) => void
  onCreate: () => void
  onBackFromNameInput: () => void
  isLoading: boolean
}
