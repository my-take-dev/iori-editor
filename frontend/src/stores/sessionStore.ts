import { create } from 'zustand'
import type { Session } from '../types/session'

interface SessionState {
  sessions: Session[]
  activeSessionId: string | null
  isLoading: boolean
  error: string | null

  // Actions
  setSessions: (sessions: Session[]) => void
  addSession: (session: Session) => void
  removeSession: (sessionId: string) => void
  setActiveSession: (sessionId: string) => void
  updateSessionBranch: (sessionId: string, branch: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSessionId: null,
  isLoading: false,
  error: null,

  setSessions: (sessions) =>
    set(() => ({
      sessions,
      activeSessionId: sessions.find((s) => s.isActive)?.id || null,
    })),

  addSession: (session) =>
    set((state) => ({
      sessions: [...state.sessions, session],
      activeSessionId: session.isActive ? session.id : state.activeSessionId,
    })),

  removeSession: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== sessionId),
      activeSessionId:
        state.activeSessionId === sessionId ? null : state.activeSessionId,
    })),

  updateSessionBranch: (sessionId, branch) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, branch } : s
      ),
    })),

  setActiveSession: (sessionId) =>
    set(() => ({
      activeSessionId: sessionId,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}))

// Selectors
export const selectActiveSession = (state: SessionState) =>
  state.sessions.find((s) => s.id === state.activeSessionId)

export const selectSessions = (state: SessionState) => state.sessions
