import { memo } from 'react'
import { IconSpinner } from '../../Icons'

export const LoadingOverlay = memo(function LoadingOverlay(): JSX.Element {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-text-muted bg-bg-editor/80 backdrop-blur-sm">
      <IconSpinner size="lg" />
      <span className="ml-2">Loading...</span>
    </div>
  )
})
LoadingOverlay.displayName = 'LoadingOverlay'
