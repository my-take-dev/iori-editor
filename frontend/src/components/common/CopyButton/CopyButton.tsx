import { useCallback } from 'react'
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard'
import { IconCopy, IconCheck } from '../../Icons'
import type { CopyButtonProps, CopyButtonSize } from './types'

const sizeClasses: Record<CopyButtonSize, string> = {
  xs: 'p-0.5',
  sm: 'p-1',
  md: 'p-1.5',
}

const iconSizes: Record<CopyButtonSize, 'xs' | 'sm' | 'md'> = {
  xs: 'xs',
  sm: 'sm',
  md: 'md',
}

const textSizes: Record<CopyButtonSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
}

export function CopyButton({
  text,
  variant = 'icon',
  size = 'sm',
  tooltip = 'コピー',
  onCopy,
  className = '',
  label = 'コピー',
}: CopyButtonProps): JSX.Element {
  const { isCopied, copy } = useCopyToClipboard()

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    const success = await copy(text)
    if (success && onCopy) {
      onCopy()
    }
  }, [text, copy, onCopy])

  const Icon = isCopied ? IconCheck : IconCopy
  const iconColor = isCopied ? 'text-green-400' : 'text-gray-400 hover:text-white'
  const displayLabel = isCopied ? 'コピーしました' : label

  const baseClasses = `
    inline-flex items-center justify-center gap-1
    rounded transition-colors duration-150
    ${sizeClasses[size]}
    ${iconColor}
    hover:bg-white/10
    focus:outline-none focus:ring-1 focus:ring-accent-blue
  `.trim().replace(/\s+/g, ' ')

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${baseClasses} ${className}`}
      title={isCopied ? 'コピーしました' : tooltip}
      aria-label={isCopied ? 'コピーしました' : tooltip}
    >
      <Icon size={iconSizes[size]} className={isCopied ? 'text-green-400' : ''} />
      {(variant === 'text' || variant === 'icon-text') && (
        <span className={`${textSizes[size]} ${isCopied ? 'text-green-400' : ''}`}>
          {displayLabel}
        </span>
      )}
    </button>
  )
}
