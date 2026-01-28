import { useMemo, useCallback, useState } from 'react'
import type { ChangesPanelViewProps, FileChange } from './types'
import { ChangesPanelHeader, CommitSection, ChangeList } from './components'
import { TemplateManagerModal } from './components/TemplateManagerModal'
import { DiscardConfirmDialog, DiscardAllDialog } from './dialogs'

/**
 * Pure presentational component for ChangesPanel.
 * All data and handlers are received via props - no data fetching or business logic.
 * This component only handles:
 * - Rendering UI based on props
 * - Template manager modal state (local UI-only state)
 * - Derived data (staged/unstaged files, pathToIndex)
 */
export function ChangesPanelView({
  // Layout control
  isCollapsed,
  onToggleCollapse,
  // Git repository state
  isGitRepo,
  branch,
  ahead,
  behind,
  // File data
  files,
  selectedIndex,
  onSelectFile,
  // Git operations - stage/unstage
  onAccept,
  onUnstage,
  onAcceptAll,
  onUnstageAll,
  onFetch,
  onRefresh,
  onClone,
  // UI State - commit message
  commitMessage,
  setCommitMessage,
  // UI State - dropdowns
  isDropdownOpen,
  setIsDropdownOpen,
  isMainMenuOpen,
  setIsMainMenuOpen,
  // UI State - section expansion
  isStagedExpanded,
  setIsStagedExpanded,
  isChangesExpanded,
  setIsChangesExpanded,
  // Refs
  dropdownRef,
  mainMenuRef,
  textareaRef,
  // Commit operations
  operationError,
  clearOperationError,
  handleCommit,
  handleCommitAndPush,
  handleMenuCommit,
  handlePush,
  handlePull,
  // Discard operations
  discardConfirm,
  discardAllConfirm,
  handleDiscardRequest,
  handleDiscardConfirm,
  handleDiscardAllRequest,
  handleDiscardAllConfirm,
  cancelDiscard,
  cancelDiscardAll,
}: ChangesPanelViewProps): JSX.Element {
  // Template manager modal state (local UI state - stays in View)
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false)

  // Template handlers
  const handleSelectTemplate = useCallback(
    (content: string) => {
      setCommitMessage(content)
    },
    [setCommitMessage]
  )

  const handleOpenTemplateManager = useCallback(() => {
    setIsTemplateManagerOpen(true)
  }, [])

  const handleCloseTemplateManager = useCallback(() => {
    setIsTemplateManagerOpen(false)
  }, [])

  // Separate staged and unstaged files (memoized)
  const stagedFiles = useMemo(() => files.filter((f) => f.staged), [files])
  const unstagedFiles = useMemo(() => files.filter((f) => !f.staged), [files])

  // Path to index mapping for O(1) lookup
  const pathToIndex = useMemo(() => {
    const map = new Map<string, number>()
    files.forEach((f, i) => map.set(f.path, i))
    return map
  }, [files])

  return (
    <div className="flex flex-col h-full bg-[#181818] border-l border-[#3c3c3c] contain-panel">
      <ChangesPanelHeader
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        isGitRepo={isGitRepo}
        isMainMenuOpen={isMainMenuOpen}
        onToggleMainMenu={() => setIsMainMenuOpen(!isMainMenuOpen)}
        onRefresh={onRefresh}
        mainMenuRef={mainMenuRef}
        onPull={handlePull}
        onPush={handlePush}
        onClone={onClone}
        onFetch={onFetch}
        onCommit={handleMenuCommit}
        commitDisabled={!commitMessage.trim() || stagedFiles.length === 0}
      />

      {!isCollapsed && (
        <>
          {operationError && (
            <div className="mx-2 mt-2 p-2 bg-[#5a1d1d] border border-[#f14c4c] rounded text-[#f14c4c] text-[12px] flex items-start gap-2">
              <span className="flex-1">{operationError}</span>
              <button
                onClick={clearOperationError}
                className="text-[#f14c4c] hover:text-white flex-shrink-0"
                title="閉じる"
              >
                ✕
              </button>
            </div>
          )}

          {!isGitRepo ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-[#808080] text-center text-[13px]">
                このフォルダーにはアクティブなソース管理プロバイダーがありません。
              </div>
            </div>
          ) : (
            <>
              <CommitSection
                branch={branch}
                ahead={ahead}
                behind={behind}
                commitMessage={commitMessage}
                onCommitMessageChange={setCommitMessage}
                onCommit={handleCommit}
                onCommitAndPush={handleCommitAndPush}
                onPush={handlePush}
                onPull={handlePull}
                isDropdownOpen={isDropdownOpen}
                onToggleDropdown={() => setIsDropdownOpen(!isDropdownOpen)}
                dropdownRef={dropdownRef}
                textareaRef={textareaRef}
                stagedFilesCount={stagedFiles.length}
                onSelectTemplate={handleSelectTemplate}
                onOpenTemplateManager={handleOpenTemplateManager}
              />

              <ChangeList
                stagedFiles={stagedFiles}
                unstagedFiles={unstagedFiles}
                selectedIndex={selectedIndex}
                pathToIndex={pathToIndex}
                isStagedExpanded={isStagedExpanded}
                isChangesExpanded={isChangesExpanded}
                onToggleStagedExpanded={() => setIsStagedExpanded(!isStagedExpanded)}
                onToggleChangesExpanded={() => setIsChangesExpanded(!isChangesExpanded)}
                onSelectFile={onSelectFile}
                onAccept={onAccept}
                onUnstage={onUnstage}
                onDiscardRequest={handleDiscardRequest}
                onUnstageAllFiles={onUnstageAll}
                onStageAll={onAcceptAll}
                onDiscardAllRequest={handleDiscardAllRequest}
              />
            </>
          )}
        </>
      )}

      {discardConfirm && (
        <DiscardConfirmDialog
          fileName={discardConfirm.fileName}
          onConfirm={handleDiscardConfirm}
          onCancel={cancelDiscard}
        />
      )}

      {discardAllConfirm && (
        <DiscardAllDialog
          fileCount={unstagedFiles.length}
          onConfirm={handleDiscardAllConfirm}
          onCancel={cancelDiscardAll}
        />
      )}

      {isTemplateManagerOpen && <TemplateManagerModal onClose={handleCloseTemplateManager} />}
    </div>
  )
}

export type { FileChange }
