import { BranchSelector } from '../BranchSelector'
import type { StepBranchSelectProps } from '../types'

export function StepBranchSelect({
  branches,
  selectedPath,
  selectedBranch,
  onSelect,
  onConfirm,
  onBack,
  isLoading,
}: StepBranchSelectProps): JSX.Element {
  return (
    <BranchSelector
      branches={branches}
      selectedPath={selectedPath}
      selectedBranch={selectedBranch}
      onSelect={onSelect}
      onConfirm={onConfirm}
      onBack={onBack}
      isLoading={isLoading}
    />
  )
}
