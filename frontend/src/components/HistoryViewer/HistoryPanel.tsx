import { Suspense, lazy, useEffect, useCallback } from 'react'
import { HistoryList } from './HistoryList'
import { useWorktreeHistoryStore } from '../../stores/worktreeHistoryStore'
import { useCurrentSession } from '../../hooks/useCurrentSession'
import { ErrorBoundary, LoadingFallback } from '../common'

const HistoryViewer = lazy(() =>
  import('./HistoryViewer').then(module => ({ default: module.HistoryViewer }))
)

/**
 * Container component for history display
 * Manages history state using worktreeHistoryStore
 */
export function HistoryPanel() {
  // Use current session (respects worktree mode)
  const { session: activeSession } = useCurrentSession()

  // Store state
  const histories = useWorktreeHistoryStore((s) => s.histories)
  const selectedFilename = useWorktreeHistoryStore((s) => s.selectedFilename)
  const isLoading = useWorktreeHistoryStore((s) => s.isLoading)
  const historyData = useWorktreeHistoryStore((s) => s.historyData)
  const historyMetadata = useWorktreeHistoryStore((s) => s.historyMetadata)
  const hasMore = useWorktreeHistoryStore((s) => s.hasMore)
  const isLoadingMore = useWorktreeHistoryStore((s) => s.isLoadingMore)

  // Store actions
  const handleHistoryTabClick = useWorktreeHistoryStore((s) => s.handleHistoryTabClick)
  const handleHistorySelect = useWorktreeHistoryStore((s) => s.handleHistorySelect)
  const handleHistoryDelete = useWorktreeHistoryStore((s) => s.handleHistoryDelete)
  const loadHistoryList = useWorktreeHistoryStore((s) => s.loadHistoryList)
  const loadMoreHistory = useWorktreeHistoryStore((s) => s.loadMoreHistory)

  // Wrap actions to pass activeSessionId
  const onSelect = useCallback(
    (filename: string) => handleHistorySelect(filename, activeSession?.id),
    [handleHistorySelect, activeSession?.id]
  )

  const onLoadMore = useCallback(
    () => loadMoreHistory(activeSession?.id),
    [loadMoreHistory, activeSession?.id]
  )

  // セッション変更時に履歴リストを自動ロード
  useEffect(() => {
    handleHistoryTabClick(activeSession?.id)
  }, [activeSession?.id, handleHistoryTabClick])

  return (
    <div className="absolute inset-0 flex">
      <HistoryList
        histories={histories}
        selectedFilename={selectedFilename}
        onSelect={onSelect}
        onDelete={handleHistoryDelete}
        onRefresh={loadHistoryList}
        isLoading={isLoading}
      />
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <HistoryViewer
            historyData={historyData}
            historyMetadata={historyMetadata}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={onLoadMore}
            key={selectedFilename || 'empty'}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
