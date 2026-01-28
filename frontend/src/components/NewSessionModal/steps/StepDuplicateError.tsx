import { DuplicatePathError } from '../DuplicatePathError'
import type { StepDuplicateErrorProps } from '../types'

export function StepDuplicateError({
  selectedPath,
  onSelectDifferent,
}: StepDuplicateErrorProps): JSX.Element {
  return (
    <DuplicatePathError
      selectedPath={selectedPath}
      onSelectDifferent={onSelectDifferent}
    />
  )
}
