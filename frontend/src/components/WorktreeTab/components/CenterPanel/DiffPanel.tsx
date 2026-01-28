import { Suspense, lazy } from 'react'
import { ErrorBoundary, LoadingFallback } from '../../../common'

const DiffViewer = lazy(() =>
  import('../../../DiffViewer/DiffViewer').then(m => ({ default: m.DiffViewer }))
)

interface DiffPanelProps {
  filePath: string
  original: string
  modified: string
}

export function DiffPanel({ filePath, original, modified }: DiffPanelProps): JSX.Element {
  return (
    <div className="absolute inset-0 flex flex-col">
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <DiffViewer filePath={filePath} original={original} modified={modified} />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
