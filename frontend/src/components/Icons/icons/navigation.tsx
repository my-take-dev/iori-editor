/**
 * Navigation icons - Chevrons and arrows
 */
import { IconProps, getSizeClass } from '../types'

export function IconChevronLeft({ size = 'md', className = '' }: IconProps): JSX.Element {
  return (
    <svg className={`${getSizeClass(size)} ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

export function IconChevronRight({ size = 'md', className = '' }: IconProps): JSX.Element {
  return (
    <svg className={`${getSizeClass(size)} ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

export function IconChevronDown({ size = 'md', className = '' }: IconProps): JSX.Element {
  return (
    <svg className={`${getSizeClass(size)} ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

export function IconChevronUp({ size = 'md', className = '' }: IconProps): JSX.Element {
  return (
    <svg className={`${getSizeClass(size)} ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  )
}

export function IconExternalLink({ size = 'md', className = '' }: IconProps): JSX.Element {
  return (
    <svg className={`${getSizeClass(size)} ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}
