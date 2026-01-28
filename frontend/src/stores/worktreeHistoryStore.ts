import { create } from 'zustand'
import type { HistoryInfo } from '../types/history'
import {
  GetHistoryList,
  DeleteHistory,
  FlushCurrentHistory,
  GetHistoryChunk,
} from '../wailsjs/go/main/App'

// Default chunk size for pagination (legacy)
const DEFAULT_CHUNK_SIZE = 500

// Metadata for displaying session info
export interface HistoryMetadata {
  sessionName: string
  startedAt: string
  endedAt?: string
  workDir: string
  fileSize: number  // File size in bytes
}

interface WorktreeHistoryState {
  // State
  histories: HistoryInfo[]
  selectedFilename: string | null
  isLoading: boolean

  // Streaming data state
  historyData: string
  historyMetadata: HistoryMetadata | null
  currentOffset: number
  hasMore: boolean
  isLoadingMore: boolean

  // Streaming state
  isStreaming: boolean

  // Actions - List management
  loadHistoryList: () => Promise<void>
  handleHistoryTabClick: (activeSessionId?: string) => Promise<void>
  handleHistorySelect: (filename: string, activeSessionId?: string) => Promise<void>
  handleHistoryDelete: (filename: string) => Promise<void>

  // Actions - Content loading (non-streaming)
  loadHistoryContent: (filename: string, currentSessionId?: string) => Promise<void>
  loadMoreHistory: (activeSessionId?: string) => Promise<void>

  // Actions - Streaming state updates (called from useHistoryStream hook)
  prepareForStreaming: (filename: string) => void
  appendHistoryData: (data: string, endIndex: number, hasMore: boolean) => void
  completeStreaming: (fileSize: number) => void
  setStreamError: () => void
  setStreamingState: (isStreaming: boolean) => void

  // Actions - Cleanup
  clearSelection: () => void
}

