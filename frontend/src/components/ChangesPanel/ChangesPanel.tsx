import { useCallback, useMemo } from 'react'
import { ChangesPanelView } from './ChangesPanelView'
import { ChangesPanelContainer } from './ChangesPanelContainer'
import {
  useChangesPanelState,
  useCommitOperations,
  useDiscardOperations,
} from './hooks'
import type { ChangesPanelProps, FileChange } from './types'

/**
 * Facade component that maintains backward compatibility.
 *
 * Usage modes:
 * 1. Internal mode (MainLayout): Pass minimal props, data fetched via hooks
 * 2. External mode (WorktreeTab): Pass all data and callbacks via props
 *
 * Mode is determined by whether `files` prop is provided.
 */
export function ChangesPanel({
  isCollapsed,
  onToggleCollapse,
  isReady = false,
  onClone,
  onSelectFile: onSelectFileCallback,
  // External mode props
  files: externalFiles,
  selectedIndex: externalSelectedIndex,
  onAccept: externalOnAccept,
  onUnstage: externalOnUnstage,
  onReject: externalOnReject,
  onAcceptAll: externalOnAcceptAll,
  onUnstageAll: externalOnUnstageAll,
  onRejectAll: externalOnRejectAll,
  onCommit: externalOnCommit,
  onPush: externalOnPush,
  onPull: externalOnPull,
  onFetch: externalOnFetch,
  onRefresh: externalOnRefresh,
  isGitRepo: externalIsGitRepo,
  branch: externalBranch,
  ahead: externalAhead,
  behind: externalBehind,
}: ChangesPanelProps): JSX.Element {
  // UI state layer (used in external mode)
  const uiState = useChangesPanelState()

  // Derived data - staged and unstaged files (for external mode)
  const stagedFiles = useMemo(
    () => (externalFiles ?? []).filter((f) => f.staged),
    [externalFiles]
  )
  const unstagedFiles = useMemo(
    () => (externalFiles ?? []).filter((f) => !f.staged),
    [externalFiles]
  )

  // Commit operations layer (for external mode)
  const commitOps = useCommitOperations({
    commitMessage: uiState.commitMessage,
    setCommitMessage: uiState.setCommitMessage,
    setIsDropdownOpen: uiState.setIsDropdownOpen,
    onCommit: externalOnCommit ?? (async () => {}),
    onPush: externalOnPush ?? (async () => {}),
    onPull: externalOnPull,
    stagedFilesCount: stagedFiles.length,
  })

  // Discard operations layer (for external mode)
  const discardOps = useDiscardOperations({
    unstagedFiles,
    onReject: externalOnReject ?? (() => {}),
    onRejectAll: externalOnRejectAll ?? (() => {}),
  })

  // Create file selection handler for external mode
  const handleSelectFile = useCallback(
    (index: number) => {
      if (externalFiles && onSelectFileCallback) {
        const file = externalFiles[index]
        if (file) {
          onSelectFileCallback(index, file.path)
        }
      }
    },
    [externalFiles, onSelectFileCallback]
  )

  // Stage all handler (for external mode)
  const handleStageAll = useCallback(() => {
    externalOnAcceptAll?.(unstagedFiles.map((file) => file.path))
  }, [unstagedFiles, externalOnAcceptAll])

  // Unstage all handler (for external mode)
  const handleUnstageAll = useCallback(() => {
    externalOnUnstageAll?.(stagedFiles.map((file) => file.path))
  }, [stagedFiles, externalOnUnstageAll])

  // External mode: all data provided via props
  if (externalFiles !== undefined) {
    return (
      <ChangesPanelView
        // Layout control
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        // Git repository state
        isGitRepo={externalIsGitRepo ?? true}
        branch={externalBranch ?? ''}
        ahead={externalAhead ?? 0}
        behind={externalBehind ?? 0}
        // File data
        files={externalFiles}
        selectedIndex={externalSelectedIndex ?? 0}
        onSelectFile={handleSelectFile}
        // Git operations - stage/unstage
        onAccept={externalOnAccept!}
        onUnstage={externalOnUnstage!}
        onAcceptAll={handleStageAll}
        onUnstageAll={handleUnstageAll}
        onFetch={externalOnFetch!}
        onRefresh={externalOnRefresh!}
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

  // Internal mode: use container with hooks
  return (
    <ChangesPanelContainer
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      isReady={isReady}
      onSelectFile={onSelectFileCallback}
      onClone={onClone}
    />
  )
}

export type { FileChange }
