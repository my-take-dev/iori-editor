import { useEffect, useRef, useMemo } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import type { HistoryMetadata } from '../../stores/worktreeHistoryStore'
import { formatTimestamp } from '../../utils/formatters'
import { formatFileSize } from '../../utils/languageUtils'
import { CopyButton } from '../common'

interface HistoryViewerProps {
  // Streaming/pagination props
  historyData?: string
  historyMetadata?: HistoryMetadata | null
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
}

export function HistoryViewer({
  historyData,
  historyMetadata,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: HistoryViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  // Session info for header from historyMetadata
  const sessionInfo = useMemo(() => {
    if (!historyMetadata) return null
    return {
      name: historyMetadata.sessionName,
      startedAt: formatTimestamp(historyMetadata.startedAt),
      endedAt: historyMetadata.endedAt ? formatTimestamp(historyMetadata.endedAt) : 'Active',
      workDir: historyMetadata.workDir,
      fileSize: formatFileSize(historyMetadata.fileSize),
    }
  }, [historyMetadata])

  // Track last written data length for incremental updates
  const lastDataLengthRef = useRef<number>(0)

  // Track isLoadingMore in ref to avoid stale closure in scroll handler
  const isLoadingMoreRef = useRef(isLoadingMore)
  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore
  }, [isLoadingMore])

  // Initialize terminal - only when historyData exists and container is available
  useEffect(() => {
    // Don't initialize if no data (container won't be rendered due to early return)
    if (!historyData || !containerRef.current) {
      return
    }

    // Reset tracking when terminal is (re)created
    lastDataLengthRef.current = 0

    const term = new XTerm({
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#ffffff',
        cursorAccent: '#0d1117',
        selectionBackground: '#264f78',
        black: '#0d1117',
        red: '#f85149',
        green: '#56d364',
        yellow: '#e3b341',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#7ee787',
        brightYellow: '#eac54f',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#ffffff',
      },
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      cursorBlink: false,
      scrollback: 10000,
      convertEol: true,
      disableStdin: true, // Read-only
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)

    requestAnimationFrame(() => {
      fitAddon.fit()
    })

    terminalRef.current = term
    fitAddonRef.current = fitAddon

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        fitAddon.fit()
      })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      term.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [!!historyData]) // Re-run when historyData availability changes

  // Write history content to terminal - supports streaming updates
  useEffect(() => {
    if (!terminalRef.current) {
      return
    }

    const term = terminalRef.current
    const dataToWrite = historyData ?? ''

    if (!dataToWrite) {
      term.clear()
      lastDataLengthRef.current = 0
      return
    }

    // If this is a new history (reset), clear and write from start
    if (lastDataLengthRef.current === 0 || dataToWrite.length < lastDataLengthRef.current) {
      term.clear()
      term.write(dataToWrite)
      term.scrollToTop()
    } else if (dataToWrite.length > lastDataLengthRef.current) {
      // Append only new data
      const newData = dataToWrite.slice(lastDataLengthRef.current)
      term.write(newData)
    }

    lastDataLengthRef.current = dataToWrite.length
  }, [historyData])

  // Monitor scroll position for loading more data
  useEffect(() => {
    if (!terminalRef.current || !hasMore || !onLoadMore) return

    const term = terminalRef.current

    const handleScroll = () => {
      // Use ref to get current value, avoiding stale closure
      if (isLoadingMoreRef.current) return

      // Calculate scroll position (percentage from top)
      const buffer = term.buffer.active
      const viewportHeight = term.rows
      const totalLines = buffer.length
      const scrollTop = buffer.viewportY

      // Load more when scrolled to 90% or more
      const scrollPercent = (scrollTop + viewportHeight) / totalLines
      if (scrollPercent >= 0.9) {
        onLoadMore()
      }
    }

    // xterm.js scroll event
    const disposable = term.onScroll(handleScroll)

    return () => {
      disposable.dispose()
    }
  }, [hasMore, onLoadMore])

  // Show empty state if no data is available
  if (!historyData) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#808080] bg-[#0d1117]">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-[#3c3c3c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[14px]">Select a history to view</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden relative">
      {/* Header with session info */}
      {sessionInfo && (
        <div className="h-10 px-4 flex items-center justify-between bg-[#161b22] border-b border-[#30363d] flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-[12px] text-[#c9d1d9] font-medium">
              {sessionInfo.name}
            </span>
            <span className="text-[11px] text-[#8b949e]">
              {sessionInfo.startedAt} - {sessionInfo.endedAt}
            </span>
            {sessionInfo.workDir && (
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-[#6e7681] truncate max-w-[300px]" title={sessionInfo.workDir}>
                  {sessionInfo.workDir}
                </span>
                <CopyButton text={sessionInfo.workDir} size="xs" tooltip="作業ディレクトリをコピー" />
              </div>
            )}
          </div>
          <span className="text-[11px] text-[#8b949e]">
            {sessionInfo.fileSize}
          </span>
        </div>
      )}

      {/* Terminal display */}
      <div ref={containerRef} className="flex-1" />

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-[#21262d] px-3 py-1 rounded text-[11px] text-[#8b949e]">
          Loading more...
        </div>
      )}

      {/* Has more indicator */}
      {hasMore && !isLoadingMore && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-[#21262d] px-3 py-1 rounded text-[11px] text-[#8b949e] opacity-60">
          Scroll down to load more
        </div>
      )}
    </div>
  )
}
