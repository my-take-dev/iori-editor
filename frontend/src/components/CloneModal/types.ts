export type CloneStep = 'input' | 'cloning' | 'success' | 'error'

export interface CloneFlowState {
  step: CloneStep
  url: string
  destPath: string
  clonedPath: string
  error: string
}

export interface CloneFlowActions {
  setUrl: (url: string) => void
  setDestPath: (path: string) => void
  handleClone: () => Promise<void>
  handleSelectDestination: () => Promise<void>
  handleStartSession: () => void
  goBackToInput: () => void
  reset: () => void
}

export interface CloneFlowValidation {
  isValidUrl: (url: string) => boolean
  getRepoName: (url: string) => string
}

export type CloneFlow = CloneFlowState & CloneFlowActions & CloneFlowValidation
