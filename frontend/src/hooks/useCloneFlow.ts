import { useState, useEffect, useCallback } from 'react'
import type { CloneStep } from '../components/CloneModal/types'

interface UseCloneFlowProps {
  isOpen: boolean
  onClone: (url: string, destPath: string) => Promise<string>
  onSelectFolder: () => Promise<string>
  onStartSession: (folderPath: string) => void
  onClose: () => void
}

interface UseCloneFlowReturn {
  step: CloneStep
  url: string
  destPath: string
  clonedPath: string
  error: string
  setUrl: (url: string) => void
  handleSelectDestination: () => Promise<void>
  handleClone: () => Promise<void>
  handleStartSession: () => void
  goBackToInput: () => void
  isValidUrl: (testUrl: string) => boolean
  getRepoName: (repoUrl: string) => string
}

const URL_PATTERNS = [
  /^https:\/\/github\.com\/[^/]+\/[^/]+/,
  /^git@github\.com:[^/]+\/[^/]+/,
  /^https:\/\/gitlab\.com\/[^/]+\/[^/]+/,
  /^https:\/\/bitbucket\.org\/[^/]+\/[^/]+/,
]

function isValidUrl(testUrl: string): boolean {
  return URL_PATTERNS.some((pattern) => pattern.test(testUrl))
}

function getRepoName(repoUrl: string): string {
  const match = repoUrl.match(/\/([^/]+?)(\.git)?$/)
  return match ? match[1] : ''
}

export function useCloneFlow({
  isOpen,
  onClone,
  onSelectFolder,
  onStartSession,
  onClose,
}: UseCloneFlowProps): UseCloneFlowReturn {
  const [step, setStep] = useState<CloneStep>('input')
  const [url, setUrl] = useState('')
  const [destPath, setDestPath] = useState('')
  const [clonedPath, setClonedPath] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setStep('input')
      setUrl('')
      setDestPath('')
      setClonedPath('')
      setError('')
    }
  }, [isOpen])

  const handleSelectDestination = useCallback(async () => {
    try {
      const path = await onSelectFolder()
      if (path) {
        setDestPath(path)
      }
    } catch (err) {
      console.error('Failed to select folder:', err)
    }
  }, [onSelectFolder])

  const handleClone = useCallback(async () => {
    if (!url.trim() || !destPath) return

    setStep('cloning')
    setError('')

    try {
      const repoName = getRepoName(url)
      const fullDestPath = repoName ? `${destPath}\\${repoName}` : destPath

      const result = await onClone(url.trim(), fullDestPath)
      setClonedPath(result)
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'クローンに失敗しました')
      setStep('error')
    }
  }, [url, destPath, onClone])

  const handleStartSession = useCallback(() => {
    onStartSession(clonedPath)
    onClose()
  }, [clonedPath, onStartSession, onClose])

  const goBackToInput = useCallback(() => {
    setStep('input')
  }, [])

  return {
    step,
    url,
    destPath,
    clonedPath,
    error,
    setUrl,
    handleSelectDestination,
    handleClone,
    handleStartSession,
    goBackToInput,
    isValidUrl,
    getRepoName,
  }
}
