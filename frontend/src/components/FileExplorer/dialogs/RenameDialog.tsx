import { useState, useRef, useEffect, useCallback } from 'react'
import type { RenameDialogProps } from '../types'

export function RenameDialog({ currentName, onConfirm, onCancel }: RenameDialogProps): JSX.Element {
  const [newName, setNewName] = useState(currentName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (newName.trim() && newName !== currentName) {
      onConfirm(newName.trim())
    }
  }, [newName, currentName, onConfirm])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <form
        className="bg-bg-secondary border border-border rounded-lg shadow-xl p-4 max-w-sm w-full mx-4"
        onSubmit={handleSubmit}
      >
        <h3 className="text-lg font-bold text-text-primary mb-2">名前の変更</h3>
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-full px-3 py-2 bg-bg-primary border border-border rounded text-text-primary focus:border-accent-blue outline-none mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 text-sm rounded bg-bg-tertiary text-text-primary hover:bg-bg-primary"
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm rounded bg-accent-blue text-white hover:bg-blue-600"
            disabled={!newName.trim() || newName === currentName}
          >
            変更
          </button>
        </div>
      </form>
    </div>
  )
}
