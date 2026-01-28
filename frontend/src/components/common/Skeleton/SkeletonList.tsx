import { Skeleton } from './Skeleton'
import type { SkeletonListProps } from './types'

// 各行の幅をランダムに見せるためのパターン
const widthPatterns = [85, 70, 90, 60, 75, 95, 65, 80, 55, 72]

export function SkeletonList({
  count = 5,
  itemHeight = 28,
  showIcon = true,
  indent = false,
  animate = true,
  className = '',
}: SkeletonListProps) {
  return (
    <div
      className={`space-y-1 ${className}`}
      aria-busy="true"
      aria-label="Loading list"
    >
      {Array.from({ length: count }).map((_, i) => {
        // インデントパターン（ファイルツリー風）
        const paddingLeft = indent ? (i % 3) * 12 + 8 : 8

        return (
          <div
            key={i}
            className="flex items-center gap-2"
            style={{ height: itemHeight, paddingLeft }}
          >
            {showIcon && (
              <Skeleton variant="rect" width={16} height={16} animate={animate} />
            )}
            <Skeleton
              variant="text"
              width={`${widthPatterns[i % widthPatterns.length]}%`}
              height={14}
              animate={animate}
            />
          </div>
        )
      })}
    </div>
  )
}
