import { useCallback, useMemo } from 'react'
import { isPathInList } from '../../utils/pathUtils'
import type { RecentFolder, BranchInfo } from '../../components/NewSessionModal/types'
import type { WizardActionsParams, WizardActions } from './types'

export function useWizardActions(params: WizardActionsParams): WizardActions {
  const {
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
  } = params

  // ブランチをロードする内部関数
  const loadBranches = useCallback(
    async (path: string): Promise<{ isGitRepo: boolean; branches: BranchInfo[] }> => {
      try {
        const branchList = await onGetBranches(path)
        branchSelection.setBranches(branchList)
        const current = branchList.find((b) => b.isCurrent)
        if (current) {
          branchSelection.setCurrentBranch(current.name)
          branchSelection.setSelectedBranch(current.name)
        }
        return { isGitRepo: true, branches: branchList }
      } catch (err) {
        console.error('Failed to load branches:', err)
        branchSelection.setBranches([])
        branchSelection.setCurrentBranch('')
        return { isGitRepo: false, branches: [] }
      }
    },
    [onGetBranches, branchSelection]
  )

  // フォルダパスを取得するヘルパー
  const getFolderPath = useCallback((): string => {
    if ('folderPath' in state) {
      return state.folderPath
    }
    return folderSelection.selectedPath
  }, [state, folderSelection.selectedPath])

  // フォルダ選択アクション
  const folderActions = useMemo(
    () => ({
      selectFolder: async () => {
        folderSelection.setIsLoading(true)
        try {
          const path = await onSelectFolder()
          if (path) {
            folderSelection.setSelectedPath(path)
            const isDuplicate = isPathInList(path, existingSessionPaths)
            const { isGitRepo } = await loadBranches(path)
            dispatch({ type: 'SELECT_FOLDER', path, isGitRepo, isDuplicate })
          }
        } catch (err) {
          console.error('Failed to select folder:', err)
        } finally {
          folderSelection.setIsLoading(false)
        }
      },

      selectRecent: async (folder: RecentFolder) => {
        folderSelection.setSelectedPath(folder.path)
        folderSelection.setIsLoading(true)
        try {
          const isDuplicate = isPathInList(folder.path, existingSessionPaths)
          const { isGitRepo } = await loadBranches(folder.path)
          dispatch({ type: 'SELECT_FOLDER', path: folder.path, isGitRepo, isDuplicate })
        } finally {
          folderSelection.setIsLoading(false)
        }
      },

      selectDifferent: () => {
        dispatch({ type: 'RESET' })
        folderSelection.reset()
        branchSelection.reset()
        newBranchCreation.reset()
      },
    }),
    [dispatch, folderSelection, branchSelection, newBranchCreation, onSelectFolder, existingSessionPaths, loadBranches]
  )

  // Git操作選択アクション
  const gitOptionActions = useMemo(
    () => ({
      useCurrent: () => {
        onComplete('current', getFolderPath())
      },

      selectExisting: () => {
        dispatch({ type: 'START_BRANCH_SELECT' })
      },

      createNew: () => {
        dispatch({ type: 'START_NEW_BRANCH' })
      },

      skipGit: () => {
        onComplete('none', getFolderPath())
      },
    }),
    [dispatch, onComplete, getFolderPath]
  )

  // ブランチ選択アクション
  const branchSelectActions = useMemo(
    () => ({
      select: (branchName: string) => {
        branchSelection.setSelectedBranch(branchName)
      },

      confirm: async () => {
        const { selectedBranch, currentBranch } = branchSelection
        const folderPath = getFolderPath()

        if (selectedBranch && selectedBranch !== currentBranch) {
          folderSelection.setIsLoading(true)
          try {
            await onCheckoutBranch(folderPath, selectedBranch)
          } catch (err) {
            console.error('Failed to checkout branch:', err)
            folderSelection.setIsLoading(false)
            return
          }
          folderSelection.setIsLoading(false)
        }
        onComplete('existing', folderPath, selectedBranch)
      },

      back: () => {
        dispatch({ type: 'GO_BACK' })
      },
    }),
    [dispatch, branchSelection, folderSelection, onCheckoutBranch, onComplete, getFolderPath]
  )

  // 新規ブランチ作成アクション
  const newBranchActions = useMemo(
    () => ({
      selectBaseBranch: (branchName: string, isRemote: boolean) => {
        newBranchCreation.setPullError(null)
        dispatch({
          type: 'SELECT_BASE_BRANCH',
          branchName,
          isRemote,
          hasPullSupport: !!onUpdateBranch,
        })
      },

      pull: async () => {
        if (!onUpdateBranch) return
        if (state.step !== 'PULL_CONFIRM' || !('baseBranch' in state)) return

        newBranchCreation.setIsPulling(true)
        newBranchCreation.setPullError(null)

        try {
          const result = await onUpdateBranch(state.folderPath, state.baseBranch, state.isRemote)
          if (result.success) {
            dispatch({ type: 'CONFIRM_PULL' })
          } else {
            newBranchCreation.setPullError(result.errorMsg || '更新に失敗しました')
          }
        } catch (err) {
          newBranchCreation.setPullError(err instanceof Error ? err.message : '更新に失敗しました')
        } finally {
          newBranchCreation.setIsPulling(false)
        }
      },

      skipPull: () => {
        dispatch({ type: 'SKIP_PULL' })
      },

      changeName: (name: string) => {
        newBranchCreation.setNewBranchName(name)
      },

      create: async () => {
        if (state.step !== 'NEW_BRANCH_INPUT' || !('baseBranch' in state)) return

        const { newBranchName } = newBranchCreation
        if (!newBranchName.trim()) return

        folderSelection.setIsLoading(true)
        try {
          await onCreateBranch(state.folderPath, newBranchName.trim(), state.baseBranch)
        } catch (err) {
          console.error('Failed to create branch:', err)
          folderSelection.setIsLoading(false)
          return
        }
        folderSelection.setIsLoading(false)
        onComplete('newbranch', state.folderPath, newBranchName.trim())
      },

      back: () => {
        newBranchCreation.setNewBranchName('')
        dispatch({ type: 'GO_BACK' })
      },
    }),
    [dispatch, state, folderSelection, newBranchCreation, onUpdateBranch, onCreateBranch, onComplete]
  )

  return {
    folderActions,
    gitOptionActions,
    branchSelectActions,
    newBranchActions,
  }
}
