import { useEffect } from 'react'
import type { DeleteDialogProps } from '../types'

export function DeleteDialog({ fileName, onConfirm, onCancel }: DeleteDialogProps): JSX.Element {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-secondary border border-border rounded-lg shadow-xl p-4 max-w-sm w-full mx-4">
        <h3 className="text-lg font-bold text-text-primary mb-2">削除の確認</h3>
        <p className="text-text-secondary mb-4">
          "<span className="text-text-primary font-medium">{fileName}</span>" を削除してよろしいですか？
        </p>
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 text-sm rounded bg-bg-tertiary text-text-primary hover:bg-bg-primary"
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            削除
          </button>
        </div>
      </div>
    </div>
  )
}
