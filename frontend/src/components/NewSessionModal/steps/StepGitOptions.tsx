import { GitOptionsPanel } from '../GitOptionsPanel'
import type { StepGitOptionsProps } from '../types'

export function StepGitOptions({
  selectedPath,
  isGitRepo,
  currentBranch,
  branchCount,
  onUseCurrent,
  onSelectExisting,
  onCreateNew,
  onNoGit,
}: StepGitOptionsProps): JSX.Element {
  return (
    <GitOptionsPanel
      selectedPath={selectedPath}
      isGitRepo={isGitRepo}
      currentBranch={currentBranch}
      branchCount={branchCount}
      onUseCurrent={onUseCurrent}
      onSelectExisting={onSelectExisting}
      onCreateNew={onCreateNew}
      onNoGit={onNoGit}
    />
  )
}
