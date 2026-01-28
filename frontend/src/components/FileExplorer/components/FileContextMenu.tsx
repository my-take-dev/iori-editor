import { useRef, useState, useEffect } from 'react'
import type { FileContextMenuProps } from '../types'
import { IconCopy, IconCopyRelative, IconRename, IconDelete } from '../../Icons'

export function FileContextMenu({
  x,
  y,
  // node, workDir は親コンポーネントで処理済み
  onClose,
  onCopyPath,
  onCopyRelativePath,
  onRename,
  onDelete,
}: FileContextMenuProps): JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPos, setAdjustedPos] = useState({ x, y })

  useEffect(() => {
    let isMounted = true
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    const timerId = setTimeout(() => {
      if (isMounted) {
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscape)
      }
    }, 0)
    return () => {
      isMounted = false
      clearTimeout(timerId)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      let newX = x
      let newY = y
      if (x + rect.width > window.innerWidth) {
        newX = window.innerWidth - rect.width - 10
      }
      if (y + rect.height > window.innerHeight) {
        newY = window.innerHeight - rect.height - 10
      }
      setAdjustedPos({ x: newX, y: newY })
    }
  }, [x, y])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-bg-secondary border border-border rounded shadow-lg py-1 min-w-[180px]"
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
    >
      <button
        className="w-full px-3 py-1.5 text-left text-sm hover:bg-bg-tertiary text-text-primary flex items-center gap-2"
        onClick={() => { onCopyPath(); onClose() }}
      >
        <IconCopy />
        パスのコピー
      </button>
      <button
        className="w-full px-3 py-1.5 text-left text-sm hover:bg-bg-tertiary text-text-primary flex items-center gap-2"
        onClick={() => { onCopyRelativePath(); onClose() }}
      >
        <IconCopyRelative />
        相対パスのコピー
      </button>
      <div className="border-t border-border my-1" />
      <button
        className="w-full px-3 py-1.5 text-left text-sm hover:bg-bg-tertiary text-text-primary flex items-center gap-2"
        onClick={() => { onRename(); onClose() }}
      >
        <IconRename />
        名前の変更
      </button>
      <button
        className="w-full px-3 py-1.5 text-left text-sm hover:bg-bg-tertiary text-red-400 flex items-center gap-2"
        onClick={() => { onDelete(); onClose() }}
      >
        <IconDelete />
        削除
      </button>
    </div>
  )
}
