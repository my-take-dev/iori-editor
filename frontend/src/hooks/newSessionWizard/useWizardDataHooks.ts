import { useState, useCallback } from 'react'
import type { BranchInfo } from '../../components/NewSessionModal/types'
import type { FolderSelectionState, BranchSelectionState, NewBranchCreationState } from './types'

// フォルダ選択用データフック
export interface UseFolderSelectionReturn extends FolderSelectionState {
  setSelectedPath: (path: string) => void
  setIsLoading: (loading: boolean) => void
  reset: () => void
}

const initialFolderState: FolderSelectionState = {
  selectedPath: '',
  isLoading: false,
}

export function useFolderSelection(): UseFolderSelectionReturn {
  const [state, setState] = useState<FolderSelectionState>(initialFolderState)

  const setSelectedPath = useCallback((selectedPath: string) => {
    setState((prev) => ({ ...prev, selectedPath }))
  }, [])

  const setIsLoading = useCallback((isLoading: boolean) => {
    setState((prev) => ({ ...prev, isLoading }))
  }, [])

  const reset = useCallback(() => {
    setState(initialFolderState)
  }, [])

  return {
    ...state,
    setSelectedPath,
    setIsLoading,
    reset,
  }
}

// ブランチ選択用データフック
export interface UseBranchSelectionReturn extends BranchSelectionState {
  setBranches: (branches: BranchInfo[]) => void
  setCurrentBranch: (branch: string) => void
  setSelectedBranch: (branch: string) => void
  reset: () => void
}

const initialBranchState: BranchSelectionState = {
  branches: [],
  currentBranch: '',
  selectedBranch: '',
}

export function useBranchSelection(): UseBranchSelectionReturn {
  const [state, setState] = useState<BranchSelectionState>(initialBranchState)

  const setBranches = useCallback((branches: BranchInfo[]) => {
    setState((prev) => ({ ...prev, branches }))
  }, [])

  const setCurrentBranch = useCallback((currentBranch: string) => {
    setState((prev) => ({ ...prev, currentBranch }))
  }, [])

  const setSelectedBranch = useCallback((selectedBranch: string) => {
    setState((prev) => ({ ...prev, selectedBranch }))
  }, [])

  const reset = useCallback(() => {
    setState(initialBranchState)
  }, [])

  return {
    ...state,
    setBranches,
    setCurrentBranch,
    setSelectedBranch,
    reset,
  }
}

// 新規ブランチ作成用データフック
export interface UseNewBranchCreationReturn extends NewBranchCreationState {
  setNewBranchName: (name: string) => void
  setIsPulling: (isPulling: boolean) => void
  setPullError: (error: string | null) => void
  reset: () => void
}

const initialNewBranchState: NewBranchCreationState = {
  newBranchName: '',
  isPulling: false,
  pullError: null,
}

export function useNewBranchCreation(): UseNewBranchCreationReturn {
  const [state, setState] = useState<NewBranchCreationState>(initialNewBranchState)

  const setNewBranchName = useCallback((newBranchName: string) => {
    setState((prev) => ({ ...prev, newBranchName }))
  }, [])

  const setIsPulling = useCallback((isPulling: boolean) => {
    setState((prev) => ({ ...prev, isPulling }))
  }, [])

  const setPullError = useCallback((pullError: string | null) => {
    setState((prev) => ({ ...prev, pullError }))
  }, [])

  const reset = useCallback(() => {
    setState(initialNewBranchState)
  }, [])

  return {
    ...state,
    setNewBranchName,
    setIsPulling,
    setPullError,
    reset,
  }
}
