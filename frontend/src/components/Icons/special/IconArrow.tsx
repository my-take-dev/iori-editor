/**
 * Arrow icon with rotation based on open state
 */
import { IconProps, getSizeClass } from '../types'

export interface IconArrowProps extends IconProps {
  open?: boolean
}

export function IconArrow({ open = false, size = 'sm', className = '' }: IconArrowProps): JSX.Element {
  const sizeClass = getSizeClass(size)
  const rotateClass = open ? 'rotate-90' : ''

  return (
    <svg
      className={`${sizeClass} text-gray-500 transition-transform ${rotateClass} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}
