// ウィザードのステートマシン用型定義
import type { BranchInfo, RecentFolder, GitOption, PullResult } from '../../components/NewSessionModal/types'

// ステートマシンの状態（判別可能ユニオン型）
export type WizardState =
  | { step: 'FOLDER_SELECT' }
  | { step: 'GIT_OPTIONS'; folderPath: string; isGitRepo: boolean }
  | { step: 'DUPLICATE_ERROR'; folderPath: string }
  | { step: 'BRANCH_SELECT'; folderPath: string }
  | { step: 'BASE_BRANCH_SELECT'; folderPath: string }
  | { step: 'PULL_CONFIRM'; folderPath: string; baseBranch: string; isRemote: boolean }
  | { step: 'NEW_BRANCH_INPUT'; folderPath: string; baseBranch: string }

// ステートマシンのアクション
export type WizardAction =
  | { type: 'SELECT_FOLDER'; path: string; isGitRepo: boolean; isDuplicate: boolean }
  | { type: 'GO_BACK' }
  | { type: 'START_BRANCH_SELECT' }
  | { type: 'START_NEW_BRANCH' }
  | { type: 'SELECT_BASE_BRANCH'; branchName: string; isRemote: boolean; hasPullSupport: boolean }
  | { type: 'CONFIRM_PULL' }
  | { type: 'SKIP_PULL' }
  | { type: 'RESET' }

// 現在のステップ名（後方互換性のため）
export type WizardStep = WizardState['step']

// データフック用の型
export interface FolderSelectionState {
  selectedPath: string
  isLoading: boolean
}

export interface BranchSelectionState {
  branches: BranchInfo[]
  currentBranch: string
  selectedBranch: string
}

export interface NewBranchCreationState {
  newBranchName: string
  isPulling: boolean
  pullError: string | null
}

// アクションフックのパラメータ
export interface WizardActionsParams {
  dispatch: React.Dispatch<WizardAction>
  state: WizardState
  folderSelection: FolderSelectionState & {
    setSelectedPath: (path: string) => void
    setIsLoading: (loading: boolean) => void
    reset: () => void
  }
  branchSelection: BranchSelectionState & {
    setBranches: (branches: BranchInfo[]) => void
    setCurrentBranch: (branch: string) => void
    setSelectedBranch: (branch: string) => void
    reset: () => void
  }
  newBranchCreation: NewBranchCreationState & {
    setNewBranchName: (name: string) => void
    setIsPulling: (isPulling: boolean) => void
    setPullError: (error: string | null) => void
    reset: () => void
  }
  // 外部コールバック
  onSelectFolder: () => Promise<string>
  onGetBranches: (path: string) => Promise<BranchInfo[]>
  onCheckoutBranch: (path: string, branchName: string) => Promise<void>
  onCreateBranch: (path: string, newBranchName: string, baseBranchName: string) => Promise<void>
  onUpdateBranch?: (path: string, branchName: string, isRemote: boolean) => Promise<PullResult>
  onComplete: (gitOption: GitOption, folderPath: string, branchName?: string) => void
  existingSessionPaths: string[]
  recentFolders: RecentFolder[]
}

// アクションフックの返り値
export interface WizardActions {
  folderActions: {
    selectFolder: () => Promise<void>
    selectRecent: (folder: RecentFolder) => Promise<void>
    selectDifferent: () => void
  }
  gitOptionActions: {
    useCurrent: () => void
    selectExisting: () => void
    createNew: () => void
    skipGit: () => void
  }
  branchSelectActions: {
    select: (branchName: string) => void
    confirm: () => Promise<void>
    back: () => void
  }
  newBranchActions: {
    selectBaseBranch: (branchName: string, isRemote: boolean) => void
    pull: () => Promise<void>
    skipPull: () => void
    changeName: (name: string) => void
    create: () => Promise<void>
    back: () => void
  }
}
