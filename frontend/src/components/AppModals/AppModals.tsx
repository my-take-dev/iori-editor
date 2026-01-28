import { useMemo } from 'react'
import { NewSessionModal } from '../NewSessionModal/NewSessionModal'
import { CloneModal } from '../CloneModal/CloneModal'
import { WorktreeModeModal } from '../WorktreeModeModal/WorktreeModeModal'
import { WorktreeCreateModal } from '../WorktreeCreateModal'
import { ServerModePanel } from '../ServerModePanel'

import { useSessionStore, selectSessions } from '../../stores/sessionStore'
import {
  useWorktreeStore,
  selectWorktreeModeSessionId,
} from '../../stores/worktreeStore'
import {
  useUIStore,
  selectIsNewSessionModalOpen,
  selectIsCloneModalOpen,
  selectIsWorktreeModeModalOpen,
  selectIsWorktreeCreateModalOpen,
  selectIsServerModeModalOpen,
  selectWorktreeModeTargetSessionId,
  selectServerModeContext,
} from '../../stores/uiStore'

import type { UseSessionHandlersReturn } from '../../hooks/useSessionHandlers'
import type { UseWorktreeHandlersReturn } from '../../hooks/useWorktreeHandlers'

import {
  GetBranchesForPath,
  CheckoutBranchForPath,
  CreateBranchForPath,
  UpdateBranchForPath,
} from '../../wailsjs/go/main/App'

interface AppModalsProps {
  sessionHandlers: UseSessionHandlersReturn
  worktreeHandlers: UseWorktreeHandlersReturn
}

/**
 * Application modal dialogs container
 */
export function AppModals({ sessionHandlers, worktreeHandlers }: AppModalsProps): JSX.Element {
  // UI Store
  const isNewSessionModalOpen = useUIStore(selectIsNewSessionModalOpen)
  const closeNewSessionModal = useUIStore((s) => s.closeNewSessionModal)
  const isCloneModalOpen = useUIStore(selectIsCloneModalOpen)
  const closeCloneModal = useUIStore((s) => s.closeCloneModal)
  const isWorktreeModeModalOpen = useUIStore(selectIsWorktreeModeModalOpen)
  const closeWorktreeModeModal = useUIStore((s) => s.closeWorktreeModeModal)
  const isWorktreeCreateModalOpen = useUIStore(selectIsWorktreeCreateModalOpen)
  const closeWorktreeCreateModal = useUIStore((s) => s.closeWorktreeCreateModal)
  const isServerModeModalOpen = useUIStore(selectIsServerModeModalOpen)
  const closeServerModeModal = useUIStore((s) => s.closeServerModeModal)
  const worktreeModeTargetSessionId = useUIStore(selectWorktreeModeTargetSessionId)
  const serverModeContext = useUIStore(selectServerModeContext)

  // Session Store
  const sessions = useSessionStore(selectSessions)

  // Worktree Store
  const worktreeModeSessionId = useWorktreeStore(selectWorktreeModeSessionId)

  // Derived values
  const targetSessionName = sessions.find((s) => s.id === worktreeModeTargetSessionId)?.name ?? ''
  const currentBranch = sessions.find((s) => s.id === worktreeModeSessionId)?.branch ?? 'main'
  const existingSessionPaths = useMemo(() => sessions.map((s) => s.workDir), [sessions])

  return (
    <>
      <NewSessionModal
        isOpen={isNewSessionModalOpen}
        onClose={closeNewSessionModal}
        onComplete={sessionHandlers.handleCompleteNewSession}
        onSelectFolder={sessionHandlers.handleSelectFolder}
        onGetBranches={GetBranchesForPath}
        onCheckoutBranch={CheckoutBranchForPath}
        onCreateBranch={CreateBranchForPath}
        onUpdateBranch={UpdateBranchForPath}
        recentFolders={sessionHandlers.recentFolders}
        existingSessionPaths={existingSessionPaths}
      />

      <CloneModal
        isOpen={isCloneModalOpen}
        onClose={closeCloneModal}
        onClone={sessionHandlers.handleClone}
        onSelectFolder={sessionHandlers.handleSelectFolder}
        onStartSession={sessionHandlers.handleStartSessionFromClone}
      />

      <WorktreeModeModal
        isOpen={isWorktreeModeModalOpen}
        sessionName={targetSessionName}
        onClose={closeWorktreeModeModal}
        onSelectSingle={worktreeHandlers.handleSelectWorktreeSingleMode}
        onSelectCompetition={() => {}}
      />

      <WorktreeCreateModal
        isOpen={isWorktreeCreateModalOpen}
        branches={worktreeHandlers.worktreeBranches}
        existingWorktrees={worktreeHandlers.existingWorktrees}
        currentBranch={currentBranch}
        onClose={closeWorktreeCreateModal}
        onCreateNew={worktreeHandlers.handleCreateWorktree}
        onSelectExisting={worktreeHandlers.handleAttachExistingWorktree}
        onUpdateBranch={worktreeHandlers.handleUpdateBranchForWorktree}
      />

      <ServerModePanel
        isOpen={isServerModeModalOpen}
        onClose={closeServerModeModal}
        sessionId={serverModeContext?.sessionId}
        baseBranch={serverModeContext?.baseBranch}
        repoPath={serverModeContext?.repoPath}
      />
    </>
  )
}
