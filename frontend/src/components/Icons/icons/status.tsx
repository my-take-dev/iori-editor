/**
 * Status icons - Check, Error, Warning, Pause
 */
import { IconProps, getSizeClass } from '../types'

export function IconCheck({ size = 'md', className = '' }: IconProps): JSX.Element {
  return (
    <svg className={`${getSizeClass(size)} ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

export function IconError({ size = 'md', className = '' }: IconProps): JSX.Element {
  return (
    <svg className={`${getSizeClass(size)} ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export function IconWarning({ size = 'md', className = '' }: IconProps): JSX.Element {
  return (
    <svg className={`${getSizeClass(size)} ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}

export function IconPause({ size = 'md', className = '' }: IconProps): JSX.Element {
  return (
    <svg className={`${getSizeClass(size)} ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
