import type { RecentFolder } from './NewSessionModal'

const IconClock = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

interface RecentFoldersListProps {
  folders: RecentFolder[]
  onSelect: (folder: RecentFolder) => void
  disabled?: boolean
}

export function RecentFoldersList({ folders, onSelect, disabled }: RecentFoldersListProps): JSX.Element | null {
  if (folders.length === 0) {
    return null
  }

  return (
    <div>
      <div className="text-[11px] text-[#808080] uppercase mb-2 flex items-center gap-2">
        <IconClock /> 最近使用したフォルダー
      </div>
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {folders.map((folder, i) => (
          <div
            key={i}
            onClick={() => !disabled && onSelect(folder)}
            className={`p-3 border border-[#3c3c3c] hover:bg-[#2a2d2e] hover:border-[#007acc] rounded cursor-pointer flex justify-between items-center transition-colors ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium text-[#cccccc] text-[13px]">{folder.name}</div>
              <div className="text-[11px] text-[#808080] truncate">
                {folder.path}
              </div>
            </div>
            <span className="text-[11px] text-[#808080] ml-2 flex-shrink-0">{folder.date}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
