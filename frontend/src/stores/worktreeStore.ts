import { create } from 'zustand'
import type { Session } from '../types/session'

interface WorktreeState {
  // Which session is in worktree mode (null if none)
  worktreeModeSessionId: string | null

  // Worktree sessions for the active worktree mode session
  worktreeSessions: Session[]

  // Active worktree session within worktree mode
  activeWorktreeSessionId: string | null

  // Actions
  enterWorktreeMode: (sessionId: string) => void
  exitWorktreeMode: () => void
  setWorktreeSessions: (sessions: Session[]) => void
  addWorktreeSession: (session: Session) => void
  removeWorktreeSession: (sessionId: string) => void
  setActiveWorktreeSession: (sessionId: string | null) => void
  updateWorktreeSessionBranch: (sessionId: string, branch: string) => void
}

export const useWorktreeStore = create<WorktreeState>((set) => ({
  worktreeModeSessionId: null,
  worktreeSessions: [],
  activeWorktreeSessionId: null,

  enterWorktreeMode: (sessionId) =>
    set({
      worktreeModeSessionId: sessionId,
      worktreeSessions: [],
      activeWorktreeSessionId: null,
    }),

  exitWorktreeMode: () =>
    set({
      worktreeModeSessionId: null,
      worktreeSessions: [],
      activeWorktreeSessionId: null,
    }),

  setWorktreeSessions: (sessions) =>
    set((state) => ({
      worktreeSessions: sessions,
      activeWorktreeSessionId:
        sessions.length > 0
          ? state.activeWorktreeSessionId &&
            sessions.find((s) => s.id === state.activeWorktreeSessionId)
            ? state.activeWorktreeSessionId
            : sessions[0].id
          : null,
    })),

  addWorktreeSession: (session) =>
    set((state) => ({
      worktreeSessions: [...state.worktreeSessions, session],
      activeWorktreeSessionId: session.id,
    })),

  removeWorktreeSession: (sessionId) =>
    set((state) => {
      const newSessions = state.worktreeSessions.filter(
        (s) => s.id !== sessionId
      )
      return {
        worktreeSessions: newSessions,
        activeWorktreeSessionId:
          state.activeWorktreeSessionId === sessionId
            ? newSessions.length > 0
              ? newSessions[0].id
              : null
            : state.activeWorktreeSessionId,
      }
    }),

  setActiveWorktreeSession: (sessionId) =>
    set({
      activeWorktreeSessionId: sessionId,
    }),

  updateWorktreeSessionBranch: (sessionId, branch) =>
    set((state) => ({
      worktreeSessions: state.worktreeSessions.map((s) =>
        s.id === sessionId ? { ...s, branch } : s
      ),
    })),
}))

// Selectors
export const selectWorktreeModeSessionId = (state: WorktreeState) =>
  state.worktreeModeSessionId

export const selectWorktreeSessions = (state: WorktreeState) =>
  state.worktreeSessions

export const selectActiveWorktreeSession = (state: WorktreeState) =>
  state.activeWorktreeSessionId

export const selectActiveWorktreeSessionObject = (state: WorktreeState) =>
  state.worktreeSessions.find((s) => s.id === state.activeWorktreeSessionId)

export const selectIsWorktreeMode = (state: WorktreeState) =>
  state.worktreeModeSessionId !== null
