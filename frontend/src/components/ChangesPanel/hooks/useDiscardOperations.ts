import { useState, useCallback } from 'react'
import type { DiscardConfirmState } from '../types'
import type { FileChange } from '../../../types/git'

export interface UseDiscardOperationsParams {
  unstagedFiles: FileChange[]
  onReject: (path: string) => void
  onRejectAll: (paths: string[]) => void
}

export interface UseDiscardOperationsReturn {
  discardConfirm: DiscardConfirmState | null
  discardAllConfirm: boolean
  handleDiscardRequest: (path: string, fileName: string) => void
  handleDiscardConfirm: () => void
  handleDiscardAllRequest: () => void
  handleDiscardAllConfirm: () => void
  cancelDiscard: () => void
  cancelDiscardAll: () => void
}

export function useDiscardOperations({
  unstagedFiles,
  onReject,
  onRejectAll,
}: UseDiscardOperationsParams): UseDiscardOperationsReturn {
  const [discardConfirm, setDiscardConfirm] = useState<DiscardConfirmState | null>(null)
  const [discardAllConfirm, setDiscardAllConfirm] = useState(false)

  const handleDiscardRequest = useCallback((path: string, fileName: string) => {
    setDiscardConfirm({ path, fileName })
  }, [])

  const handleDiscardConfirm = useCallback(() => {
    if (discardConfirm) {
      onReject(discardConfirm.path)
      setDiscardConfirm(null)
    }
  }, [discardConfirm, onReject])

  const handleDiscardAllRequest = useCallback(() => {
    setDiscardAllConfirm(true)
  }, [])

  const handleDiscardAllConfirm = useCallback(() => {
    onRejectAll(unstagedFiles.map((file) => file.path))
    setDiscardAllConfirm(false)
  }, [unstagedFiles, onRejectAll])

  const cancelDiscard = useCallback(() => {
    setDiscardConfirm(null)
  }, [])

  const cancelDiscardAll = useCallback(() => {
    setDiscardAllConfirm(false)
  }, [])

  return {
    discardConfirm,
    discardAllConfirm,
    handleDiscardRequest,
    handleDiscardConfirm,
    handleDiscardAllRequest,
    handleDiscardAllConfirm,
    cancelDiscard,
    cancelDiscardAll,
  }
}
