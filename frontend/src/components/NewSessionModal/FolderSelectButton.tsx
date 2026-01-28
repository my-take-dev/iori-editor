const IconFolder = () => (
  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
)

interface FolderSelectButtonProps {
  onClick: () => void
  isLoading: boolean
}

export function FolderSelectButton({ onClick, isLoading }: FolderSelectButtonProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="w-full h-16 border-2 border-dashed border-[#3c3c3c] hover:border-[#007acc] rounded-lg flex items-center justify-center gap-3 bg-[#1e1e1e] text-[#808080] hover:text-white transition-colors disabled:opacity-50"
    >
      {isLoading ? (
        <span className="animate-pulse text-[13px]">読み込み中...</span>
      ) : (
        <>
          <IconFolder />
          <span className="text-[13px]">フォルダーを開く...</span>
        </>
      )}
    </button>
  )
}
