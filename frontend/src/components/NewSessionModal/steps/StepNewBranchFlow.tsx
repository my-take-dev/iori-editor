import { BaseBranchSelector } from '../BaseBranchSelector'
import { PullConfirmDialog } from '../PullConfirmDialog'
import { NewBranchForm } from '../NewBranchForm'
import type { StepNewBranchFlowProps } from '../types'

export function StepNewBranchFlow({
  subStep,
  // Base branch select
  branches,
  onSelectBaseBranch,
  onBackFromBaseBranch,
  // Pull confirm
  baseBranch,
  baseBranchIsRemote,
  isPulling,
  pullError,
  onPull,
  onSkip,
  onBackFromPullConfirm,
  // Name input
  newBranchName,
  onNameChange,
  onCreate,
  onBackFromNameInput,
  isLoading,
}: StepNewBranchFlowProps): JSX.Element {
  switch (subStep) {
    case 'BASE_SELECT':
      return (
        <BaseBranchSelector
          branches={branches}
          onSelect={onSelectBaseBranch}
          onBack={onBackFromBaseBranch}
        />
      )

    case 'PULL_CONFIRM':
      return (
        <PullConfirmDialog
          baseBranch={baseBranch}
          baseBranchIsRemote={baseBranchIsRemote}
          isPulling={isPulling}
          pullError={pullError}
          onPull={onPull}
          onSkip={onSkip}
          onBack={onBackFromPullConfirm}
        />
      )

    case 'NAME_INPUT':
      return (
        <NewBranchForm
          baseBranch={baseBranch}
          newBranchName={newBranchName}
          onNameChange={onNameChange}
          onCreate={onCreate}
          onBack={onBackFromNameInput}
          isLoading={isLoading}
        />
      )
  }
}
