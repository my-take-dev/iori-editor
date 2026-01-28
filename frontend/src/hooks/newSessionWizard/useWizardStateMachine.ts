import { useReducer, useCallback } from 'react'
import type { WizardState, WizardAction } from './types'

const initialState: WizardState = { step: 'FOLDER_SELECT' }

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SELECT_FOLDER':
      if (action.isDuplicate) {
        return { step: 'DUPLICATE_ERROR', folderPath: action.path }
      }
      return {
        step: 'GIT_OPTIONS',
        folderPath: action.path,
        isGitRepo: action.isGitRepo,
      }

    case 'GO_BACK':
      switch (state.step) {
        case 'GIT_OPTIONS':
        case 'DUPLICATE_ERROR':
          return { step: 'FOLDER_SELECT' }
        case 'BRANCH_SELECT':
          if ('folderPath' in state) {
            return { step: 'GIT_OPTIONS', folderPath: state.folderPath, isGitRepo: true }
          }
          return state
        case 'BASE_BRANCH_SELECT':
          if ('folderPath' in state) {
            return { step: 'GIT_OPTIONS', folderPath: state.folderPath, isGitRepo: true }
          }
          return state
        case 'PULL_CONFIRM':
          if ('folderPath' in state) {
            return { step: 'BASE_BRANCH_SELECT', folderPath: state.folderPath }
          }
          return state
        case 'NEW_BRANCH_INPUT':
          if ('folderPath' in state && 'baseBranch' in state) {
            // PULL_CONFIRMをスキップした場合はBASE_BRANCH_SELECTに戻る
            return { step: 'BASE_BRANCH_SELECT', folderPath: state.folderPath }
          }
          return state
        default:
          return state
      }

    case 'START_BRANCH_SELECT':
      if (state.step === 'GIT_OPTIONS' && 'folderPath' in state) {
        return { step: 'BRANCH_SELECT', folderPath: state.folderPath }
      }
      return state

    case 'START_NEW_BRANCH':
      if (state.step === 'GIT_OPTIONS' && 'folderPath' in state) {
        return { step: 'BASE_BRANCH_SELECT', folderPath: state.folderPath }
      }
      return state

    case 'SELECT_BASE_BRANCH':
      if (state.step === 'BASE_BRANCH_SELECT' && 'folderPath' in state) {
        if (action.hasPullSupport) {
          return {
            step: 'PULL_CONFIRM',
            folderPath: state.folderPath,
            baseBranch: action.branchName,
            isRemote: action.isRemote,
          }
        }
        return {
          step: 'NEW_BRANCH_INPUT',
          folderPath: state.folderPath,
          baseBranch: action.branchName,
        }
      }
      return state

    case 'CONFIRM_PULL':
    case 'SKIP_PULL':
      if (state.step === 'PULL_CONFIRM' && 'folderPath' in state && 'baseBranch' in state) {
        return {
          step: 'NEW_BRANCH_INPUT',
          folderPath: state.folderPath,
          baseBranch: state.baseBranch,
        }
      }
      return state

    case 'RESET':
      return initialState

    default:
      return state
  }
}

export interface UseWizardStateMachineReturn {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
  reset: () => void
  goBack: () => void
}

export function useWizardStateMachine(): UseWizardStateMachineReturn {
  const [state, dispatch] = useReducer(wizardReducer, initialState)

  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])
  const goBack = useCallback(() => dispatch({ type: 'GO_BACK' }), [])

  return { state, dispatch, reset, goBack }
}
