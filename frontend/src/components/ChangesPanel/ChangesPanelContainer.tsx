import { useMemo, useCallback } from 'react'
import { ChangesPanelView } from './ChangesPanelView'
import {
  useChangesPanelData,
  useChangesPanelState,
  useCommitOperations,
  useDiscardOperations,
} from './hooks'
import type { ChangesPanelContainerProps } from './types'

/**
 * Container component that provides data from hooks to ChangesPanelView.
 * Used by MainLayout for the internal hook-based mode.
 *
 * Orchestrates all hooks and passes the combined state/handlers to the View.
 */
export function ChangesPanelContainer({
  isCollapsed,
  onToggleCollapse,
  isReady,
  onSelectFile: onSelectFileCallback,
  onClone,
}: ChangesPanelContainerProps): JSX.Element {
  // Data layer - Git operations and session data
  const data = useChangesPanelData({
    isReady,
    onSelectFileCallback,
  })

  // UI state layer
  const uiState = useChangesPanelState()

  // Derived data - staged and unstaged files
  const stagedFiles = useMemo(() => data.files.filter((f) => f.staged), [data.files])
  const unstagedFiles = useMemo(() => data.files.filter((f) => !f.staged), [data.files])

  // Commit operations layer
  const commitOps = useCommitOperations({
    commitMessage: uiState.commitMessage,
    setCommitMessage: uiState.setCommitMessage,
    setIsDropdownOpen: uiState.setIsDropdownOpen,
    onCommit: data.onCommit,
    onPush: data.onPush,
    onPull: data.onPull,
    stagedFilesCount: stagedFiles.length,
  })

  // Discard operations layer
  const discardOps = useDiscardOperations({
    unstagedFiles,
    onReject: data.onReject,
    onRejectAll: data.onRejectAll,
  })

  // Stage all handler
  const handleStageAll = useCallback(() => {
    data.onAcceptAll(unstagedFiles.map((file) => file.path))
  }, [unstagedFiles, data.onAcceptAll])

  // Unstage all handler
  const handleUnstageAll = useCallback(() => {
    data.onUnstageAll(stagedFiles.map((file) => file.path))
  }, [stagedFiles, data.onUnstageAll])

  return (
    <ChangesPanelView
      // Layout control
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      // Git repository state
      isGitRepo={data.isGitRepo}
      branch={data.branch}
      ahead={data.ahead}
      behind={data.behind}
      // File data
      files={data.files}
      selectedIndex={data.selectedIndex}
      onSelectFile={data.onSelectFile}
      // Git operations - stage/unstage
      onAccept={data.onAccept}
      onUnstage={data.onUnstage}
      onAcceptAll={handleStageAll}
      onUnstageAll={handleUnstageAll}
      onFetch={data.onFetch}
      onRefresh={data.onRefresh}
      onClone={onClone}
      // UI State - commit message
      commitMessage={uiState.commitMessage}
      setCommitMessage={uiState.setCommitMessage}
      // UI State - dropdowns
      isDropdownOpen={uiState.isDropdownOpen}
      setIsDropdownOpen={uiState.setIsDropdownOpen}
      isMainMenuOpen={uiState.isMainMenuOpen}
      setIsMainMenuOpen={uiState.setIsMainMenuOpen}
      // UI State - section expansion
      isStagedExpanded={uiState.isStagedExpanded}
      setIsStagedExpanded={uiState.setIsStagedExpanded}
      isChangesExpanded={uiState.isChangesExpanded}
      setIsChangesExpanded={uiState.setIsChangesExpanded}
      // Refs
      dropdownRef={uiState.dropdownRef}
      mainMenuRef={uiState.mainMenuRef}
      textareaRef={uiState.textareaRef}
      // Commit operations
      operationError={commitOps.operationError}
      clearOperationError={commitOps.clearOperationError}
      handleCommit={commitOps.handleCommit}
      handleCommitAndPush={commitOps.handleCommitAndPush}
      handleMenuCommit={commitOps.handleMenuCommit}
      handlePush={commitOps.handlePush}
      handlePull={commitOps.handlePull}
      // Discard operations
      discardConfirm={discardOps.discardConfirm}
      discardAllConfirm={discardOps.discardAllConfirm}
      handleDiscardRequest={discardOps.handleDiscardRequest}
      handleDiscardConfirm={discardOps.handleDiscardConfirm}
      handleDiscardAllRequest={discardOps.handleDiscardAllRequest}
      handleDiscardAllConfirm={discardOps.handleDiscardAllConfirm}
      cancelDiscard={discardOps.cancelDiscard}
      cancelDiscardAll={discardOps.cancelDiscardAll}
    />
  )
}
