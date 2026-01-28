import { Skeleton, SkeletonText } from './Skeleton'

export function LoadingFallback() {
  return (
    <div className="flex flex-col h-full bg-bg-editor p-4">
      <Skeleton variant="rect" width="100%" height={32} className="mb-4" />
      <SkeletonText lines={5} widths={['90%', '75%', '85%', '60%', '70%']} />
    </div>
  )
}
