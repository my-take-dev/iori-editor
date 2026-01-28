import { useEffect, useCallback, useMemo } from 'react'
import { useWizardStateMachine } from './useWizardStateMachine'
import { useFolderSelection, useBranchSelection, useNewBranchCreation } from './useWizardDataHooks'
import { useWizardActions } from './useWizardActions'
import type { WizardStep } from './types'
import type {
  NewSessionModalProps,
  NewBranchSubStep,
  StepFolderSelectProps,
  StepGitOptionsProps,
  StepDuplicateErrorProps,
  StepBranchSelectProps,
  StepNewBranchFlowProps,
} from '../../components/NewSessionModal/types'

// ステップに応じたPropsの判別可能ユニオン型
export type StepPropsUnion =
  | { step: 'FOLDER_SELECT'; props: StepFolderSelectProps }
  | { step: 'GIT_OPTIONS'; props: StepGitOptionsProps }
  | { step: 'DUPLICATE_ERROR'; props: StepDuplicateErrorProps }
  | { step: 'BRANCH_SELECT'; props: StepBranchSelectProps }
  | { step: 'BASE_BRANCH_SELECT'; props: StepNewBranchFlowProps }
  | { step: 'PULL_CONFIRM'; props: StepNewBranchFlowProps }
  | { step: 'NEW_BRANCH_INPUT'; props: StepNewBranchFlowProps }

export interface UseNewSessionWizardReturn {
  currentStep: WizardStep
  getStepProps: () => StepPropsUnion
}

export function useNewSessionWizard(props: NewSessionModalProps): UseNewSessionWizardReturn {
  const {
    isOpen,
    onComplete,
    onSelectFolder,
    onGetBranches,
    onCheckoutBranch,
    onCreateBranch,
    onUpdateBranch,
    recentFolders,
    existingSessionPaths,
  } = props

  // ステートマシン
  const { state, dispatch, reset } = useWizardStateMachine()

  // データフック
  const folderSelection = useFolderSelection()
  const branchSelection = useBranchSelection()
  const newBranchCreation = useNewBranchCreation()

  // アクションフック
  const actions = useWizardActions({
    dispatch,
    state,
    folderSelection,
    branchSelection,
    newBranchCreation,
    onSelectFolder,
    onGetBranches,
    onCheckoutBranch,
    onCreateBranch,
    onUpdateBranch,
    onComplete,
    existingSessionPaths,
    recentFolders,
  })

  // モーダルが開いたときにリセット
  useEffect(() => {
    if (isOpen) {
      reset()
      folderSelection.reset()
      branchSelection.reset()
      newBranchCreation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // NewBranchSubStepを計算
  const newBranchSubStep = useMemo((): NewBranchSubStep => {
    if (state.step === 'PULL_CONFIRM') return 'PULL_CONFIRM'
    if (state.step === 'NEW_BRANCH_INPUT') return 'NAME_INPUT'
    return 'BASE_SELECT'
  }, [state.step])

  // フォルダパスを取得
  const getFolderPath = useCallback((): string => {
    if ('folderPath' in state) {
      return state.folderPath
    }
    return folderSelection.selectedPath
  }, [state, folderSelection.selectedPath])

  // ベースブランチを取得
  const getBaseBranch = useCallback((): string => {
    if ('baseBranch' in state) {
      return state.baseBranch
    }
    return branchSelection.currentBranch
  }, [state, branchSelection.currentBranch])

  // isRemoteを取得
  const getIsRemote = useCallback((): boolean => {
    if (state.step === 'PULL_CONFIRM' && 'isRemote' in state) {
      return state.isRemote
    }
    return false
  }, [state])

  // ステップに応じたpropsを返す
  const getStepProps = useCallback((): StepPropsUnion => {
    switch (state.step) {
      case 'FOLDER_SELECT':
        return {
          step: 'FOLDER_SELECT',
          props: {
            onSelectFolder: actions.folderActions.selectFolder,
            onSelectRecent: actions.folderActions.selectRecent,
            recentFolders,
            isLoading: folderSelection.isLoading,
          },
        }

      case 'GIT_OPTIONS':
        return {
          step: 'GIT_OPTIONS',
          props: {
            selectedPath: getFolderPath(),
            isGitRepo: 'isGitRepo' in state ? state.isGitRepo : false,
            currentBranch: branchSelection.currentBranch,
            branchCount: branchSelection.branches.length,
            onUseCurrent: actions.gitOptionActions.useCurrent,
            onSelectExisting: actions.gitOptionActions.selectExisting,
            onCreateNew: actions.gitOptionActions.createNew,
            onNoGit: actions.gitOptionActions.skipGit,
          },
        }

      case 'DUPLICATE_ERROR':
        return {
          step: 'DUPLICATE_ERROR',
          props: {
            selectedPath: getFolderPath(),
            onSelectDifferent: actions.folderActions.selectDifferent,
          },
        }

      case 'BRANCH_SELECT':
        return {
          step: 'BRANCH_SELECT',
          props: {
            branches: branchSelection.branches,
            selectedPath: getFolderPath(),
            selectedBranch: branchSelection.selectedBranch,
            onSelect: actions.branchSelectActions.select,
            onConfirm: actions.branchSelectActions.confirm,
            onBack: actions.branchSelectActions.back,
            isLoading: folderSelection.isLoading,
          },
        }

      case 'BASE_BRANCH_SELECT':
      case 'PULL_CONFIRM':
      case 'NEW_BRANCH_INPUT': {
        const newBranchFlowProps: StepNewBranchFlowProps = {
          subStep: newBranchSubStep,
          branches: branchSelection.branches,
          onSelectBaseBranch: actions.newBranchActions.selectBaseBranch,
          onBackFromBaseBranch: actions.newBranchActions.back,
          baseBranch: getBaseBranch(),
          baseBranchIsRemote: getIsRemote(),
          isPulling: newBranchCreation.isPulling,
          pullError: newBranchCreation.pullError,
          onPull: actions.newBranchActions.pull,
          onSkip: actions.newBranchActions.skipPull,
          onBackFromPullConfirm: actions.newBranchActions.back,
          newBranchName: newBranchCreation.newBranchName,
          onNameChange: actions.newBranchActions.changeName,
          onCreate: actions.newBranchActions.create,
          onBackFromNameInput: actions.newBranchActions.back,
          isLoading: folderSelection.isLoading,
        }
        return {
          step: state.step,
          props: newBranchFlowProps,
        }
      }

      default:
        // すべてのケースがカバーされているため、ここには到達しない
        return {
          step: 'FOLDER_SELECT' as const,
          props: {
            onSelectFolder: actions.folderActions.selectFolder,
            onSelectRecent: actions.folderActions.selectRecent,
            recentFolders,
            isLoading: folderSelection.isLoading,
          },
        }
    }
  }, [
    state,
    actions,
    recentFolders,
    folderSelection.isLoading,
    branchSelection,
    newBranchCreation,
    newBranchSubStep,
    getFolderPath,
    getBaseBranch,
    getIsRemote,
  ])

  return {
    currentStep: state.step,
    getStepProps,
  }
}
