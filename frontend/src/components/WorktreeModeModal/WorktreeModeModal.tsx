import { useEffect } from 'react'

// Icons
const IconGitBranch = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7v10M17 7v4m0 0a3 3 0 01-3 3H7m10-3l-3-3m3 3l3-3" />
  </svg>
)

const IconSingle = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
)

const IconCompetition = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
)

interface WorktreeModeModalProps {
  isOpen: boolean
  sessionName: string
  onClose: () => void
  onSelectSingle: () => void
  onSelectCompetition: () => void
}

export function WorktreeModeModal({
  isOpen,
  sessionName,
  onClose,
  onSelectSingle,
  onSelectCompetition: _onSelectCompetition,
}: WorktreeModeModalProps) {
  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-[420px] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-[#3c3c3c] flex justify-between items-center bg-[#1e1e1e] rounded-t-lg">
          <div className="flex items-center gap-2">
            <IconGitBranch />
            <h2 className="font-semibold text-[#cccccc] text-[14px]">Worktree Mode</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#808080] hover:text-white transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <div className="text-[12px] text-[#808080] mb-3">
            <span className="text-[#4ec9b0]">{sessionName}</span> の Worktree モードを選択
          </div>

          {/* Single Mode */}
          <button
            onClick={onSelectSingle}
            className="w-full p-4 text-left border border-[#3c3c3c] hover:bg-[#2a2d2e] hover:border-[#007acc] rounded transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#0e639c] rounded">
                <IconSingle />
              </div>
              <div>
                <div className="font-medium text-[#cccccc] text-[14px]">Single Mode</div>
                <div className="text-[11px] text-[#808080] mt-1">
                  複数の worktree を並行して作業
                </div>
              </div>
            </div>
          </button>

          {/* Competition Mode (Coming Soon) */}
          <button
            disabled
            className="w-full p-4 text-left border border-[#3c3c3c] rounded opacity-50 cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#3c3c3c] rounded">
                <IconCompetition />
              </div>
              <div>
                <div className="font-medium text-[#808080] text-[14px]">Competition Mode</div>
                <div className="text-[11px] text-[#555] mt-1">
                  Coming Soon...
                </div>
              </div>
            </div>
          </button>

          {/* Cancel */}
          <button
            onClick={onClose}
            className="w-full py-2 px-3 border border-[#3c3c3c] hover:bg-[#3c3c3c] rounded text-[#cccccc] text-[13px] transition-colors mt-4"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
