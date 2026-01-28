import { memo, useCallback } from 'react'
import type { ListChildComponentProps } from 'react-window'
import type { VirtualRowData } from '../types'
import { IconFolder, IconArrow, IconSpinner, IconFile } from '../../Icons'

export const FileExplorerItem = memo(function FileExplorerItem({
  index,
  style,
  data,
}: ListChildComponentProps<VirtualRowData>): JSX.Element {
  const { flatNodes, onSelectFile, selectedPath, onToggleExpand, onContextMenu, workDir } = data
  const node = flatNodes[index]
  const indent = node.depth * 12 + 8
  const ext = node.name.split('.').pop() || ''
  const isSelected = selectedPath === node.path

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.isDir) {
      onToggleExpand(node.path)
    } else {
      performance.mark(`file-select-start:${node.path}`)
      onSelectFile(node.path)
    }
  }, [node.isDir, node.path, onToggleExpand, onSelectFile])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault()
      e.stopPropagation()
      onContextMenu(e, node)
    }
  }, [node, onContextMenu])

  const handleDragStart = useCallback((e: React.DragEvent) => {
    const fullPath = workDir
      ? `${workDir}/${node.path}`.replace(/\//g, '\\')
      : node.path
    e.dataTransfer.setData('text/plain', fullPath)
    e.dataTransfer.effectAllowed = 'copy'
  }, [node.path, workDir])

  return (
    <div
      style={{ ...style, paddingLeft: `${indent}px` }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => e.preventDefault()}
      className={`flex items-center gap-1.5 cursor-pointer text-sm select-none ${
        isSelected ? 'bg-[#094771] text-white' : 'hover:bg-bg-secondary'
      }`}
    >
      <div
        draggable
        onDragStart={handleDragStart}
        className="flex items-center gap-1.5 flex-1 min-w-0"
      >
        {node.isDir && node.hasChildren && (node.isLoading ? <IconSpinner size="sm" className="text-gray-400" /> : <IconArrow open={node.isExpanded} />)}
        {node.isDir && !node.hasChildren && <span className="w-3" />}
        {!node.isDir && <span className="w-3" />}
        {node.isDir ? <IconFolder className="text-blue-400" /> : <IconFile ext={ext} />}
        <span className={`truncate ${node.isDir ? 'font-semibold text-text-secondary' : 'text-text-primary'}`}>
          {node.name}
        </span>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  const prevNode = prevProps.data.flatNodes[prevProps.index]
  const nextNode = nextProps.data.flatNodes[nextProps.index]
  if (prevNode !== nextNode) return false
  if (prevProps.data.selectedPath !== nextProps.data.selectedPath) {
    const path = prevNode.path
    const wasSelected = prevProps.data.selectedPath === path
    const isSelected = nextProps.data.selectedPath === path
    if (wasSelected !== isSelected) return false
  }
  return true
})
