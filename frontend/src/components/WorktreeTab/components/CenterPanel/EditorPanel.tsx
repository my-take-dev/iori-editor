import { Suspense, lazy } from 'react'
import { ErrorBoundary, LoadingFallback } from '../../../common'

const FileEditor = lazy(() =>
  import('../../../FileEditor/FileEditor').then(m => ({ default: m.FileEditor }))
)

interface EditorPanelProps {
  sessionId: string | null
  filePath: string
  onSave: (content: string) => Promise<void>
}

export function EditorPanel({ sessionId, filePath, onSave }: EditorPanelProps): JSX.Element {
  return (
    <div className="absolute inset-0 flex flex-col">
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <FileEditor sessionId={sessionId} filePath={filePath} onSave={onSave} />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
