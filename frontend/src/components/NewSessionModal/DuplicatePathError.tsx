interface DuplicatePathErrorProps {
  selectedPath: string
  onSelectDifferent: () => void
}

export function DuplicatePathError({
  selectedPath,
  onSelectDifferent,
}: DuplicatePathErrorProps): JSX.Element {
  return (
    <div className="space-y-3">
      <div className="text-[12px] text-[#808080] mb-3">
        <span className="text-[#007acc]">{selectedPath}</span>
        <div className="mt-2 p-3 bg-[#5c2020] rounded border border-[#f14c4c]">
          <div className="flex items-center gap-2 text-[#f14c4c]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">このフォルダは既に開いています</span>
          </div>
          <div className="mt-2 text-[11px] text-[#cccccc]">
            同じフォルダで複数のセッションを開くことはできません。
            別のブランチで作業したい場合は、既存セッションの worktree モードをご利用ください。
          </div>
        </div>
      </div>

      <button
        onClick={onSelectDifferent}
        className="w-full py-2 px-3 border border-[#3c3c3c] hover:bg-[#3c3c3c] rounded text-[#cccccc] text-[13px] transition-colors"
      >
        別のフォルダを選択
      </button>
    </div>
  )
}
