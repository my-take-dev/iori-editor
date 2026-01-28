import { memo } from 'react'

export const EmptyStateOverlay = memo(function EmptyStateOverlay(): JSX.Element {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-text-muted bg-bg-editor">
      No file open
    </div>
  )
})
EmptyStateOverlay.displayName = 'EmptyStateOverlay'
