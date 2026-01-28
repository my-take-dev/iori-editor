import { useEffect } from 'react'
import type { CommitSectionProps } from '../types'
import { IconGitBranch, IconSync, IconChevronDown } from '../../Icons'
import { TemplateDropdown } from './TemplateDropdown'

export function CommitSection({
  branch,
  ahead,
  behind,
  commitMessage,
  onCommitMessageChange,
  onCommit,
  onCommitAndPush,
  onPush,
  onPull,
  isDropdownOpen,
  onToggleDropdown,
  dropdownRef,
  textareaRef,
  stagedFilesCount,
  onSelectTemplate,
  onOpenTemplateManager,
}: CommitSectionProps): JSX.Element {
  const isCommitDisabled = !commitMessage.trim() || stagedFilesCount === 0

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [commitMessage, textareaRef])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.ctrlKey && e.key === 'Enter') {
      onCommit()
    }
  }

  return (
    <div className="border-b border-[#3c3c3c]">
      {/* Branch info */}
      <div className="flex items-center gap-1 px-2 py-1.5 text-[13px] text-[#cccccc]">
        <IconGitBranch size="sm" />
        <span className="font-medium">{branch || 'main'}</span>
        {(ahead > 0 || behind > 0) && (
          <span className="flex items-center gap-1 text-[11px] text-[#808080] ml-1">
            <IconSync size="sm" />
            {behind > 0 && <span>↓{behind}</span>}
            {ahead > 0 && <span>↑{ahead}</span>}
          </span>
        )}
      </div>

      {/* Commit message header with template dropdown */}
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="text-[12px] text-[#808080]">コミットメッセージ</span>
        <TemplateDropdown
          onSelectTemplate={onSelectTemplate}
          onOpenManager={onOpenTemplateManager}
        />
      </div>

      {/* Commit message input */}
      <div className="px-2 pb-2">
        <textarea
          ref={textareaRef}
          className="w-full bg-[#3c3c3c] border border-[#3c3c3c] focus:border-[#007acc] rounded px-2 py-1.5 text-[13px] text-[#cccccc] placeholder-[#808080] resize-none focus:outline-none"
          placeholder="メッセージ (Ctrl+Enter でコミット)"
          value={commitMessage}
          onChange={(e) => onCommitMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
      </div>

      {/* Commit button with dropdown */}
      <div className="px-2 pb-2 relative" ref={dropdownRef}>
        <div className="flex">
          <button
            onClick={onCommitAndPush}
            disabled={isCommitDisabled}
            className="flex-1 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#3c3c3c] disabled:text-[#808080] text-white text-[13px] font-medium rounded-l transition-colors"
          >
            ↑ コミットしてプッシュ
          </button>
          <button
            onClick={onToggleDropdown}
            className="px-2 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white rounded-r border-l border-[#007acc]"
          >
            <IconChevronDown size="sm" />
          </button>
        </div>
        {isDropdownOpen && (
          <div className="absolute top-full left-2 right-2 mt-1 bg-[#252526] border border-[#3c3c3c] rounded shadow-lg z-50">
            <button
              onClick={onCommit}
              disabled={isCommitDisabled}
              className="w-full px-3 py-1.5 text-left text-[13px] text-[#cccccc] hover:bg-[#094771] disabled:text-[#808080]"
            >
              コミット
            </button>
            <button
              onClick={onCommitAndPush}
              disabled={isCommitDisabled}
              className="w-full px-3 py-1.5 text-left text-[13px] text-[#cccccc] hover:bg-[#094771] disabled:text-[#808080]"
            >
              コミットしてプッシュ
            </button>
            <div className="border-t border-[#3c3c3c]" />
            <button
              onClick={onPush}
              className="w-full px-3 py-1.5 text-left text-[13px] text-[#cccccc] hover:bg-[#094771]"
            >
              プッシュ
            </button>
            {onPull && (
              <button
                onClick={onPull}
                className="w-full px-3 py-1.5 text-left text-[13px] text-[#cccccc] hover:bg-[#094771]"
              >
                プル
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
