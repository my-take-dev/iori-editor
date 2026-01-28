import { useState, useEffect, useCallback, useMemo } from 'react'
import type { WorktreeInfo } from '../../../types/worktree'
import type {
  TabType,
  BranchInfo,
  PullResult,
  WorktreeCreateFlowState,
  WorktreeCreateFlowActions,
  WorktreeOperationResult,
} from '../types'

interface UseWorktreeCreateFlowProps {
  isOpen: boolean
  branches: BranchInfo[]
  existingWorktrees: WorktreeInfo[]
  currentBranch: string
  onCreateNew: (baseBranch: string, customName: string) => void
  onSelectExisting: (worktreePath: string) => Promise<WorktreeOperationResult>
  onUpdateBranch?: (branchName: string, isRemote: boolean) => Promise<PullResult>
  onClose: () => void
}

interface UseWorktreeCreateFlowReturn {
  state: WorktreeCreateFlowState
  actions: WorktreeCreateFlowActions
}

// Sanitize custom name (remove invalid characters for git branch names)
function sanitizeCustomName(name: string): string {
  return name.replace(/[^a-zA-Z0-9\-_]/g, '').toLowerCase()
}

export function useWorktreeCreateFlow(
  props: UseWorktreeCreateFlowProps
): UseWorktreeCreateFlowReturn {
  const {
    isOpen,
    branches,
    existingWorktrees,
    currentBranch,
    onCreateNew,
    onSelectExisting,
    onUpdateBranch,
    onClose,
  } = props

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('new')

  // Selection state
  const [selectedBranch, setSelectedBranch] = useState(currentBranch)
  const [customName, setCustomName] = useState('')

  // Loading state
  const [isLoading, setIsLoading] = useState(false)

  // Pull confirmation state
  const [showPullConfirm, setShowPullConfirm] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const [pullError, setPullError] = useState<string | null>(null)
  const [baseBranchIsRemote, setBaseBranchIsRemote] = useState(false)
  const [pendingBaseBranch, setPendingBaseBranch] = useState('')

  // Alert state
  const [alertMessage, setAlertMessage] = useState<string | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('new')
      setSelectedBranch(currentBranch)
      setCustomName('')
      setIsLoading(false)
      setShowPullConfirm(false)
      setIsPulling(false)
      setPullError(null)
      setBaseBranchIsRemote(false)
      setPendingBaseBranch('')
      setAlertMessage(null)
    }
  }, [isOpen, currentBranch])

  // Handle Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Get effective custom name (use default if empty)
  const effectiveCustomName = useMemo(() => {
    const sanitized = sanitizeCustomName(customName)
    return sanitized || 'work'
  }, [customName])

  // Filter out main worktree and already opened worktrees
  const selectableWorktrees = useMemo(() => {
    return existingWorktrees.filter((wt) => !wt.isMain && !wt.isOpened)
  }, [existingWorktrees])

  // Actual creation
  const handleCreateNew = useCallback(
    async (branchName: string): Promise<void> => {
      if (!branchName) return
      setIsLoading(true)
      try {
        await onCreateNew(branchName, effectiveCustomName)
      } finally {
        setIsLoading(false)
      }
    },
    [onCreateNew, effectiveCustomName]
  )

  // When user clicks "Worktree を作成" button
  const handleRequestCreate = useCallback((): void => {
    if (!selectedBranch) return

    const branch = branches.find((b) => b.name === selectedBranch)
    const isRemote = branch?.isRemote || false

    setPendingBaseBranch(selectedBranch)
    setBaseBranchIsRemote(isRemote)
    setPullError(null)

    // Show pull confirmation if onUpdateBranch is provided
    if (onUpdateBranch) {
      setShowPullConfirm(true)
    } else {
      // Proceed directly if no update function
      handleCreateNew(selectedBranch)
    }
  }, [selectedBranch, branches, onUpdateBranch, handleCreateNew])

  // Pull and continue
  const handlePullAndContinue = useCallback(async (): Promise<void> => {
    if (!onUpdateBranch) return

    setIsPulling(true)
    setPullError(null)

    try {
      const result = await onUpdateBranch(pendingBaseBranch, baseBranchIsRemote)
      if (result.success) {
        setShowPullConfirm(false)
        await handleCreateNew(pendingBaseBranch)
      } else {
        setPullError(result.errorMsg || '更新に失敗しました')
      }
    } catch (err) {
      setPullError(err instanceof Error ? err.message : '更新に失敗しました')
    } finally {
      setIsPulling(false)
    }
  }, [onUpdateBranch, pendingBaseBranch, baseBranchIsRemote, handleCreateNew])

  // Skip pull and create directly
  const handleSkipPull = useCallback(async (): Promise<void> => {
    setShowPullConfirm(false)
    await handleCreateNew(pendingBaseBranch)
  }, [pendingBaseBranch, handleCreateNew])

  // Select existing worktree
  const handleSelectExisting = useCallback(
    async (path: string): Promise<void> => {
      setIsLoading(true)
      try {
        const result = await onSelectExisting(path)
        if (!result.success && result.error) {
          // Check if it's an exclusion error (worktree already opened by another client)
          if (result.error.includes('既に') && result.error.includes('開かれています')) {
            setAlertMessage(result.error)
          }
        }
      } finally {
        setIsLoading(false)
      }
    },
    [onSelectExisting]
  )

  // Clear alert message
  const clearAlertMessage = useCallback((): void => {
    setAlertMessage(null)
  }, [])

  // Cancel pull confirmation
  const handleCancelPullConfirm = useCallback((): void => {
    setShowPullConfirm(false)
    setPullError(null)
  }, [])

  const state: WorktreeCreateFlowState = {
    activeTab,
    selectedBranch,
    customName,
    isLoading,
    showPullConfirm,
    isPulling,
    pullError,
    baseBranchIsRemote,
    pendingBaseBranch,
    selectableWorktrees,
    effectiveCustomName,
    alertMessage,
  }

  const actions: WorktreeCreateFlowActions = {
    setActiveTab,
    setSelectedBranch,
    setCustomName,
    handleRequestCreate,
    handlePullAndContinue,
    handleSkipPull,
    handleSelectExisting,
    handleCancelPullConfirm,
    clearAlertMessage,
  }

  return { state, actions }
}
