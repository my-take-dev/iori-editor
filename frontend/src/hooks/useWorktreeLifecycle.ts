import { useState, useCallback } from 'react'
import { useUIStore } from '../stores/uiStore'
import { useWorktreeStore, selectWorktreeModeSessionId } from '../stores/worktreeStore'
import { useAIStatusStore } from '../stores/aiStatusStore'
import { useSessionStore, selectSessions } from '../stores/sessionStore'
import type { WorktreeInfo } from '../types/worktree'
import type { BranchInfo as WorktreeBranchInfo } from '../components/WorktreeCreateModal'
import {
  GetBranchesForWorktreeCreate,
  GetExistingWorktrees,
  CreateWorktreeSession,
  AttachExistingWorktree,
  DeleteWorktreeSession,
  CheckWorktreeHasChanges,
  UpdateBranchForPath,
} from '../wailsjs/go/main/App'

export interface WorktreeOperationResult {
  success: boolean
  error?: string
}

export interface UseWorktreeLifecycleReturn {
  // State
  worktreeBranches: WorktreeBranchInfo[]
  existingWorktrees: WorktreeInfo[]

  // Handlers
  handleOpenWorktreeCreateModal: () => Promise<WorktreeOperationResult>
  handleCreateWorktree: (baseBranch: string, customName: string) => Promise<WorktreeOperationResult>
  handleUpdateBranchForWorktree: (branchName: string, isRemote: boolean) => Promise<{ success: boolean; errorMsg?: string }>
  handleAttachExistingWorktree: (worktreePath: string) => Promise<WorktreeOperationResult>
  handleDeleteWorktree: (sessionId: string) => Promise<WorktreeOperationResult>
}

export function useWorktreeLifecycle(): UseWorktreeLifecycleReturn {
  // Local state
  const [worktreeBranches, setWorktreeBranches] = useState<WorktreeBranchInfo[]>([])
  const [existingWorktrees, setExistingWorktrees] = useState<WorktreeInfo[]>([])

  // UI Store
  const openWorktreeCreateModal = useUIStore((s) => s.openWorktreeCreateModal)
  const closeWorktreeCreateModal = useUIStore((s) => s.closeWorktreeCreateModal)

  // Worktree Store
  const worktreeModeSessionId = useWorktreeStore(selectWorktreeModeSessionId)
  const addWorktreeSession = useWorktreeStore((s) => s.addWorktreeSession)
  const removeWorktreeSession = useWorktreeStore((s) => s.removeWorktreeSession)
  const setActiveWorktreeSession = useWorktreeStore((s) => s.setActiveWorktreeSession)

  // Session Store
  const sessions = useSessionStore(selectSessions)

  // AI Status Store
  const setAiWaiting = useAIStatusStore((s) => s.setWaiting)

  // Open create modal with branch/worktree data
  const handleOpenWorktreeCreateModal = useCallback(async (): Promise<WorktreeOperationResult> => {
    if (!worktreeModeSessionId) return { success: false, error: 'セッションが見つかりません' }

    const session = sessions.find((s) => s.id === worktreeModeSessionId)
    if (!session) return { success: false, error: 'セッションが見つかりません' }

    try {
      const [branches, worktrees] = await Promise.all([
        GetBranchesForWorktreeCreate(session.workDir),
        GetExistingWorktrees(worktreeModeSessionId),
      ])

      setWorktreeBranches(
        (branches || []).map((b: { name: string; isCurrent: boolean; isRemote?: boolean }) => ({
          name: b.name,
          isCurrent: b.isCurrent,
          isRemote: b.isRemote,
        }))
      )
      setExistingWorktrees(worktrees || [])
      openWorktreeCreateModal()
      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'ブランチ/ワークツリー情報の取得に失敗しました'
      console.error('Failed to load branches/worktrees:', err)
      return { success: false, error: errorMsg }
    }
  }, [worktreeModeSessionId, sessions, openWorktreeCreateModal])

  // Create new worktree
  const handleCreateWorktree = useCallback(async (baseBranch: string, customName: string): Promise<WorktreeOperationResult> => {
    if (!worktreeModeSessionId) return { success: false, error: 'セッションが見つかりません' }

    try {
      const newSession = await CreateWorktreeSession(worktreeModeSessionId, baseBranch, customName)
      addWorktreeSession(newSession)
      setActiveWorktreeSession(newSession.id)
      setAiWaiting(newSession.id)
      closeWorktreeCreateModal() // Only close on success
      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'ワークツリーの作成に失敗しました'
      console.error('Failed to create worktree:', err)
      // Keep modal open on error so user can retry
      return { success: false, error: errorMsg }
    }
  }, [worktreeModeSessionId, addWorktreeSession, setActiveWorktreeSession, closeWorktreeCreateModal, setAiWaiting])

  // Update branch for worktree creation
  const handleUpdateBranchForWorktree = useCallback(async (branchName: string, isRemote: boolean) => {
    if (!worktreeModeSessionId) return { success: false, errorMsg: 'セッションが見つかりません' }
    const session = sessions.find((s) => s.id === worktreeModeSessionId)
    if (!session) return { success: false, errorMsg: 'セッションが見つかりません' }
    try {
      return await UpdateBranchForPath(session.workDir, branchName, isRemote)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'ブランチの更新に失敗しました'
      console.error('Failed to update branch:', err)
      return { success: false, errorMsg }
    }
  }, [worktreeModeSessionId, sessions])

  // Attach existing worktree
  const handleAttachExistingWorktree = useCallback(async (worktreePath: string): Promise<WorktreeOperationResult> => {
    if (!worktreeModeSessionId) return { success: false, error: 'セッションが見つかりません' }

    try {
      const newSession = await AttachExistingWorktree(worktreeModeSessionId, worktreePath)
      addWorktreeSession(newSession)
      setActiveWorktreeSession(newSession.id)
      setAiWaiting(newSession.id)
      closeWorktreeCreateModal() // Only close on success
      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'ワークツリーのアタッチに失敗しました'
      console.error('Failed to attach worktree:', err)
      // Keep modal open on error so user can retry
      return { success: false, error: errorMsg }
    }
  }, [worktreeModeSessionId, addWorktreeSession, setActiveWorktreeSession, closeWorktreeCreateModal, setAiWaiting])

  // Delete worktree
  const handleDeleteWorktree = useCallback(async (sessionId: string): Promise<WorktreeOperationResult> => {
    try {
      const hasChanges = await CheckWorktreeHasChanges(sessionId)
      if (hasChanges) {
        const confirmed = window.confirm('未コミットの変更があります。削除しますか？')
        if (!confirmed) return { success: false, error: 'キャンセルされました' }
      }

      await DeleteWorktreeSession(sessionId, true)
      removeWorktreeSession(sessionId)
      // removeWorktreeSession already handles active session fallback
      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'ワークツリーの削除に失敗しました'
      console.error('Failed to delete worktree:', err)
      return { success: false, error: errorMsg }
    }
  }, [removeWorktreeSession])

  return {
    worktreeBranches,
    existingWorktrees,
    handleOpenWorktreeCreateModal,
    handleCreateWorktree,
    handleUpdateBranchForWorktree,
    handleAttachExistingWorktree,
    handleDeleteWorktree,
  }
}
