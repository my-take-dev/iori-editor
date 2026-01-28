import { useNewSessionWizard } from '../../hooks/newSessionWizard'
import { StepFolderSelect } from './steps/StepFolderSelect'
import { StepGitOptions } from './steps/StepGitOptions'
import { StepDuplicateError } from './steps/StepDuplicateError'
import { StepBranchSelect } from './steps/StepBranchSelect'
import { StepNewBranchFlow } from './steps/StepNewBranchFlow'
import type { NewSessionModalProps } from './types'

// Re-export types for backward compatibility
export type { RecentFolder, BranchInfo, GitOption, PullResult } from './types'

export function NewSessionModal(props: NewSessionModalProps): JSX.Element | null {
  const { isOpen, onClose } = props
  const wizard = useNewSessionWizard(props)

  if (!isOpen) return null

  const stepData = wizard.getStepProps()

  function renderStep(): JSX.Element {
    switch (stepData.step) {
      case 'FOLDER_SELECT':
        return <StepFolderSelect {...stepData.props} />

      case 'GIT_OPTIONS':
        return <StepGitOptions {...stepData.props} />

      case 'DUPLICATE_ERROR':
        return <StepDuplicateError {...stepData.props} />

      case 'BRANCH_SELECT':
        return <StepBranchSelect {...stepData.props} />

      case 'BASE_BRANCH_SELECT':
      case 'PULL_CONFIRM':
      case 'NEW_BRANCH_INPUT':
        return <StepNewBranchFlow {...stepData.props} />

    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-[520px] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-[#3c3c3c] flex justify-between items-center bg-[#1e1e1e] rounded-t-lg">
          <h2 className="font-semibold text-[#cccccc] text-[14px]">新規セッション</h2>
          <button
            onClick={onClose}
            className="text-[#808080] hover:text-white transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {renderStep()}
        </div>
      </div>
    </div>
  )
}
