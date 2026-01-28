/**
 * File icon with dynamic color based on extension
 */
import { getFileIconColor } from '../../../utils/fileIcons'
import { IconProps, getSizeClass } from '../types'

export interface IconFileProps extends IconProps {
  ext: string
}

export function IconFile({ ext, size = 'md', className = '' }: IconFileProps): JSX.Element {
  const sizeClass = getSizeClass(size)
  const colorClass = getFileIconColor(ext)

  return (
    <svg className={`${sizeClass} ${colorClass} ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}
