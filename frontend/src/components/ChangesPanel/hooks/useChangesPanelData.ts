import { useCallback } from 'react'
import { useCurrentSession } from '../../../hooks/useCurrentSession'
import { useGitOperations, type GitOperationResult } from '../../../hooks/useGitOperations'
import type { FileChange } from '../../../types/git'

export interface UseChangesPanelDataOptions {
  isReady: boolean
  onSelectFileCallback?: (index: number, path: string) => void
}

export interface UseChangesPanelDataReturn {
  isGitRepo: boolean
  branch: string
  ahead: number
  behind: number
  files: FileChange[]
  selectedIndex: number
  onSelectFile: (index: number) => void
  onAccept: (path: string) => Promise<GitOperationResult>
  onUnstage: (path: string) => Promise<GitOperationResult>
  onReject: (path: string) => Promise<GitOperationResult>
  onAcceptAll: (paths: string[]) => Promise<GitOperationResult>
  onUnstageAll: (paths: string[]) => Promise<GitOperationResult>
  onRejectAll: (paths: string[]) => Promise<GitOperationResult>
  onCommit: (message: string) => Promise<GitOperationResult>
  onPush: () => Promise<GitOperationResult>
  onPull: () => Promise<GitOperationResult>
  onFetch: () => Promise<GitOperationResult>
  onRefresh: () => Promise<void>
}

/**
 * Hook that combines session and git operations data for ChangesPanelContainer.
 * Provides all data needed by ChangesPanelView in a normalized format.
 */
export function useChangesPanelData({
  isReady,
  onSelectFileCallback,
}: UseChangesPanelDataOptions): UseChangesPanelDataReturn {
  const { sessionId, isGitRepo, branch } = useCurrentSession()

  const gitOps = useGitOperations({
    sessionId,
    isGitRepo,
    isReady,
  })

  const onSelectFile = useCallback(
    (index: number) => {
      gitOps.setSelectedChangeIdx(index)
      const file = gitOps.files[index]
      if (file && onSelectFileCallback) {
        onSelectFileCallback(index, file.path)
      }
    },
    [gitOps, onSelectFileCallback]
  )

  return {
    isGitRepo,
    branch: branch ?? '',
    ahead: gitOps.gitAhead,
    behind: gitOps.gitBehind,
    files: gitOps.files,
    selectedIndex: gitOps.selectedChangeIdx,
    onSelectFile,
    onAccept: gitOps.handleAcceptChange,
    onUnstage: gitOps.handleUnstageChange,
    onReject: gitOps.handleRejectChange,
    onAcceptAll: gitOps.handleAcceptAll,
    onUnstageAll: gitOps.handleUnstageAll,
    onRejectAll: gitOps.handleRejectAll,
    onCommit: gitOps.handleCommit,
    onPush: gitOps.handlePush,
    onPull: gitOps.handlePull,
    onFetch: gitOps.handleFetch,
    onRefresh: gitOps.refreshChanges,
  }
}
