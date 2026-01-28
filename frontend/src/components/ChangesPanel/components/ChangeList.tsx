import type { ChangeListProps } from '../types'
import { IconChevronDown, IconChevronRight, IconPlus, IconMinus, IconUndo } from '../../Icons'
import { FileChangeItem, getFileName } from '../FileChangeItem'

export function ChangeList({
  stagedFiles,
  unstagedFiles,
  selectedIndex,
  pathToIndex,
  isStagedExpanded,
  isChangesExpanded,
  onToggleStagedExpanded,
  onToggleChangesExpanded,
  onSelectFile,
  onAccept,
  onUnstage,
  onDiscardRequest,
  onUnstageAllFiles,
  onStageAll,
  onDiscardAllRequest,
}: ChangeListProps): JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Staged Changes Section */}
      {stagedFiles.length > 0 && (
        <div>
          <div
            className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-[#2a2d2e] select-none group"
            onClick={onToggleStagedExpanded}
          >
            {isStagedExpanded ? <IconChevronDown /> : <IconChevronRight size="sm" />}
            <span className="text-[11px] font-semibold text-[#cccccc] uppercase flex-1">
              ステージされている変更
            </span>

            {/* Section action buttons */}
            <div className="hidden group-hover:flex items-center gap-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onUnstageAllFiles()
                }}
                className="p-0.5 hover:bg-[#3c3c3c] rounded text-[#cccccc]"
                title="すべての変更をステージ解除"
              >
                <IconMinus />
              </button>
            </div>

            {/* Count badge */}
            <span className="bg-[#4d4d4d] text-[#cccccc] text-[11px] font-medium px-1.5 rounded-full min-w-[18px] text-center">
              {stagedFiles.length}
            </span>
          </div>

          {isStagedExpanded && (
            <div className="pb-1">
              {stagedFiles.map((file) => {
                const fileIndex = pathToIndex.get(file.path) ?? -1
                return (
                  <FileChangeItem
                    key={file.path}
                    file={file}
                    isSelected={fileIndex === selectedIndex}
                    isStaged={true}
                    onSelect={() => onSelectFile(fileIndex)}
                    onAccept={() => onAccept(file.path)}
                    onUnstage={() => onUnstage(file.path)}
                    onDiscardRequest={() => onDiscardRequest(file.path, getFileName(file.path))}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Changes Section */}
      <div>
        <div
          className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-[#2a2d2e] select-none group"
          onClick={onToggleChangesExpanded}
        >
          {isChangesExpanded ? <IconChevronDown /> : <IconChevronRight size="sm" />}
          <span className="text-[11px] font-semibold text-[#cccccc] uppercase flex-1">
            変更
          </span>

          {/* Section action buttons */}
          {unstagedFiles.length > 0 && (
            <div className="hidden group-hover:flex items-center gap-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDiscardAllRequest()
                }}
                className="p-0.5 hover:bg-[#3c3c3c] rounded text-[#cccccc]"
                title="すべての変更を破棄"
              >
                <IconUndo />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onStageAll()
                }}
                className="p-0.5 hover:bg-[#3c3c3c] rounded text-[#cccccc]"
                title="すべての変更をステージ"
              >
                <IconPlus />
              </button>
            </div>
          )}

          {/* Count badge */}
          <span className="bg-[#4d4d4d] text-[#cccccc] text-[11px] font-medium px-1.5 rounded-full min-w-[18px] text-center">
            {unstagedFiles.length}
          </span>
        </div>

        {isChangesExpanded && (
          <div className="pb-1">
            {unstagedFiles.length === 0 ? (
              <div className="text-[#808080] text-center text-[12px] py-2">
                変更はありません
              </div>
            ) : (
              unstagedFiles.map((file) => {
                const fileIndex = pathToIndex.get(file.path) ?? -1
                return (
                  <FileChangeItem
                    key={file.path}
                    file={file}
                    isSelected={fileIndex === selectedIndex}
                    isStaged={false}
                    onSelect={() => onSelectFile(fileIndex)}
                    onAccept={() => onAccept(file.path)}
                    onUnstage={() => onUnstage(file.path)}
                    onDiscardRequest={() => onDiscardRequest(file.path, getFileName(file.path))}
                  />
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
