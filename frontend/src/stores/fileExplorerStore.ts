import { create } from 'zustand'
import { getAncestorPaths } from '../utils/treeUtils'

interface FileExplorerState {
  expandedPaths: Set<string>
  loadedPaths: Set<string>
  loadingPaths: Set<string>

  // Actions
  toggleExpanded: (path: string) => void
  expandPath: (path: string) => void
  collapsePath: (path: string) => void
  expandToPath: (path: string) => void
  collapseAll: () => void

  // Lazy loading actions
  markPathAsLoaded: (path: string) => void
  setPathLoading: (path: string, loading: boolean) => void
  isPathLoaded: (path: string) => boolean
  isPathLoading: (path: string) => boolean
  clearLoadedPaths: () => void
}

export const useFileExplorerStore = create<FileExplorerState>((set, get) => ({
  expandedPaths: new Set<string>(),
  loadedPaths: new Set<string>(),
  loadingPaths: new Set<string>(),

  toggleExpanded: (path) =>
    set((state) => {
      const newSet = new Set(state.expandedPaths)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return { expandedPaths: newSet }
    }),

  expandPath: (path) =>
    set((state) => {
      const newSet = new Set(state.expandedPaths)
      newSet.add(path)
      return { expandedPaths: newSet }
    }),

  collapsePath: (path) =>
    set((state) => {
      const newSet = new Set(state.expandedPaths)
      newSet.delete(path)
      return { expandedPaths: newSet }
    }),

  expandToPath: (path) =>
    set((state) => {
      const ancestors = getAncestorPaths(path)
      const newSet = new Set(state.expandedPaths)
      ancestors.forEach((p) => newSet.add(p))
      return { expandedPaths: newSet }
    }),

  collapseAll: () => set({ expandedPaths: new Set() }),

  // Lazy loading actions
  markPathAsLoaded: (path) =>
    set((state) => {
      const newSet = new Set(state.loadedPaths)
      newSet.add(path)
      return { loadedPaths: newSet }
    }),

  setPathLoading: (path, loading) =>
    set((state) => {
      const newSet = new Set(state.loadingPaths)
      if (loading) {
        newSet.add(path)
      } else {
        newSet.delete(path)
      }
      return { loadingPaths: newSet }
    }),

  isPathLoaded: (path) => get().loadedPaths.has(path),

  isPathLoading: (path) => get().loadingPaths.has(path),

  clearLoadedPaths: () =>
    set({
      expandedPaths: new Set(),
      loadedPaths: new Set(),
      loadingPaths: new Set(),
    }),
}))
