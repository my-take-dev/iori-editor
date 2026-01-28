import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { FixedSizeList as List, ListChildComponentProps, ListOnScrollProps } from 'react-window'
import { formatTime, formatTimestamp } from '../../utils/formatters'
import { CopyButton } from '../common'
import { IconChevronUp, IconChevronDown, IconDelete, IconTerminal } from '../Icons'

export type LogLevel = 'info' | 'success' | 'warning' | 'error'

export interface LogEntry {
  id: string
  timestamp: Date
  level: LogLevel
  message: string
  details?: string
}

export interface ResourceUsage {
  cpuPercent: number
  memoryMB: number
  memoryPercent: number
}

interface SystemLogPanelProps {
  logs: LogEntry[]
  onClear: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  height: number
  resourceUsage?: ResourceUsage
}

const levelColors: Record<LogLevel, string> = {
  info: 'text-[#3794ff]',
  success: 'text-[#4ec9b0]',
  warning: 'text-[#cca700]',
  error: 'text-[#f14c4c]',
}

const levelBgColors: Record<LogLevel, string> = {
  info: 'bg-[#3794ff]/10',
  success: 'bg-[#4ec9b0]/10',
  warning: 'bg-[#cca700]/10',
  error: 'bg-[#f14c4c]/10',
}

const levelLabels: Record<LogLevel, string> = {
  info: 'INFO',
  success: 'OK',
  warning: 'WARN',
  error: 'ERR',
}

const ITEM_SIZE = 22

interface LogRowData {
  logs: LogEntry[]
  levelColors: Record<LogLevel, string>
  levelBgColors: Record<LogLevel, string>
  levelLabels: Record<LogLevel, string>
}

const LogRow = ({ index, style, data }: ListChildComponentProps<LogRowData>) => {
  const log = data.logs[index]
  return (
    <div
      style={style}
      className={`px-3 hover:bg-[#2a2d2e] flex items-center gap-2 ${data.levelBgColors[log.level]}`}
    >
      <span className="text-[#808080] flex-shrink-0 w-[60px]">
        {formatTime(log.timestamp)}
      </span>
      <span
        className={`flex-shrink-0 w-[36px] text-[10px] font-bold ${data.levelColors[log.level]}`}
      >
        [{data.levelLabels[log.level]}]
      </span>
      <span className="text-[#cccccc] flex-1 truncate">
        {log.message}
        {log.details && (
          <span className="text-[#808080] ml-2">{log.details}</span>
        )}
      </span>
    </div>
  )
}

export function SystemLogPanel({
  logs,
  onClear,
  isCollapsed,
  onToggleCollapse,
  height,
  resourceUsage,
}: SystemLogPanelProps) {
  const listRef = useRef<List<LogRowData>>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  const listHeight = height - 28 // ヘッダー分を引く

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && listRef.current && logs.length > 0) {
      listRef.current.scrollToItem(logs.length - 1, 'end')
    }
  }, [logs.length, autoScroll])

  // Detect manual scroll to disable auto-scroll
  const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }: ListOnScrollProps) => {
    if (scrollUpdateWasRequested) return // プログラムによるスクロールは無視
    const totalHeight = logs.length * ITEM_SIZE
    const isAtBottom = totalHeight - scrollOffset - listHeight < ITEM_SIZE
    setAutoScroll(isAtBottom)
  }, [logs.length, listHeight])

  const errorCount = logs.filter((l) => l.level === 'error').length
  const warningCount = logs.filter((l) => l.level === 'warning').length

  // Format all logs as text for copying
  const logsAsText = useMemo(() => {
    return logs.map(log => {
      const time = formatTimestamp(log.timestamp)
      const level = levelLabels[log.level].padEnd(4)
      const details = log.details ? ` ${log.details}` : ''
      return `[${time}] [${level}] ${log.message}${details}`
    }).join('\n')
  }, [logs])

  const itemData: LogRowData = {
    logs,
    levelColors,
    levelBgColors,
    levelLabels,
  }

  return (
    <div
      className="border-t border-[#3c3c3c] bg-[#1e1e1e] flex flex-col contain-panel"
      style={{ height: isCollapsed ? 28 : height }}
    >
      {/* Header */}
      <div
        className="h-7 min-h-[28px] px-3 flex items-center justify-between bg-[#252526] border-b border-[#3c3c3c] cursor-pointer select-none"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          <button className="text-[#808080] hover:text-white transition-colors">
            {isCollapsed ? <IconChevronUp size="sm" /> : <IconChevronDown size="sm" />}
          </button>
          <IconTerminal size="sm" />
          <span className="text-[11px] font-medium text-[#cccccc] uppercase tracking-wide">
            Output
          </span>
          {resourceUsage && (
            <span className="text-[10px] text-[#808080] ml-2">
              CPU: {resourceUsage.cpuPercent.toFixed(1)}% | Mem: {resourceUsage.memoryMB.toFixed(0)}MB
            </span>
          )}
          <span className="text-[10px] text-[#808080]">
            ({logs.length})
          </span>
          {errorCount > 0 && (
            <span className="text-[10px] bg-[#f14c4c]/20 text-[#f14c4c] px-1.5 py-0.5 rounded">
              {errorCount} errors
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-[10px] bg-[#cca700]/20 text-[#cca700] px-1.5 py-0.5 rounded">
              {warningCount} warnings
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isCollapsed && logs.length > 0 && (
            <>
              <CopyButton
                text={logsAsText}
                size="xs"
                tooltip="ログをコピー"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClear()
                }}
                className="p-1 text-[#808080] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
                title="ログをクリア"
              >
                <IconDelete size="xs" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Log Content */}
      {!isCollapsed && (
        <div className="flex-1 font-mono text-[12px] leading-[18px]">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[#808080] text-[11px]">
              ログはありません
            </div>
          ) : (
            <List
              ref={listRef}
              height={listHeight}
              width="100%"
              itemCount={logs.length}
              itemSize={ITEM_SIZE}
              itemData={itemData}
              onScroll={handleScroll}
            >
              {LogRow}
            </List>
          )}
        </div>
      )}
    </div>
  )
}
