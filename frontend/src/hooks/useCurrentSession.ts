import { useSessionStore, selectActiveSession } from '../stores/sessionStore'
import {
  useWorktreeStore,
  selectActiveWorktreeSessionObject,
  selectIsWorktreeMode,
} from '../stores/worktreeStore'
import { useUIStore, selectViewMode } from '../stores/uiStore'

export interface CurrentSessionInfo {
  session: ReturnType<typeof selectActiveSession>
  sessionId: string | undefined
  isGitRepo: boolean
  workDir: string | undefined
  branch: string | undefined
  isWorktreeMode: boolean
}

/**
 * セッション解決ロジックを一元化するフック
 * isWorktreeModeかつviewModeがworktree以外の場合はactiveWorktreeSessionを返す
 */
export function useCurrentSession(): CurrentSessionInfo {
  const viewMode = useUIStore(selectViewMode)
  const activeSession = useSessionStore(selectActiveSession)
  const activeWorktreeSession = useWorktreeStore(selectActiveWorktreeSessionObject)
  const isWorktreeMode = useWorktreeStore(selectIsWorktreeMode)

  // Worktreeモードかつworktreeタブ以外の場合はworktreeSessionを使用
  const session = isWorktreeMode && viewMode !== 'worktree'
    ? activeWorktreeSession
    : activeSession

  return {
    session,
    sessionId: session?.id,
    isGitRepo: session?.isGitRepo ?? false,
    workDir: session?.workDir,
    branch: session?.branch,
    isWorktreeMode,
  }
}
