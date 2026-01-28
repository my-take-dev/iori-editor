import { useState, useCallback, useRef, useEffect } from 'react'
import { Terminal, TerminalHandle } from '../Terminal/Terminal'
import type { TerminalType } from '../../types/session'
import { useCurrentSession } from '../../hooks/useCurrentSession'

// Icons
const IconRobot = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

const IconTerminal = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const IconSplit = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z M12 4v16" />
  </svg>
)

const IconMaximize = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
)

const IconClear = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const IconDisconnect = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
)

interface DualTerminalPanelProps {
  isMaximized: boolean
  onToggleMaximize: () => void
  // Optional props for external use (e.g., WorktreeTab)
  sessionId?: string
  aiRunning?: boolean
  onDisconnectSession?: () => void
}

export function DualTerminalPanel({
  isMaximized,
  onToggleMaximize,
  sessionId: externalSessionId,
  aiRunning: externalAiRunning,
  onDisconnectSession,
}: DualTerminalPanelProps) {
  // Get session info from hook (fallback if props not provided)
  const { session } = useCurrentSession()
  const sessionId = externalSessionId ?? session?.id ?? ''
  const aiRunning = externalAiRunning ?? session?.isActive ?? false

  const [activeTab, setActiveTab] = useState<TerminalType>('ai')
  const [isSplit, setIsSplit] = useState(false)
  const aiTerminalRef = useRef<TerminalHandle>(null)
  const userTerminalRef = useRef<TerminalHandle>(null)

  // Handle tab change with scroll to bottom
  const handleTabChange = useCallback((tab: TerminalType) => {
    setActiveTab(tab)
    // Scroll to bottom after rendering
    setTimeout(() => {
      if (tab === 'ai') {
        aiTerminalRef.current?.scrollToBottom()
      } else {
        userTerminalRef.current?.scrollToBottom()
      }
    }, 50)
  }, [])

  const handleToggleSplit = useCallback(() => {
    setIsSplit((prev) => !prev)
    // Trigger resize event for terminals to refit
    setTimeout(() => window.dispatchEvent(new Event('resize')), 50)
  }, [])

  const requestActiveFit = useCallback(() => {
    if (isSplit) {
      aiTerminalRef.current?.requestFit()
      userTerminalRef.current?.requestFit()
      return
    }
    if (activeTab === 'ai') {
      aiTerminalRef.current?.requestFit()
      return
    }
    userTerminalRef.current?.requestFit()
  }, [activeTab, isSplit])

  useEffect(() => {
    if (!sessionId) return
    const rafId = requestAnimationFrame(() => {
      requestActiveFit()
    })
    const timer = setTimeout(() => {
      requestActiveFit()
    }, 180)
    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timer)
    }
  }, [sessionId, activeTab, isSplit, isMaximized, requestActiveFit])

  return (
    <div className="flex flex-col h-full bg-bg-primary contain-panel">
      {/* Header */}
      <div className="h-8 px-2 flex items-center bg-bg-secondary border-y border-border select-none justify-between">
        <div className="flex items-center gap-1">
          {!isSplit ? (
            <>
              <button
                onClick={() => handleTabChange('ai')}
                className={`px-3 py-0.5 text-xs font-bold rounded flex items-center gap-2 transition-colors ${
                  activeTab === 'ai'
                    ? 'bg-accent-blue-bg text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <IconRobot /> AI AGENT
                {aiRunning && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-dot" />
                )}
              </button>
              <button
                onClick={() => handleTabChange('user')}
                className={`px-3 py-0.5 text-xs font-bold rounded flex items-center gap-2 transition-colors ${
                  activeTab === 'user'
                    ? 'bg-accent-green text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <IconTerminal /> USER SHELL
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4 text-xs font-bold text-text-secondary px-2">
              <span className="flex items-center gap-2 text-accent-blue">
                <IconRobot /> AI AGENT
                {aiRunning && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-dot" />
                )}
              </span>
              <span className="text-text-muted">|</span>
              <span className="flex items-center gap-2 text-accent-green">
                <IconTerminal /> USER SHELL
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Clear */}
          <button
            className="p-1 rounded hover:bg-bg-tertiary text-text-secondary"
            title="Clear (Ctrl+L)"
          >
            <IconClear />
          </button>
          {/* Split */}
          <button
            onClick={handleToggleSplit}
            className={`p-1 rounded hover:bg-bg-tertiary transition-colors ${
              isSplit ? 'text-accent-blue bg-bg-tertiary' : 'text-text-secondary'
            }`}
            title="Split View"
          >
            <IconSplit />
          </button>
          {/* Maximize */}
          <button
            onClick={onToggleMaximize}
            className={`p-1 rounded hover:bg-bg-tertiary transition-colors ${
              isMaximized ? 'text-accent-yellow bg-bg-tertiary' : 'text-text-secondary'
            }`}
            title="Maximize"
          >
            <IconMaximize />
          </button>
          {/* Disconnect Session */}
          {onDisconnectSession && (
            <button
              onClick={onDisconnectSession}
              className="p-1 rounded hover:bg-bg-tertiary text-text-secondary hover:text-red-400"
              title="Disconnect Session"
            >
              <IconDisconnect />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 relative flex overflow-hidden min-h-0">
        {/* AI Terminal */}
        <div
          className={`flex flex-col h-full min-h-0 transition-all ${
            isSplit
              ? 'w-1/2 border-r border-border'
              : activeTab === 'ai'
              ? 'w-full'
              : 'hidden'
          }`}
        >
          <Terminal ref={aiTerminalRef} sessionId={sessionId} terminalType="ai" />
        </div>

        {/* User Terminal */}
        <div
          className={`flex flex-col h-full min-h-0 transition-all ${
            isSplit ? 'w-1/2' : activeTab === 'user' ? 'w-full' : 'hidden'
          }`}
        >
          <Terminal ref={userTerminalRef} sessionId={sessionId} terminalType="user" />
        </div>
      </div>
    </div>
  )
}
