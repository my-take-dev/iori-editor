import { memo } from 'react'
import type { ErrorOverlayProps } from '../types'
import { IconError } from '../../Icons'

export const ErrorOverlay = memo(function ErrorOverlay({ error }: ErrorOverlayProps): JSX.Element {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-red-400 bg-bg-editor">
      <IconError size="lg" />
      <span className="ml-2">{error}</span>
    </div>
  )
})
ErrorOverlay.displayName = 'ErrorOverlay'
