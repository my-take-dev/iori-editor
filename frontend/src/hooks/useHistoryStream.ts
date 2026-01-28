import { useCallback, useEffect, useRef, useState } from 'react'
import { EventsOn, EventsOff } from '../wailsjs/runtime/runtime'
import { StartHistoryStream, StopHistoryStream } from '../wailsjs/go/main/App'

// Event types from backend streaming
interface HistoryChunkEvent {
  requestId: string
  data: string
  startIndex: number
  endIndex: number
  hasMore: boolean
}

interface HistoryEndEvent {
  requestId: string
  totalEntries: number
  fileSize: number
}

interface HistoryErrorEvent {
  requestId: string
  error: string
}

// Generate unique request ID
const generateRequestId = () =>
  `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export interface UseHistoryStreamOptions {
  filename: string | null
  currentSessionId?: string
  onChunk: (data: string, endIndex: number, hasMore: boolean) => void
  onEnd: (fileSize: number) => void
  onError: (error: string) => void
  onStreamStart?: () => void
}

export interface UseHistoryStreamReturn {
  startStream: () => Promise<void>
  stopStream: () => void
  isStreaming: boolean
}

/**
 * Hook for managing history content streaming via Wails events
 * Handles event listener registration/cleanup in React lifecycle
 */
export function useHistoryStream({
  filename,
  currentSessionId,
  onChunk,
  onEnd,
  onError,
  onStreamStart,
}: UseHistoryStreamOptions): UseHistoryStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false)
  const requestIdRef = useRef<string | null>(null)

  // Cleanup function to stop stream and remove listeners
  const cleanup = useCallback(() => {
    if (requestIdRef.current) {
      StopHistoryStream(requestIdRef.current).catch(() => {})
    }
    EventsOff('history:chunk')
    EventsOff('history:end')
    EventsOff('history:error')
    requestIdRef.current = null
    setIsStreaming(false)
  }, [])

  // Stop stream manually
  const stopStream = useCallback(() => {
    cleanup()
  }, [cleanup])

  // Start streaming
  const startStream = useCallback(async () => {
    if (!filename) return

    // Stop any existing stream first
    cleanup()

    const requestId = generateRequestId()
    requestIdRef.current = requestId
    setIsStreaming(true)
    onStreamStart?.()

    // Set up event listeners
    const chunkHandler = (event: HistoryChunkEvent) => {
      if (event.requestId !== requestId) return
      onChunk(event.data, event.endIndex, event.hasMore)
    }

    const endHandler = (event: HistoryEndEvent) => {
      if (event.requestId !== requestId) return
      onEnd(event.fileSize)
      setIsStreaming(false)
      // Clean up listeners
      EventsOff('history:chunk')
      EventsOff('history:end')
      EventsOff('history:error')
      requestIdRef.current = null
    }

    const errorHandler = (event: HistoryErrorEvent) => {
      if (event.requestId !== requestId) return
      console.error('History streaming error:', event.error)
      onError(event.error)
      setIsStreaming(false)
      // Clean up listeners
      EventsOff('history:chunk')
      EventsOff('history:end')
      EventsOff('history:error')
      requestIdRef.current = null
    }

    EventsOn('history:chunk', chunkHandler)
    EventsOn('history:end', endHandler)
    EventsOn('history:error', errorHandler)

    try {
      await StartHistoryStream(requestId, filename, 0, currentSessionId || '')
    } catch (err) {
      console.error('Failed to start history stream:', err)
      onError(err instanceof Error ? err.message : 'Failed to start stream')
      cleanup()
    }
  }, [filename, currentSessionId, onChunk, onEnd, onError, onStreamStart, cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    startStream,
    stopStream,
    isStreaming,
  }
}
