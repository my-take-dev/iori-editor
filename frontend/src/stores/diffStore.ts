import { create } from 'zustand'

interface DiffState {
  original: string
  modified: string
  filePath: string
  error: string | null
  setDiff: (original: string, modified: string, filePath: string) => void
  setError: (error: string | null) => void
  clearDiff: () => void
}

export const useDiffStore = create<DiffState>((set) => ({
  original: '',
  modified: '',
  filePath: '',
  error: null,
  setDiff: (original, modified, filePath) => set({ original, modified, filePath, error: null }),
  setError: (error) => set({ error }),
  clearDiff: () => set({ original: '', modified: '', filePath: '', error: null }),
}))

// Selectors
export const selectDiffOriginal = (state: DiffState): string => state.original
export const selectDiffModified = (state: DiffState): string => state.modified
export const selectDiffFilePath = (state: DiffState): string => state.filePath
export const selectDiffError = (state: DiffState): string | null => state.error
