import { useCallback, useState, useRef, useEffect } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { SetActiveSession, DeleteSession, CheckoutBranchForPath } from '../../wailsjs/go/main/App'
import { ConfirmDialog } from '../common'
import { IconPlus, IconChevronLeft, IconChevronRight } from '../Icons'
import { SessionItem } from './SessionItem'
import { BranchSelectorModal } from './BranchSelectorModal'
import type { SessionListProps, BranchSwitchInfo } from './types'
import { canSwitchBranch, cannotSwitchBranch } from './types'

export function SessionList({
  onCreateSession,
  isCollapsed,
  onToggleCollapse,
  width,
  aiStatuses = {},
  branchSwitchInfos = {},
  onBranchChanged,
  onWorktreeMode,
  onServerMode,
  onSessionSelected,
  allWorktreeSessionsMap = {},
}: SessionListProps): JSX.Element {
  const sessions = useSessionStore((state) => state.sessions)
  const activeSessionId = useSessionStore((state) => state.activeSessionId)
  const setActiveSession = useSessionStore((state) => state.setActiveSession)
  const removeSession = useSessionStore((state) => state.removeSession)
  const updateSessionBranch = useSessionStore((state) => state.updateSessionBranch)

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [branchSelector, setBranchSelector] = useState<{ sessionId: string; workDir: string; branch: string } | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  const showError = useCallback((message: string) => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current)
    }
    setErrorMessage(message)
    errorTimeoutRef.current = setTimeout(() => {
      // Check if component is still mounted before setting state
      if (isMountedRef.current) {
        setErrorMessage(null)
      }
    }, 3000)
  }, [])

  // Cleanup timeout on unmount and track mounted state
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }
    }
  }, [])

  const handleSelectSession = useCallback(
    async (id: string) => {
      try {
        setErrorMessage(null)
        await SetActiveSession(id)
        setActiveSession(id)
        onSessionSelected?.(id)
      } catch (err) {
        console.error('Failed to set active session:', err)
        const errMsg = err instanceof Error ? err.message : String(err)
        showError(`セッションの選択に失敗しました: ${errMsg}`)
      }
    },
    [setActiveSession, onSessionSelected, showError]
  )

  const handleDeleteRequest = useCallback((id: string, name: string) => {
    setDeleteConfirm({ id, name })
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm) return

    try {
      setErrorMessage(null)
      await DeleteSession(deleteConfirm.id)
      removeSession(deleteConfirm.id)
    } catch (err) {
      console.error('Failed to delete session:', err)
      const errMsg = err instanceof Error ? err.message : String(err)
      showError(`セッションの削除に失敗しました: ${errMsg}`)
    } finally {
      setDeleteConfirm(null)
    }
  }, [deleteConfirm, removeSession, showError])

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirm(null)
  }, [])

  const handleBranchSwitchRequest = useCallback((sessionId: string, workDir: string) => {
    const session = sessions.find((s) => s.id === sessionId)
    if (session) {
      setBranchSelector({ sessionId, workDir, branch: session.branch || '' })
    }
  }, [sessions])

  const handleBranchSelect = useCallback(async (branchName: string) => {
    if (!branchSelector) return

    setIsSwitching(true)
    setErrorMessage(null)
    try {
      await CheckoutBranchForPath(branchSelector.workDir, branchName)
      if (updateSessionBranch) {
        updateSessionBranch(branchSelector.sessionId, branchName)
      }
      if (onBranchChanged) {
        onBranchChanged(branchSelector.sessionId, branchName)
      }
    } catch (err) {
      console.error('Failed to switch branch:', err)
      const errMsg = err instanceof Error ? err.message : String(err)
      showError(`ブランチの切り替えに失敗しました: ${errMsg}`)
    } finally {
      setIsSwitching(false)
      setBranchSelector(null)
    }
  }, [branchSelector, updateSessionBranch, onBranchChanged, showError])

  const handleBranchCancel = useCallback(() => {
    setBranchSelector(null)
  }, [])

  const defaultBranchSwitchInfo: BranchSwitchInfo = canSwitchBranch(false, false)

  const activeWorkDirs = sessions
    .filter((s) => aiStatuses[s.id] && aiStatuses[s.id] !== 'idle')
    .map((s) => s.workDir.toLowerCase())

  const displayableSessions = sessions.filter((session) => {
    const hasActiveTerminal = aiStatuses[session.id] && aiStatuses[session.id] !== 'idle'
    return hasActiveTerminal || !activeWorkDirs.includes(session.workDir.toLowerCase())
  })

  return (
    <div
      style={{ width: isCollapsed ? 40 : width }}
      className="flex flex-col border-r border-border bg-bg-sidebar flex-shrink-0 transition-all h-full contain-panel"
    >
      <div className="h-10 px-2 flex items-center border-b border-border font-bold text-text-secondary uppercase tracking-wider justify-between">
        {!isCollapsed && <span className="px-2">Sessions</span>}
        <button onClick={onToggleCollapse} className="p-1 hover:bg-bg-tertiary rounded">
          {isCollapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>
      </div>

      {/* Error Message Toast */}
      {!isCollapsed && errorMessage && (
        <div className="mx-2 mt-2 px-3 py-2 bg-red-900/50 border border-red-700 rounded text-red-300 text-xs">
          {errorMessage}
        </div>
      )}

      {!isCollapsed && (
        <>
          <div className="flex-1 overflow-y-auto">
            {displayableSessions.map((session, idx) => {
              const aiStatus = aiStatuses[session.id] || 'idle'
              const switchInfo = branchSwitchInfos[session.id] || defaultBranchSwitchInfo
              // If AI is working, override to prevent branch switching
              const effectiveSwitchInfo: BranchSwitchInfo = aiStatus === 'working'
                ? cannotSwitchBranch('AIが実行中', switchInfo.hasChanges, switchInfo.hasUnpushed)
                : switchInfo
              const worktreeSessionsInfo = allWorktreeSessionsMap[session.id] || []
              return (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === activeSessionId}
                  index={idx}
                  aiStatus={aiStatus}
                  branchSwitchInfo={effectiveSwitchInfo}
                  onSelect={handleSelectSession}
                  onDelete={handleDeleteRequest}
                  onBranchSwitch={handleBranchSwitchRequest}
                  onWorktreeMode={onWorktreeMode}
                  onServerMode={onServerMode}
                  worktreeSessionsInfo={worktreeSessionsInfo}
                />
              )
            })}
          </div>

          <div className="p-3 border-t border-border">
            <button
              onClick={onCreateSession}
              className="w-full py-2 bg-accent-green hover:bg-accent-green-hover text-white font-bold rounded flex items-center justify-center gap-2 transition-colors"
            >
              <IconPlus size="sm" /> NEW
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title="セッションを閉じる"
        message={`「${deleteConfirm?.name || ''}」を閉じますか？`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmLabel="閉じる"
      />

      <BranchSelectorModal
        isOpen={branchSelector !== null}
        workDir={branchSelector?.workDir || ''}
        currentBranch={branchSelector?.branch || ''}
        isSwitching={isSwitching}
        onSelect={handleBranchSelect}
        onCancel={handleBranchCancel}
      />
    </div>
  )
}
