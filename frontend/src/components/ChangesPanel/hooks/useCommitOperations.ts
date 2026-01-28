import { useState, useCallback } from 'react'
import type { GitOperationResult } from '../../../hooks/useGitOperations'

export interface UseCommitOperationsParams {
  commitMessage: string
  setCommitMessage: (msg: string) => void
  setIsDropdownOpen: (open: boolean) => void
  onCommit: (message: string) => void | Promise<void> | Promise<GitOperationResult>
  onPush: () => void | Promise<void> | Promise<GitOperationResult>
  onPull?: () => void | Promise<void> | Promise<GitOperationResult>
  stagedFilesCount: number
}

export interface UseCommitOperationsReturn {
  operationError: string | null
  setOperationError: (error: string | null) => void
  clearOperationError: () => void
  handleCommit: () => Promise<void>
  handleCommitAndPush: () => Promise<void>
  handleMenuCommit: () => Promise<void>
  handlePush: () => Promise<void>
  handlePull: () => Promise<void>
}

export function useCommitOperations({
  commitMessage,
  setCommitMessage,
  setIsDropdownOpen,
  onCommit,
  onPush,
  onPull,
  stagedFilesCount,
}: UseCommitOperationsParams): UseCommitOperationsReturn {
  const [operationError, setOperationError] = useState<string | null>(null)

  const clearOperationError = useCallback(() => setOperationError(null), [])

  const handleCommit = useCallback(async () => {
    if (commitMessage.trim()) {
      clearOperationError()
      const result = await onCommit(commitMessage)
      if (!result || (typeof result === 'object' && result.success)) {
        setCommitMessage('')
      } else if (typeof result === 'object' && result.error) {
        setOperationError(result.error)
      }
    }
    setIsDropdownOpen(false)
  }, [commitMessage, onCommit, setCommitMessage, setIsDropdownOpen, clearOperationError])

  const handleCommitAndPush = useCallback(async () => {
    if (commitMessage.trim()) {
      clearOperationError()
      const commitResult = await onCommit(commitMessage)
      if (!commitResult || (typeof commitResult === 'object' && commitResult.success)) {
        setCommitMessage('')
        const pushResult = await onPush()
        if (typeof pushResult === 'object' && !pushResult.success && pushResult.error) {
          setOperationError(`コミットは成功しましたが、プッシュに失敗しました: ${pushResult.error}`)
        }
      } else if (typeof commitResult === 'object' && commitResult.error) {
        setOperationError(commitResult.error)
      }
    }
    setIsDropdownOpen(false)
  }, [commitMessage, onCommit, onPush, setCommitMessage, setIsDropdownOpen, clearOperationError])

  const handleMenuCommit = useCallback(async () => {
    if (commitMessage.trim() && stagedFilesCount > 0) {
      clearOperationError()
      const result = await onCommit(commitMessage)
      if (!result || (typeof result === 'object' && result.success)) {
        setCommitMessage('')
      } else if (typeof result === 'object' && result.error) {
        setOperationError(result.error)
      }
    }
  }, [commitMessage, stagedFilesCount, onCommit, setCommitMessage, clearOperationError])

  const handlePush = useCallback(async () => {
    clearOperationError()
    setIsDropdownOpen(false)
    const result = await onPush()
    if (typeof result === 'object' && !result.success && result.error) {
      setOperationError(result.error)
    }
  }, [onPush, setIsDropdownOpen, clearOperationError])

  const handlePull = useCallback(async () => {
    clearOperationError()
    setIsDropdownOpen(false)
    const result = await onPull?.()
    if (typeof result === 'object' && !result.success && result.error) {
      setOperationError(result.error)
    }
  }, [onPull, setIsDropdownOpen, clearOperationError])

  return {
    operationError,
    setOperationError,
    clearOperationError,
    handleCommit,
    handleCommitAndPush,
    handleMenuCommit,
    handlePush,
    handlePull,
  }
}
