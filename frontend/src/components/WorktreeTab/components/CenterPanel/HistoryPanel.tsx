import { Suspense, lazy } from 'react'
import { ErrorBoundary, LoadingFallback } from '../../../common'
import { useWorktreeHistoryStore } from '../../../../stores/worktreeHistoryStore'

const HistoryViewer = lazy(() =>
  import('../../../HistoryViewer').then(m => ({ default: m.HistoryViewer }))
)

export function HistoryPanel(): JSX.Element {
  // Get history data from store
  const historyData = useWorktreeHistoryStore((s) => s.historyData)
  const historyMetadata = useWorktreeHistoryStore((s) => s.historyMetadata)
  const hasMore = useWorktreeHistoryStore((s) => s.hasMore)
  const isLoadingMore = useWorktreeHistoryStore((s) => s.isLoadingMore)
  const loadMoreHistory = useWorktreeHistoryStore((s) => s.loadMoreHistory)

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d1117]">
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <HistoryViewer
            historyData={historyData}
            historyMetadata={historyMetadata}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMoreHistory}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
