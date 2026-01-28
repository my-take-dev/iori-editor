import { create } from 'zustand'
import type { ViewMode } from '../types/viewMode'

// ServerModeContext contains the context for opening the server mode modal
// All fields are required when provided - use null if no context is available
export interface ServerModeContext {
  sessionId: string
  baseBranch: string
  repoPath: string
}

interface UIState {
  // View mode
  viewMode: ViewMode

  // Modal states
  isNewSessionModalOpen: boolean
  isCloneModalOpen: boolean
  isWorktreeModeModalOpen: boolean
  isWorktreeCreateModalOpen: boolean
  isServerModeModalOpen: boolean

  // Worktree modal context
  worktreeModeTargetSessionId: string | null

  // Server mode context
  serverModeContext: ServerModeContext | null

  // Creating state
  isCreating: boolean

  // Actions
  setViewMode: (mode: ViewMode) => void
  openNewSessionModal: () => void
  closeNewSessionModal: () => void
  openCloneModal: () => void
  closeCloneModal: () => void
  openWorktreeModeModal: (sessionId: string) => void
  closeWorktreeModeModal: () => void
  openWorktreeCreateModal: () => void
  closeWorktreeCreateModal: () => void
  openServerModeModal: (context?: ServerModeContext) => void
  closeServerModeModal: () => void
  setIsCreating: (value: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  viewMode: 'diff',
  isNewSessionModalOpen: false,
  isCloneModalOpen: false,
  isWorktreeModeModalOpen: false,
  isWorktreeCreateModalOpen: false,
  isServerModeModalOpen: false,
  worktreeModeTargetSessionId: null,
  serverModeContext: null,
  isCreating: false,

  // Actions
  setViewMode: (mode) => set({ viewMode: mode }),

  openNewSessionModal: () => set({ isNewSessionModalOpen: true }),
  closeNewSessionModal: () => set({ isNewSessionModalOpen: false }),

  openCloneModal: () => set({ isCloneModalOpen: true }),
  closeCloneModal: () => set({ isCloneModalOpen: false }),

  openWorktreeModeModal: (sessionId) =>
    set({
      isWorktreeModeModalOpen: true,
      worktreeModeTargetSessionId: sessionId,
    }),
  closeWorktreeModeModal: () =>
    set({
      isWorktreeModeModalOpen: false,
    }),

  openWorktreeCreateModal: () => set({ isWorktreeCreateModalOpen: true }),
  closeWorktreeCreateModal: () => set({ isWorktreeCreateModalOpen: false }),

  openServerModeModal: (context) =>
    set({
      isServerModeModalOpen: true,
      serverModeContext: context ?? null,
    }),
  closeServerModeModal: () =>
    set({
      isServerModeModalOpen: false,
      serverModeContext: null,
    }),

  setIsCreating: (value) => set({ isCreating: value }),
}))

// Selectors
export const selectViewMode = (state: UIState) => state.viewMode
export const selectIsNewSessionModalOpen = (state: UIState) => state.isNewSessionModalOpen
export const selectIsCloneModalOpen = (state: UIState) => state.isCloneModalOpen
export const selectIsWorktreeModeModalOpen = (state: UIState) => state.isWorktreeModeModalOpen
export const selectIsWorktreeCreateModalOpen = (state: UIState) => state.isWorktreeCreateModalOpen
export const selectIsServerModeModalOpen = (state: UIState) => state.isServerModeModalOpen
export const selectWorktreeModeTargetSessionId = (state: UIState) => state.worktreeModeTargetSessionId
export const selectServerModeContext = (state: UIState) => state.serverModeContext
export const selectIsCreating = (state: UIState) => state.isCreating
