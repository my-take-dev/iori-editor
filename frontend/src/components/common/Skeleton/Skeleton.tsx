import type { SkeletonProps, SkeletonVariant } from './types'

const variantStyles: Record<SkeletonVariant, string> = {
  text: 'h-4 rounded',
  rect: 'rounded',
  circle: 'rounded-full',
  line: 'h-px w-full',
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  animate = true,
  className = '',
}: SkeletonProps) {
  const baseClasses = `bg-bg-tertiary ${animate ? 'animate-skeleton' : ''}`
  const variantClass = variantStyles[variant]

  const style: React.CSSProperties = {}
  if (typeof width === 'number') {
    style.width = `${width}px`
  } else if (width) {
    style.width = width
  }
  if (typeof height === 'number') {
    style.height = `${height}px`
  } else if (height) {
    style.height = height
  }

  return (
    <div
      className={`${baseClasses} ${variantClass} ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}
