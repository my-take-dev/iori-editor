import { BrowserOpenURL } from '../../wailsjs/runtime/runtime'
import { IconExternalLink } from '../Icons'
import type { ReactNode, MouseEvent } from 'react'

export interface ExternalLinkProps {
  href: string
  children: ReactNode
  className?: string
  showIcon?: boolean
  title?: string
}

export function ExternalLink({
  href,
  children,
  className = '',
  showIcon = true,
  title,
}: ExternalLinkProps): JSX.Element {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    BrowserOpenURL(href)
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`inline-flex items-center gap-1 text-[#58a6ff] hover:text-[#79c0ff] hover:underline cursor-pointer transition-colors ${className}`}
      title={title}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
      {showIcon && <IconExternalLink size="xs" className="flex-shrink-0" />}
    </a>
  )
}
