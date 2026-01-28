import { create } from 'zustand'
import { server } from '../../wailsjs/go/models'

// ServerState represents the server mode state
// Note: isLoading and error are mutually exclusive in normal operation:
// - When isLoading transitions to true, error should be cleared
// - When error is set, isLoading should be false
interface ServerState {
  // Server status
  status: server.ServerStatus | null
  isLoading: boolean
  error: string | null

  // Config form state
  config: server.Config | null

  // QR code
  qrCode: string | null

  // Actions
  setStatus: (status: server.ServerStatus | null) => void
  setConfig: (config: server.Config | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  updateConfig: (partial: Partial<server.Config>) => boolean
  setQRCode: (qrCode: string | null) => void
  reset: () => void
}

const initialState = {
  status: null,
  isLoading: false,
  error: null,
  config: null,
  qrCode: null,
}

export const useServerStore = create<ServerState>((set, get) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setConfig: (config) => set({ config }),
  // Clear error when loading starts to prevent contradictory state
  setLoading: (isLoading) => set({ isLoading, ...(isLoading ? { error: null } : {}) }),
  // Ensure isLoading is false when error is set
  setError: (error) => set({ error, ...(error ? { isLoading: false } : {}) }),

  updateConfig: (partial) => {
    const current = get().config
    if (!current) {
      console.warn('Cannot update config: no config loaded')
      set({ error: '設定が読み込まれていません' })
      return false
    }
    // Use Config constructor to ensure proper type instance
    set({
      config: new server.Config({
        ...current,
        ...partial,
      }),
    })
    return true
  },

  setQRCode: (qrCode) => set({ qrCode }),

  reset: () => set(initialState),
}))

// Selectors for state values
export const selectServerStatus = (state: ServerState) => state.status
export const selectServerConfig = (state: ServerState) => state.config
export const selectServerLoading = (state: ServerState) => state.isLoading
export const selectServerError = (state: ServerState) => state.error
export const selectIsServerRunning = (state: ServerState) => state.status?.running ?? false
export const selectQRCode = (state: ServerState) => state.qrCode

// Selectors for actions - these return stable references to prevent unnecessary re-renders
export const selectSetStatus = (state: ServerState) => state.setStatus
export const selectSetConfig = (state: ServerState) => state.setConfig
export const selectSetLoading = (state: ServerState) => state.setLoading
export const selectSetError = (state: ServerState) => state.setError
export const selectSetQRCode = (state: ServerState) => state.setQRCode
export const selectReset = (state: ServerState) => state.reset
