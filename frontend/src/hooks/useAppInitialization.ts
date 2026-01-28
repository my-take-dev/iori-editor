import { useEffect, useRef } from 'react'
import { useAIStatusStore, type AIStatus } from '../stores/aiStatusStore'
import {
  GetSessions,
  GetRecentFolders,
  GetWorktreeSessions,
  GetResourceUsage,
} from '../wailsjs/go/main/App'
import { EventsOn } from '../wailsjs/runtime/runtime'
import type { Session } from '../types/session'
import type { RecentFolder } from '../components/NewSessionModal/NewSessionModal'
import type { ResourceUsage } from '../components/SystemLogPanel/SystemLogPanel'

interface WorktreeSessionInfo {
  id: string
  branch: string
  status: AIStatus
}

export interface UseAppInitializationOptions {
  isReady: boolean
  sessions: Session[]
  setSessions: (sessions: Session[]) => void
  setRecentFolders: (folders: RecentFolder[]) => void
  setAllWorktreeSessionsMap: (map: Record<string, WorktreeSessionInfo[]>) => void
  setResourceUsage: (usage: ResourceUsage | undefined) => void
}

/**
 * Hook for app initialization effects
 * Handles session loading, recent folders, worktree sessions, resource usage polling, and AI status tracking
 */
export function useAppInitialization({
  isReady,
  sessions,
  setSessions,
  setRecentFolders,
  setAllWorktreeSessionsMap,
  setResourceUsage,
}: UseAppInitializationOptions): void {
  // AI Status Store
  const aiStatuses = useAIStatusStore((s) => s.statuses)
  const setAiWorking = useAIStatusStore((s) => s.setWorking)
  const setAiWaiting = useAIStatusStore((s) => s.setWaiting)

  // Ref to access aiStatuses without triggering re-renders (for worktree loading)
  const aiStatusesRef = useRef(aiStatuses)
  useEffect(() => {
    aiStatusesRef.current = aiStatuses
  }, [aiStatuses])

  // Load existing sessions on startup
  useEffect(() => {
    if (!isReady) return
    console.time('[Perf] GetSessions')
    GetSessions()
      .then((loadedSessions) => {
        console.timeEnd('[Perf] GetSessions')
        if (loadedSessions && loadedSessions.length > 0) {
          setSessions(loadedSessions)
        }
      })
      .catch((err) => {
        console.timeEnd('[Perf] GetSessions')
        console.error(err)
      })
  }, [isReady, setSessions])

  // Load recent folders on startup
  useEffect(() => {
    if (!isReady) return
    console.time('[Perf] GetRecentFolders')
    GetRecentFolders()
      .then((folders) => {
        console.timeEnd('[Perf] GetRecentFolders')
        setRecentFolders(folders || [])
      })
      .catch((err) => {
        console.timeEnd('[Perf] GetRecentFolders')
        console.error(err)
      })
  }, [isReady, setRecentFolders])

  // Load worktree sessions for all parent sessions
  // NOTE: Using aiStatusesRef instead of aiStatuses to avoid re-running on every AI status update (performance fix)
  useEffect(() => {
    if (!isReady || sessions.length === 0) return

    const loadAllWorktreeSessions = async () => {
      console.time('[Perf] loadAllWorktreeSessions total')
      const newMap: Record<string, WorktreeSessionInfo[]> = {}

      for (const session of sessions) {
        // Only check non-worktree sessions (parent sessions)
        if (!session.isWorktree) {
          try {
            console.time(`[Perf] GetWorktreeSessions ${session.id}`)
            const wtSessions = await GetWorktreeSessions(session.id)
            console.timeEnd(`[Perf] GetWorktreeSessions ${session.id}`)
            if (wtSessions && wtSessions.length > 0) {
              newMap[session.id] = wtSessions.map(wt => ({
                id: wt.id,
                branch: wt.branch || 'unknown',
                status: aiStatusesRef.current[wt.id] || 'idle'
              }))
            }
          } catch (err) {
            console.error(`Failed to load worktree sessions for session ${session.id}:`, err)
            // Continue with other sessions rather than failing completely
          }
        }
      }

      setAllWorktreeSessionsMap(newMap)
      console.timeEnd('[Perf] loadAllWorktreeSessions total')
    }

    loadAllWorktreeSessions()
  }, [isReady, sessions, setAllWorktreeSessionsMap])

  // Fetch resource usage periodically with adaptive polling
  useEffect(() => {
    if (!isReady) return

    let interval: ReturnType<typeof setInterval> | null = null

    const fetchResourceUsage = async () => {
      // Skip fetch when window is not visible
      if (document.visibilityState !== 'visible') return

      try {
        const usage = await GetResourceUsage()
        setResourceUsage(usage)
      } catch (err) {
        console.error('Failed to get resource usage:', err)
      }
    }

    const startPolling = (intervalMs: number) => {
      if (interval) clearInterval(interval)
      interval = setInterval(fetchResourceUsage, intervalMs)
    }

    const handleVisibilityChange = () => {
      // Active: 2s, Inactive: 10s
      const newInterval = document.visibilityState === 'visible' ? 2000 : 10000
      startPolling(newInterval)
      // Fetch immediately when becoming visible
      if (document.visibilityState === 'visible') {
        fetchResourceUsage()
      }
    }

    // Fetch immediately
    fetchResourceUsage()
    // Start with active interval
    startPolling(2000)

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isReady, setResourceUsage])

  // Track AI terminal activity to update status
  const aiActivityTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (!isReady) return

    const handleTerminalOutput = (event: { sessionId: string; terminalType: string; data: string }) => {
      if (event.terminalType === 'ai') {
        // AI terminal received output - set to working
        setAiWorking(event.sessionId)

        // Clear existing timeout for this session
        if (aiActivityTimeouts.current[event.sessionId]) {
          clearTimeout(aiActivityTimeouts.current[event.sessionId])
        }

        // Set to waiting after 500ms of inactivity
        aiActivityTimeouts.current[event.sessionId] = setTimeout(() => {
          setAiWaiting(event.sessionId)
        }, 500)
      }
    }

    const unsubscribe = EventsOn('terminal:output', handleTerminalOutput)

    return () => {
      unsubscribe()
      // Clear all timeouts
      Object.values(aiActivityTimeouts.current).forEach(clearTimeout)
    }
  }, [isReady, setAiWorking, setAiWaiting])
}
