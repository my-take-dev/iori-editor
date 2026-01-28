import React, { useCallback } from 'react'
import type { FileChange, FileStatus } from '../../types/git'
import { IconPlus, IconMinus, IconUndo } from '../Icons'

// File type icon with color
function getFileIcon(fileName: string): JSX.Element {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  let color = 'text-gray-400'
  let label = ext.toUpperCase()

  switch (ext) {
    case 'go':
      color = 'text-cyan-400'
      label = 'GO'
      break
    case 'ts':
    case 'tsx':
      color = 'text-blue-400'
      label = 'TS'
      break
    case 'js':
    case 'jsx':
      color = 'text-yellow-400'
      label = 'JS'
      break
    case 'md':
      color = 'text-blue-300'
      label = 'MD'
      break
    case 'json':
      color = 'text-yellow-300'
      label = '{}'
      break
    case 'css':
    case 'scss':
      color = 'text-pink-400'
      label = 'CSS'
      break
    case 'html':
      color = 'text-orange-400'
      label = 'HTM'
      break
    case 'mod':
    case 'sum':
      color = 'text-cyan-400'
      label = 'MOD'
      break
    default:
      label = ext.slice(0, 3).toUpperCase() || 'FILE'
  }

  return (
    <span className={`text-[10px] font-bold ${color} w-5 text-center flex-shrink-0`}>
      {label}
    </span>
  )
}

function getStatusColor(status: FileStatus): string {
  switch (status) {
    case 'A':
      return 'bg-green-600 text-white'
    case 'D':
      return 'bg-red-600 text-white'
    case 'M':
      return 'bg-amber-600 text-white'
    case 'R':
      return 'bg-purple-600 text-white'
    case '?':
      return 'bg-green-700 text-white'
    default:
      return 'bg-gray-600 text-white'
  }
}

function getStatusLabel(status: FileStatus): string {
  switch (status) {
    case 'A':
      return 'A'
    case 'D':
      return 'D'
    case 'M':
      return 'M'
    case 'R':
      return 'R'
    case '?':
      return 'U'
    default:
      return status
  }
}

// Get file name from path
export function getFileName(path: string): string {
  return path.split(/[/\\]/).pop() || path
}

// Get directory from path
function getDirectory(path: string): string {
  const parts = path.split(/[/\\]/)
  if (parts.length > 1) {
    return parts.slice(0, -1).join('/')
  }
  return ''
}

export interface FileChangeItemProps {
  file: FileChange
  isSelected: boolean
  isStaged: boolean
  onSelect: () => void
  onAccept: () => void
  onUnstage: () => void
  onDiscardRequest: () => void
}

function FileChangeItemComponent({
  file,
  isSelected,
  isStaged,
  onSelect,
  onAccept,
  onUnstage,
  onDiscardRequest,
}: FileChangeItemProps): JSX.Element {
  const fileName = getFileName(file.path)
  const directory = getDirectory(file.path)

  const handleUnstageClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onUnstage()
  }, [onUnstage])

  const handleDiscardClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDiscardRequest()
  }, [onDiscardRequest])

  const handleAcceptClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onAccept()
  }, [onAccept])

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-1 pl-6 pr-2 py-0.5 cursor-pointer group ${
        isSelected ? 'bg-[#094771]' : 'hover:bg-[#2a2d2e]'
      }`}
    >
      {/* File icon */}
      {getFileIcon(fileName)}

      {/* File name */}
      <span className={`text-[13px] truncate flex-1 ${isSelected ? 'text-white' : 'text-[#cccccc]'}`}>
        {fileName}
      </span>

      {/* Directory path */}
      {directory && (
        <span className="text-[11px] text-[#808080] truncate max-w-[80px]">
          {directory}
        </span>
      )}

      {/* Action buttons (show on hover) */}
      <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
        {isStaged ? (
          <button
            onClick={handleUnstageClick}
            className="p-0.5 hover:bg-[#3c3c3c] rounded text-[#cccccc]"
            title="変更のステージを解除"
          >
            <IconMinus />
          </button>
        ) : (
          <>
            <button
              onClick={handleDiscardClick}
              className="p-0.5 hover:bg-[#3c3c3c] rounded text-[#cccccc]"
              title="変更を破棄"
            >
              <IconUndo />
            </button>
            <button
              onClick={handleAcceptClick}
              className="p-0.5 hover:bg-[#3c3c3c] rounded text-[#cccccc]"
              title="変更をステージ"
            >
              <IconPlus />
            </button>
          </>
        )}
      </div>

      {/* Status badge */}
      <span className={`text-[10px] font-bold px-1 rounded ${getStatusColor(file.status)}`}>
        {getStatusLabel(file.status)}
      </span>
    </div>
  )
}

export const FileChangeItem = React.memo(FileChangeItemComponent)
FileChangeItem.displayName = 'FileChangeItem'
