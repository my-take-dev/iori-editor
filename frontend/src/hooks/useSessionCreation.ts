import { useState, useCallback } from 'react'
import { useUIStore } from '../stores/uiStore'
import { useSessionStore } from '../stores/sessionStore'
import { useAIStatusStore } from '../stores/aiStatusStore'
import type { RecentFolder, GitOption } from '../components/NewSessionModal/NewSessionModal'
import {
  SelectDirectory,
  CreateSessionWithGitOption,
  GetRecentFolders,
  AddRecentFolder,
  CloneRepository,
} from '../wailsjs/go/main/App'

export interface UseSessionCreationReturn {
  // State
  recentFolders: RecentFolder[]
  setRecentFolders: (folders: RecentFolder[]) => void

  // Handlers
  handleSelectFolder: () => Promise<string>
  handleCompleteNewSession: (gitOption: GitOption, folderPath: string, branchName?: string) => Promise<void>
  handleClone: (url: string, destPath: string) => Promise<string>
  handleStartSessionFromClone: (folderPath: string) => Promise<void>
}

/**
 * Hook for session creation handlers
 * Handles folder selection, session creation, and repository cloning
 */
export function useSessionCreation(): UseSessionCreationReturn {
  // Local state
  const [recentFolders, setRecentFolders] = useState<RecentFolder[]>([])

  // UI Store
  const isCreating = useUIStore((s) => s.isCreating)
  const setIsCreating = useUIStore((s) => s.setIsCreating)
  const closeNewSessionModal = useUIStore((s) => s.closeNewSessionModal)
  const closeCloneModal = useUIStore((s) => s.closeCloneModal)

  // Session Store
  const addSession = useSessionStore((s) => s.addSession)

  // AI Status Store
  const setAiWaiting = useAIStatusStore((s) => s.setWaiting)

  // Select directory for new session
  const handleSelectFolder = useCallback(async () => {
    return SelectDirectory()
  }, [])

  // Complete session creation from modal
  const handleCompleteNewSession = useCallback(async (gitOption: GitOption, folderPath: string, branchName?: string) => {
    if (isCreating || !folderPath) return
    setIsCreating(true)
    closeNewSessionModal()
    console.time('[Perf] handleCompleteNewSession total')
    try {
      // Add to recent folders
      await AddRecentFolder(folderPath)
      // Refresh recent folders list
      const folders = await GetRecentFolders()
      setRecentFolders(folders || [])

      // Extract folder name for session name
      const folderName = folderPath.split(/[/\\]/).pop() || 'New Session'

      // Create session with git option
      console.time('[Perf] CreateSessionWithGitOption (frontend)')
      const session = await CreateSessionWithGitOption(folderName, folderPath, gitOption, branchName || '')
      console.timeEnd('[Perf] CreateSessionWithGitOption (frontend)')
      addSession(session)
      // Set initial AI status to waiting
      setAiWaiting(session.id)
    } catch (err) {
      console.error('Failed to create session:', err)
    } finally {
      console.timeEnd('[Perf] handleCompleteNewSession total')
      setIsCreating(false)
    }
  }, [isCreating, addSession, setIsCreating, closeNewSessionModal, setAiWaiting])

  // Clone handler
  const handleClone = useCallback(async (url: string, destPath: string) => {
    return CloneRepository(url, destPath)
  }, [])

  // Start session from cloned path - directly create session with current branch
  const handleStartSessionFromClone = useCallback(async (folderPath: string) => {
    if (isCreating) return
    setIsCreating(true)
    closeCloneModal()

    try {
      // Add to recent folders
      await AddRecentFolder(folderPath)
      // Refresh recent folders list
      const folders = await GetRecentFolders()
      setRecentFolders(folders || [])

      // Extract folder name for session name
      const folderName = folderPath.split(/[/\\]/).pop() || 'New Session'

      // Create session with current branch (cloned repo will have default branch)
      const session = await CreateSessionWithGitOption(folderName, folderPath, 'current', '')
      addSession(session)
      // Set initial AI status to waiting
      setAiWaiting(session.id)
    } catch (err) {
      console.error('Failed to create session:', err)
    } finally {
      setIsCreating(false)
    }
  }, [isCreating, addSession, setIsCreating, closeCloneModal, setAiWaiting])

  return {
    // State
    recentFolders,
    setRecentFolders,

    // Handlers
    handleSelectFolder,
    handleCompleteNewSession,
    handleClone,
    handleStartSessionFromClone,
  }
}
