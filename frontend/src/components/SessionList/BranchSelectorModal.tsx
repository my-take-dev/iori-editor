import { useState, useEffect } from 'react'
import { GetBranchesForPath, type BranchInfo } from '../../wailsjs/go/main/App'
import { IconGitBranch, IconCloud, IconCheck } from '../Icons'
import type { BranchSelectorModalProps } from './types'

export function BranchSelectorModal({
  isOpen,
  workDir,
  currentBranch,
  isSwitching,
  onSelect,
  onCancel,
}: BranchSelectorModalProps): JSX.Element | null {
  const [branches, setBranches] = useState<BranchInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState('')

  useEffect(() => {
    if (isOpen && workDir) {
      setIsLoading(true)
      setSelectedBranch(currentBranch)
      GetBranchesForPath(workDir)
        .then((branchList) => {
          setBranches(branchList || [])
        })
        .catch((err) => {
          console.error('Failed to get branches:', err)
          setBranches([])
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [isOpen, workDir, currentBranch])

  if (!isOpen) return null

  const handleSelect = (): void => {
    if (selectedBranch && selectedBranch !== currentBranch) {
      onSelect(selectedBranch)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(2px)' }}
      onClick={onCancel}
    >
      <div
        className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-[400px] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-[#3c3c3c] bg-[#1e1e1e] rounded-t-lg">
          <h2 className="font-semibold text-[#cccccc] text-[14px]">ブランチを切り替え</h2>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="text-center text-[#808080] py-4">読み込み中...</div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto border border-[#3c3c3c] rounded">
              {branches.map((branch) => (
                <div
                  key={branch.name}
                  onClick={() => setSelectedBranch(branch.name)}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                    selectedBranch === branch.name
                      ? 'bg-[#094771] text-white'
                      : 'hover:bg-[#2a2d2e] text-[#cccccc]'
                  }`}
                >
                  <IconGitBranch size="sm" />
                  <span className="flex-1 text-[13px]">{branch.name}</span>
                  {branch.isRemote && (
                    <span className="flex items-center gap-0.5 text-[10px] bg-[#6e40c9] text-white px-1.5 py-0.5 rounded">
                      <IconCloud size="xs" />
                      リモート
                    </span>
                  )}
                  {branch.isCurrent && (
                    <span className="text-[10px] bg-[#0e639c] text-white px-1.5 py-0.5 rounded">
                      現在
                    </span>
                  )}
                  {selectedBranch === branch.name && <IconCheck size="sm" />}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 justify-end mt-4">
            <button
              onClick={onCancel}
              disabled={isSwitching}
              className="px-4 py-2 border border-[#3c3c3c] hover:bg-[#3c3c3c] disabled:opacity-50 rounded text-[#cccccc] text-[13px] transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedBranch || selectedBranch === currentBranch || isLoading || isSwitching}
              className="px-4 py-2 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#3c3c3c] disabled:text-[#808080] rounded text-white text-[13px] transition-colors"
            >
              {isSwitching ? '切り替え中...' : '切り替え'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
