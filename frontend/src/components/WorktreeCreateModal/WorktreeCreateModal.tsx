import type { WorktreeCreateModalProps } from './types'
import { useWorktreeCreateFlow } from './hooks/useWorktreeCreateFlow'
import {
  ModalHeader,
  TabSelector,
  BranchList,
  WorktreeNameInput,
  ExistingWorktreeList,
  PullConfirmDialog,
} from './components'

export function WorktreeCreateModal(props: WorktreeCreateModalProps): JSX.Element | null {
  const {
    isOpen,
    branches,
    onClose,
  } = props

  const { state, actions } = useWorktreeCreateFlow(props)

  if (!isOpen) {
    return null
  }

  function renderAlertModal(): JSX.Element | null {
    if (!state.alertMessage) return null

    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={actions.clearAlertMessage}
      >
        <div
          className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl p-5 max-w-[400px] animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3 mb-4">
            <span className="text-yellow-500 text-xl">⚠</span>
            <p className="text-[#cccccc] text-[13px] leading-relaxed">{state.alertMessage}</p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={actions.clearAlertMessage}
              className="py-2 px-4 bg-[#0e639c] hover:bg-[#1177bb] rounded text-white text-[13px] transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderContent(): JSX.Element {
    // Pull confirmation dialog
    if (state.showPullConfirm) {
      return (
        <PullConfirmDialog
          branchName={state.pendingBaseBranch}
          isRemote={state.baseBranchIsRemote}
          isPulling={state.isPulling}
          error={state.pullError}
          onPullAndContinue={actions.handlePullAndContinue}
          onSkipPull={actions.handleSkipPull}
          onCancel={actions.handleCancelPullConfirm}
        />
      )
    }

    // New worktree creation tab
    if (state.activeTab === 'new') {
      return (
        <div className="space-y-3">
          <BranchList
            branches={branches}
            selectedBranch={state.selectedBranch}
            onSelect={actions.setSelectedBranch}
          />
          <WorktreeNameInput
            customName={state.customName}
            effectiveCustomName={state.effectiveCustomName}
            selectedBranch={state.selectedBranch}
            isLoading={state.isLoading}
            disabled={!state.selectedBranch}
            onChange={actions.setCustomName}
            onSubmit={actions.handleRequestCreate}
          />
        </div>
      )
    }

    // Existing worktree selection tab
    return (
      <div className="space-y-3">
        <ExistingWorktreeList
          worktrees={state.selectableWorktrees}
          onSelect={actions.handleSelectExisting}
        />
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-[480px] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader onClose={onClose} />

        <TabSelector
          activeTab={state.activeTab}
          selectableCount={state.selectableWorktrees.length}
          onTabChange={actions.setActiveTab}
        />

        <div className="p-5">
          {renderContent()}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2 px-3 border border-[#3c3c3c] hover:bg-[#3c3c3c] rounded text-[#cccccc] text-[13px] transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>

      {renderAlertModal()}
    </div>
  )
}
