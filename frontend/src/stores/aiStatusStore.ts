import { create } from 'zustand'
import { useCallback } from 'react'

export type AIStatus = 'idle' | 'waiting' | 'working'

interface AIStatusState {
  statuses: Record<string, AIStatus>

  // Actions
  setStatus: (sessionId: string, status: AIStatus) => void
  setWorking: (sessionId: string) => void
  setWaiting: (sessionId: string) => void
  setIdle: (sessionId: string) => void
  clearStatus: (sessionId: string) => void
  getAllStatuses: () => Record<string, AIStatus>
}

export const useAIStatusStore = create<AIStatusState>((set, get) => ({
  statuses: {},

  setStatus: (sessionId, status) =>
    set((state) => ({
      statuses: { ...state.statuses, [sessionId]: status },
    })),

  setWorking: (sessionId) =>
    set((state) => ({
      statuses: { ...state.statuses, [sessionId]: 'working' },
    })),

  setWaiting: (sessionId) =>
    set((state) => ({
      statuses: { ...state.statuses, [sessionId]: 'waiting' },
    })),

  setIdle: (sessionId) =>
    set((state) => ({
      statuses: { ...state.statuses, [sessionId]: 'idle' },
    })),

  clearStatus: (sessionId) =>
    set((state) => {
      const { [sessionId]: _, ...rest } = state.statuses
      return { statuses: rest }
    }),

  getAllStatuses: () => get().statuses,
}))

// Individual session selector hook - only re-renders when THIS session's status changes
export function useAIStatus(sessionId: string): AIStatus {
  return useAIStatusStore(
    useCallback((state) => state.statuses[sessionId] || 'idle', [sessionId])
  )
}

// Selector for all statuses (use sparingly - causes re-render on any status change)
export const selectAllStatuses = (state: AIStatusState) => state.statuses
