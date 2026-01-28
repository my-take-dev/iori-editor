import { Skeleton } from './Skeleton'
import type { SkeletonEditorProps } from './types'

// コード行の幅パターン（ランダムに見せる）
const codeWidthPatterns = [45, 65, 80, 30, 55, 70, 40, 60, 85, 50, 35, 75, 25, 90, 55]

export function SkeletonEditor({
  showToolbar = false,
  showLineNumbers = true,
  lines = 20,
  animate = true,
  className = '',
}: SkeletonEditorProps) {
  return (
    <div
      className={`flex flex-col h-full bg-bg-editor ${className}`}
      aria-busy="true"
      aria-label="Loading editor"
    >
      {showToolbar && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Skeleton variant="rect" width={80} height={20} animate={animate} />
          <Skeleton variant="rect" width={60} height={20} animate={animate} />
          <div className="flex-1" />
          <Skeleton variant="rect" width={24} height={20} animate={animate} />
        </div>
      )}
      <div className="flex-1 overflow-hidden p-2">
        <div className="space-y-1">
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 h-5">
              {showLineNumbers && (
                <Skeleton
                  variant="text"
                  width={24}
                  height={12}
                  animate={animate}
                  className="opacity-50"
                />
              )}
              <Skeleton
                variant="text"
                width={`${codeWidthPatterns[i % codeWidthPatterns.length]}%`}
                height={12}
                animate={animate}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
