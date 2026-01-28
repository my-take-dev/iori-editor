/**
 * Git icons - GitBranch, Cloud, Sync
 */
import { IconProps, getSizeClass } from '../types'
import { IconRefresh } from './actions'

export function IconGitBranch({ size = 'md', className = '' }: IconProps): JSX.Element {
  return (
    <svg className={`${getSizeClass(size)} ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7v10M17 7v4m0 0a3 3 0 01-3 3H7m10-3l-3-3m3 3l3-3" />
    </svg>
  )
}

export function IconCloud({ size = 'md', className = '' }: IconProps): JSX.Element {
  return (
    <svg className={`${getSizeClass(size)} ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  )
}

// IconSync uses the same visual as IconRefresh (circular arrows)
export const IconSync = IconRefresh
