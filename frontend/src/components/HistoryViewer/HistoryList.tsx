import { useCallback, useState } from 'react'
import type { HistoryInfo } from '../../types/history'
import { SkeletonList } from '../common/Skeleton'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { formatDate } from '../../utils/formatters'
import { IconHistory, IconRefresh, IconDelete } from '../Icons'

interface HistoryListProps {
  histories: HistoryInfo[]
  selectedFilename: string | null
  onSelect: (filename: string) => void
  onDelete: (filename: string) => void
  onRefresh: () => void
  isLoading?: boolean
}

export function HistoryList({
  histories,
  selectedFilename,
  onSelect,
  onDelete,
  onRefresh,
  isLoading = false,
}: HistoryListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const showSkeleton = isLoading && histories.length === 0
  const showEmpty = !isLoading && histories.length === 0

  const handleDeleteRequest = useCallback((e: React.MouseEvent, filename: string) => {
    e.stopPropagation()
    setDeleteConfirm(filename)
  }, [])

  const handleDeleteConfirm = useCallback(() => {
    if (deleteConfirm) {
      onDelete(deleteConfirm)
      setDeleteConfirm(null)
    }
  }, [deleteConfirm, onDelete])

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirm(null)
  }, [])

  return (
    <div className="w-64 flex flex-col border-r border-[#30363d] bg-[#161b22]">
      {/* Header */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-[#30363d]">
        <div className="flex items-center gap-2">
          <IconHistory size="sm" />
          <span className="text-[12px] text-[#c9d1d9] font-medium uppercase">History</span>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1 text-[#8b949e] hover:text-[#c9d1d9] transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <IconRefresh size="sm" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {showSkeleton ? (
          <div className="p-2">
            <SkeletonList count={6} itemHeight={44} showIcon={false} />
          </div>
        ) : showEmpty ? (
          <div className="flex items-center justify-center h-full text-[#8b949e]">
            <span className="text-[12px]">No history available</span>
          </div>
        ) : (
          histories.map((history) => {
            const isSelected = history.filename === selectedFilename
            return (
              <div
                key={history.filename}
                onClick={() => onSelect(history.filename)}
                className={`px-3 py-2 cursor-pointer border-b border-[#21262d] transition-colors group ${
                  isSelected
                    ? 'bg-[#1f6feb33] border-l-2 border-l-[#1f6feb]'
                    : 'hover:bg-[#21262d]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[12px] font-medium truncate ${isSelected ? 'text-[#58a6ff]' : 'text-[#c9d1d9]'}`}>
                    {history.sessionName}
                  </span>
                  <button
                    onClick={(e) => handleDeleteRequest(e, history.filename)}
                    className="p-1 text-[#8b949e] hover:text-[#f85149] opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete"
                  >
                    <IconDelete size="xs" />
                  </button>
                </div>
                <div className="mt-1">
                  <span className="text-[10px] text-[#8b949e]">
                    {formatDate(history.startedAt)}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title="履歴の削除"
        message="この履歴を削除しますか？"
        confirmLabel="削除"
        cancelLabel="キャンセル"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  )
}
