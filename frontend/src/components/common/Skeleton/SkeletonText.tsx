import { Skeleton } from './Skeleton'
import type { SkeletonTextProps } from './types'

const defaultWidths = ['100%', '80%', '90%', '60%', '75%']

export function SkeletonText({
  lines = 3,
  widths,
  gap = 'gap-2',
  lineHeight = 14,
  animate = true,
  className = '',
}: SkeletonTextProps) {
  const lineWidths = widths || defaultWidths

  return (
    <div
      className={`flex flex-col ${gap} ${className}`}
      aria-busy="true"
      aria-label="Loading text"
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={lineWidths[i % lineWidths.length]}
          height={lineHeight}
          animate={animate}
        />
      ))}
    </div>
  )
}