export const useWorktreeHistoryStore = create<WorktreeHistoryState>((set, get) => ({
  // Initial state
  histories: [],
  selectedFilename: null,
  isLoading: false,
  historyData: '',
  historyMetadata: null,
  currentOffset: 0,
  hasMore: false,
  isLoadingMore: false,
  isStreaming: false,

  loadHistoryList: async () => {
    set({ isLoading: true })
    try {
      const list = await GetHistoryList()
      set({ histories: list || [] })
    } catch (err) {
      console.error('Failed to load history list:', err)
      set({ histories: [] })
    } finally {
      set({ isLoading: false })
    }
  },

  loadHistoryContent: async (filename: string, currentSessionId?: string) => {
    set({ isLoading: true })
    try {
      // Get HistoryInfo from the already loaded histories list
      const histories = get().histories
      const selectedHistory = histories.find(h => h.filename === filename)

      // Load initial chunk for streaming display
      const chunk = await GetHistoryChunk(filename, 0, DEFAULT_CHUNK_SIZE, currentSessionId || '')

      // Get metadata from HistoryInfo (not from chunk)
      const metadata: HistoryMetadata | null = selectedHistory
        ? {
            sessionName: selectedHistory.sessionName,
            startedAt: selectedHistory.startedAt,
            endedAt: selectedHistory.endedAt,
            workDir: selectedHistory.workDir,
            fileSize: chunk.fileSize,
          }
        : null

      set({
        historyData: chunk.data,
        currentOffset: chunk.endIndex,
        hasMore: chunk.hasMore,
        selectedFilename: filename,
        historyMetadata: metadata,
      })
    } catch (err) {
      console.error('Failed to load history content:', err)
      set({
        historyData: '',
        historyMetadata: null,
        selectedFilename: null,
      })
    } finally {
      set({ isLoading: false })
    }
  },

  // Prepare state for streaming (called before starting stream)
  prepareForStreaming: (filename: string) => {
    const histories = get().histories
    const selectedHistory = histories.find(h => h.filename === filename)

    const metadata: HistoryMetadata | null = selectedHistory
      ? {
          sessionName: selectedHistory.sessionName,
          startedAt: selectedHistory.startedAt,
          endedAt: selectedHistory.endedAt,
          workDir: selectedHistory.workDir,
          fileSize: 0, // Will be updated from end event
        }
      : null

    set({
      historyData: '',
      currentOffset: 0,
      hasMore: true,
      selectedFilename: filename,
      historyMetadata: metadata,
      isLoading: true,
      isStreaming: true,
    })
  },

  // Append chunk data from streaming
  appendHistoryData: (data: string, endIndex: number, hasMore: boolean) => {
    set((state) => ({
      historyData: state.historyData + data,
      currentOffset: endIndex,
      hasMore: hasMore,
      isLoading: false, // First chunk received, no longer "loading"
    }))
  },

  // Mark streaming as complete
  completeStreaming: (fileSize: number) => {
    set((state) => ({
      isStreaming: false,
      hasMore: false,
      historyMetadata: state.historyMetadata
        ? { ...state.historyMetadata, fileSize: fileSize }
        : null,
    }))
  },

  // Handle stream error
  setStreamError: () => {
    set({
      isLoading: false,
      isStreaming: false,
    })
  },

  // Update streaming state flag
  setStreamingState: (isStreaming: boolean) => {
    set({ isStreaming })
  },

  loadMoreHistory: async (activeSessionId?: string) => {
    const { selectedFilename, hasMore, isLoadingMore, currentOffset } = get()
    if (!selectedFilename || !hasMore || isLoadingMore) return

    set({ isLoadingMore: true })
    try {
      const chunk = await GetHistoryChunk(
        selectedFilename,
        currentOffset,
        DEFAULT_CHUNK_SIZE,
        activeSessionId || ''
      )
      set((state) => ({
        historyData: state.historyData + chunk.data,
        currentOffset: chunk.endIndex,
        hasMore: chunk.hasMore,
      }))
    } catch (err) {
      console.error('Failed to load more history:', err)
    } finally {
      set({ isLoadingMore: false })
    }
  },

  handleHistoryTabClick: async (activeSessionId?: string) => {
    set({ isLoading: true })
    try {
      if (activeSessionId) {
        // Flush current session history first
        await FlushCurrentHistory(activeSessionId)
      }

      // Load updated history list
      const list: HistoryInfo[] = await GetHistoryList()
      set({ histories: list || [] })

      const { selectedFilename } = get()
      const hasSelected = !!selectedFilename && list?.some((h: HistoryInfo) => h.filename === selectedFilename)

      if (!hasSelected && (!list || list.length === 0)) {
        set({
          selectedFilename: null,
          historyData: '',
          historyMetadata: null,
          currentOffset: 0,
          hasMore: false,
        })
      }
    } catch (err) {
      console.error('Failed to handle history tab click:', err)
      const list = await GetHistoryList()
      set({ histories: list || [] })

      const { selectedFilename } = get()
      const hasSelected = !!selectedFilename && list?.some((h: HistoryInfo) => h.filename === selectedFilename)
      if (!hasSelected && (!list || list.length === 0)) {
        set({
          selectedFilename: null,
          historyData: '',
          historyMetadata: null,
          currentOffset: 0,
          hasMore: false,
        })
      }
    } finally {
      set({ isLoading: false })
    }
  },

  handleHistorySelect: async (filename: string, activeSessionId?: string) => {
    await get().loadHistoryContent(filename, activeSessionId)
  },

  handleHistoryDelete: async (filename: string) => {
    const { selectedFilename, loadHistoryList } = get()
    try {
      await DeleteHistory(filename)
      if (selectedFilename === filename) {
        set({
          selectedFilename: null,
          historyData: '',
          historyMetadata: null,
          currentOffset: 0,
          hasMore: false,
        })
      }
      await loadHistoryList()
    } catch (err) {
      console.error('Failed to delete history:', err)
    }
  },

  clearSelection: () => {
    set({
      selectedFilename: null,
      historyData: '',
      historyMetadata: null,
      currentOffset: 0,
      hasMore: false,
      isStreaming: false,
    })
  },
}))

// Selectors
export const selectHistories = (state: WorktreeHistoryState) => state.histories
export const selectSelectedFilename = (state: WorktreeHistoryState) => state.selectedFilename
export const selectIsLoadingHistories = (state: WorktreeHistoryState) => state.isLoading
export const selectHistoryData = (state: WorktreeHistoryState) => state.historyData
export const selectHistoryMetadata = (state: WorktreeHistoryState) => state.historyMetadata
export const selectHasMoreHistory = (state: WorktreeHistoryState) => state.hasMore
export const selectIsLoadingMoreHistory = (state: WorktreeHistoryState) => state.isLoadingMore
export const selectIsStreaming = (state: WorktreeHistoryState) => state.isStreaming
