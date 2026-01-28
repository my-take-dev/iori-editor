import { IconFolder } from '../../Icons'

interface CloneInputFormProps {
  url: string
  destPath: string
  repoName: string
  isValidUrl: boolean
  onUrlChange: (url: string) => void
  onSelectDestination: () => void
  onClone: () => void
}

export function CloneInputForm({
  url,
  destPath,
  repoName,
  isValidUrl,
  onUrlChange,
  onSelectDestination,
  onClone,
}: CloneInputFormProps): JSX.Element {
  const canClone = url.trim() && destPath && isValidUrl

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[12px] text-[#808080] mb-2">
          リポジトリ URL
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://github.com/username/repository.git"
          className="w-full px-3 py-2 bg-[#3c3c3c] border border-[#3c3c3c] focus:border-[#007acc] rounded text-[#cccccc] text-[13px] placeholder-[#808080] focus:outline-none"
          autoFocus
        />
        {url && !isValidUrl && (
          <div className="text-[11px] text-[#f14c4c] mt-1">
            有効なリポジトリURLを入力してください
          </div>
        )}
      </div>

      <div>
        <label className="block text-[12px] text-[#808080] mb-2">
          保存先フォルダ
        </label>
        <div className="flex gap-2">
          <div
            onClick={onSelectDestination}
            className="flex-1 px-3 py-2 bg-[#3c3c3c] border border-[#3c3c3c] hover:border-[#007acc] rounded text-[13px] cursor-pointer flex items-center gap-2 transition-colors"
          >
            <IconFolder />
            {destPath ? (
              <span className="text-[#cccccc] truncate">{destPath}</span>
            ) : (
              <span className="text-[#808080]">フォルダを選択...</span>
            )}
          </div>
        </div>
        {destPath && repoName && (
          <div className="text-[11px] text-[#808080] mt-1">
            クローン先: {destPath}\{repoName}
          </div>
        )}
      </div>

      <button
        onClick={onClone}
        disabled={!canClone}
        className="w-full py-2 px-3 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#3c3c3c] disabled:text-[#808080] rounded font-medium text-white text-[13px] transition-colors"
      >
        クローン
      </button>
    </div>
  )
}
