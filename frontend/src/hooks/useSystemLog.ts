import { useCallback, useEffect, useState } from 'react'
import { EventsOn } from '../wailsjs/runtime/runtime'
import type { LogEntry, LogLevel } from '../components/SystemLogPanel/SystemLogPanel'

export interface UseSystemLogReturn {
  logs: LogEntry[]
  addLog: (level: LogLevel, message: string, details?: string) => void
  clearLogs: () => void
}

/**
 * Hook for managing system logs
 * Handles log entries and listens for system:log events from backend
 */
export function useSystemLog(isReady: boolean): UseSystemLogReturn {
  const [logs, setLogs] = useState<LogEntry[]>([])

  const addLog = useCallback((level: LogLevel, message: string, details?: string): void => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      timestamp: new Date(),
      level,
      message,
      details,
    }
    setLogs((prev) => [...prev, entry])
  }, [])

  const clearLogs = useCallback((): void => {
    setLogs([])
  }, [])

  // Listen for system log events
  useEffect(() => {
    if (!isReady) return

    const unsubscribe = EventsOn(
      'system:log',
      (data: { level: LogLevel; message: string; details?: string }) => {
        addLog(data.level, data.message, data.details)
      }
    )

    return () => {
      unsubscribe()
    }
  }, [isReady, addLog])

  return {
    logs,
    addLog,
    clearLogs,
  }
}
