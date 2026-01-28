import { forwardRef, memo } from 'react'
import { FixedSizeList as List } from 'react-window'
import type { FileExplorerListProps } from '../types'
import { SkeletonList } from '../../common/Skeleton'
import { FileExplorerItem } from './FileExplorerItem'

const ITEM_HEIGHT = 28

export const FileExplorerList = memo(forwardRef<HTMLDivElement, FileExplorerListProps>(
  function FileExplorerList(
    { isLoading, flatNodes, containerHeight, listRef, itemData },
    containerRef
  ): JSX.Element {
    if (isLoading) {
      return (
        <div ref={containerRef} className="flex-1 overflow-hidden">
          <div className="p-2">
            <SkeletonList count={15} itemHeight={ITEM_HEIGHT} showIcon indent />
          </div>
        </div>
      )
    }

    if (flatNodes.length === 0) {
      return (
        <div ref={containerRef} className="flex-1 overflow-hidden">
          <div className="text-text-muted text-center mt-4">No files</div>
        </div>
      )
    }

    return (
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <List
          ref={listRef}
          height={containerHeight}
          itemCount={flatNodes.length}
          itemSize={ITEM_HEIGHT}
          width="100%"
          itemData={itemData}
          itemKey={(index, data) => data.flatNodes[index].path}
          overscanCount={5}
        >
          {FileExplorerItem}
        </List>
      </div>
    )
  }
))
