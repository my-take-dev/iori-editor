export type ClientType = 'desktop' | 'browser'

export interface Session {
  id: string
  name: string
  workDir: string
  createdAt: string
  isActive: boolean
  isGitRepo: boolean
  branch: string
  clientType?: ClientType

  // Worktree-related fields
  isWorktree: boolean
  parentRepoPath: string
  parentSessionId: string
  worktreeSessions: string[]
}

export type TerminalType = 'ai' | 'user'

export interface TerminalOutput {
  sessionId: string
  terminalType: TerminalType
  data: string
}
