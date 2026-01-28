// Wails Go bindings stub - will be overwritten by Wails build
import type { Session } from '../../../types/session'
import type { FileChange } from '../../../types/git'
import type { HistoryInfo, TerminalHistory, HistoryChunk } from '../../../types/history'

export function CreateSession(name: string, workDir: string): Promise<Session> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.CreateSession) {
    return (window as any).go.main.App.CreateSession(name, workDir)
  }
  return Promise.resolve({
    id: 'mock',
    name,
    workDir,
    createdAt: new Date().toISOString(),
    isActive: true,
    isGitRepo: false,
    branch: '',
    isWorktree: false,
    parentRepoPath: '',
    parentSessionId: '',
    worktreeSessions: [],
  })
}

export function CreateSessionWithGitOption(name: string, workDir: string, gitOption: string, branchName: string): Promise<Session> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.CreateSessionWithGitOption) {
    return (window as any).go.main.App.CreateSessionWithGitOption(name, workDir, gitOption, branchName)
  }
  return Promise.resolve({
    id: 'mock',
    name,
    workDir,
    createdAt: new Date().toISOString(),
    isActive: true,
    isGitRepo: gitOption !== 'none',
    branch: branchName || 'main',
    isWorktree: false,
    parentRepoPath: '',
    parentSessionId: '',
    worktreeSessions: [],
  })
}

export function GetSessions(): Promise<Session[]> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.GetSessions) {
    return (window as any).go.main.App.GetSessions()
  }
  return Promise.resolve([])
}

export function SetActiveSession(sessionId: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.SetActiveSession) {
    return (window as any).go.main.App.SetActiveSession(sessionId)
  }
  return Promise.resolve()
}

export function DeleteSession(sessionId: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.DeleteSession) {
    return (window as any).go.main.App.DeleteSession(sessionId)
  }
  return Promise.resolve()
}

export function WriteToTerminal(sessionId: string, terminalType: string, data: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.WriteToTerminal) {
    return (window as any).go.main.App.WriteToTerminal(sessionId, terminalType, data)
  }
  return Promise.resolve()
}

export function ResizeTerminal(sessionId: string, terminalType: string, cols: number, rows: number): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.ResizeTerminal) {
    return (window as any).go.main.App.ResizeTerminal(sessionId, terminalType, cols, rows)
  }
  return Promise.resolve()
}
export function GetTerminalHistory(sessionId: string, terminalType: string): Promise<string> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.GetTerminalHistory) {
    return (window as any).go.main.App.GetTerminalHistory(sessionId, terminalType)
  }
  return Promise.resolve('')
}

export function GetChanges(sessionId: string): Promise<FileChange[]> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.GetChanges) {
    return (window as any).go.main.App.GetChanges(sessionId)
  }
  return Promise.resolve([])
}

export function GetFileDiff(sessionId: string, path: string): Promise<{ original: string; modified: string }> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.GetFileDiff) {
    return (window as any).go.main.App.GetFileDiff(sessionId, path)
  }
  return Promise.resolve({ original: '', modified: '' })
}

export function AcceptChange(sessionId: string, path: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.AcceptChange) {
    return (window as any).go.main.App.AcceptChange(sessionId, path)
  }
  return Promise.resolve()
}

export function UnstageChange(sessionId: string, path: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.UnstageChange) {
    return (window as any).go.main.App.UnstageChange(sessionId, path)
  }
  return Promise.resolve()
}

export function RejectChange(sessionId: string, path: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.RejectChange) {
    return (window as any).go.main.App.RejectChange(sessionId, path)
  }
  return Promise.resolve()
}

// Batch operation result type
export interface BatchOperationResult {
  succeeded: string[]
  failed: { path: string; error: string }[]
}

// Batch operations for staging multiple files at once
export function AcceptChanges(sessionId: string, paths: string[]): Promise<BatchOperationResult> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.AcceptChanges) {
    return (window as any).go.main.App.AcceptChanges(sessionId, paths)
  }
  return Promise.resolve({ succeeded: paths, failed: [] })
}

export function UnstageChanges(sessionId: string, paths: string[]): Promise<BatchOperationResult> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.UnstageChanges) {
    return (window as any).go.main.App.UnstageChanges(sessionId, paths)
  }
  return Promise.resolve({ succeeded: paths, failed: [] })
}

export function RejectChanges(sessionId: string, paths: string[]): Promise<BatchOperationResult> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.RejectChanges) {
    return (window as any).go.main.App.RejectChanges(sessionId, paths)
  }
  return Promise.resolve({ succeeded: paths, failed: [] })
}

export function CommitChanges(sessionId: string, message: string): Promise<string> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.CommitChanges) {
    return (window as any).go.main.App.CommitChanges(sessionId, message)
  }
  return Promise.resolve('')
}

export function PushChanges(sessionId: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.PushChanges) {
    return (window as any).go.main.App.PushChanges(sessionId)
  }
  return Promise.resolve()
}

export function PullChanges(sessionId: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.PullChanges) {
    return (window as any).go.main.App.PullChanges(sessionId)
  }
  return Promise.resolve()
}

export function FetchChanges(sessionId: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.FetchChanges) {
    return (window as any).go.main.App.FetchChanges(sessionId)
  }
  return Promise.resolve()
}

export interface GitSyncInfo {
  hasRemote: boolean
  ahead: number
  behind: number
}

export function GetGitSyncInfo(sessionId: string): Promise<GitSyncInfo> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.GetGitSyncInfo) {
    return (window as any).go.main.App.GetGitSyncInfo(sessionId)
  }
  return Promise.resolve({ hasRemote: false, ahead: 0, behind: 0 })
}

export function ReadFile(sessionId: string, relativePath: string): Promise<string> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.ReadFile) {
    return (window as any).go.main.App.ReadFile(sessionId, relativePath)
  }
  return Promise.resolve('')
}

export interface FileMetadata {
  path: string
  size: number
  isDir: boolean
}

export function GetFileInfo(sessionId: string, relativePath: string): Promise<FileMetadata> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.GetFileInfo) {
    return (window as any).go.main.App.GetFileInfo(sessionId, relativePath)
  }
  return Promise.resolve({ path: relativePath, size: 0, isDir: false })
}

export interface PartialFileContent {
  content: string
  isTruncated: boolean
}

export function ReadFilePartial(sessionId: string, relativePath: string, maxBytes: number): Promise<PartialFileContent> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.ReadFilePartial) {
    return (window as any).go.main.App.ReadFilePartial(sessionId, relativePath, maxBytes)
  }
  return Promise.resolve({ content: '', isTruncated: false })
}

export function WriteFile(sessionId: string, relativePath: string, content: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.WriteFile) {
    return (window as any).go.main.App.WriteFile(sessionId, relativePath, content)
  }
  return Promise.resolve()
}

export function RenameFile(sessionId: string, oldPath: string, newPath: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.RenameFile) {
    return (window as any).go.main.App.RenameFile(sessionId, oldPath, newPath)
  }
  return Promise.resolve()
}

export function DeleteFile(sessionId: string, relativePath: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.DeleteFile) {
    return (window as any).go.main.App.DeleteFile(sessionId, relativePath)
  }
  return Promise.resolve()
}

export function SelectDirectory(): Promise<string> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.SelectDirectory) {
    return (window as any).go.main.App.SelectDirectory()
  }
  return Promise.resolve('')
}

export interface RecentFolder {
  path: string
  name: string
  date: string
}

export function GetRecentFolders(): Promise<RecentFolder[]> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.GetRecentFolders) {
    return (window as any).go.main.App.GetRecentFolders()
  }
  return Promise.resolve([])
}

export function AddRecentFolder(path: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.AddRecentFolder) {
    return (window as any).go.main.App.AddRecentFolder(path)
  }
  return Promise.resolve()
}

export interface FileNode {
  name: string
  path: string
  isDir: boolean
  hasChildren?: boolean
  children?: FileNode[]
}

export function GetFileTree(sessionId: string): Promise<FileNode[]> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.GetFileTree) {
    return (window as any).go.main.App.GetFileTree(sessionId)
  }
  return Promise.resolve([])
}

export function GetDirectoryChildren(sessionId: string, path: string): Promise<FileNode[]> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.GetDirectoryChildren) {
    return (window as any).go.main.App.GetDirectoryChildren(sessionId, path)
  }
  return Promise.resolve([])
}

export interface BranchInfo {
  name: string
  isCurrent: boolean
  isRemote: boolean
}

export function GetBranchesForPath(path: string): Promise<BranchInfo[]> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.GetBranchesForPath) {
    return (window as any).go.main.App.GetBranchesForPath(path)
  }
  return Promise.resolve([])
}

export function GetBranchesForWorktreeCreate(path: string): Promise<BranchInfo[]> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.GetBranchesForWorktreeCreate) {
    return (window as any).go.main.App.GetBranchesForWorktreeCreate(path)
  }
  return Promise.resolve([])
}

export function CheckoutBranchForPath(path: string, branchName: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.CheckoutBranchForPath) {
    return (window as any).go.main.App.CheckoutBranchForPath(path, branchName)
  }
  return Promise.resolve()
}

export function CreateBranchForPath(path: string, newBranchName: string, baseBranchName: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.CreateBranchForPath) {
    return (window as any).go.main.App.CreateBranchForPath(path, newBranchName, baseBranchName)
  }
  return Promise.resolve()
}

export interface PullResult {
  success: boolean
  errorMsg?: string
}

export function UpdateBranchForPath(path: string, branchName: string, isRemote: boolean): Promise<PullResult> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.UpdateBranchForPath) {
    return (window as any).go.main.App.UpdateBranchForPath(path, branchName, isRemote)
  }
  return Promise.resolve({ success: true })
}

export interface ResourceUsage {
  cpuPercent: number
  memoryMB: number
  memoryPercent: number
}

export function GetResourceUsage(): Promise<ResourceUsage> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.GetResourceUsage) {
    return (window as any).go.main.App.GetResourceUsage()
  }
  return Promise.resolve({ cpuPercent: 0, memoryMB: 0, memoryPercent: 0 })
}

export function CloneRepository(url: string, destPath: string): Promise<string> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.CloneRepository) {
    return (window as any).go.main.App.CloneRepository(url, destPath)
  }
  return Promise.resolve('')
}

// Worktree operations
export interface WorktreeInfo {
  path: string
  branch: string
  isMain: boolean
  isDetached: boolean
  isOpened: boolean
}

export function CreateWorktreeSession(parentSessionId: string, baseBranch: string, customName: string): Promise<Session> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.CreateWorktreeSession) {
    return (window as any).go.main.App.CreateWorktreeSession(parentSessionId, baseBranch, customName)
  }
  return Promise.resolve({
    id: 'mock-worktree',
    name: `${baseBranch}-${customName}`,
    workDir: '',
    createdAt: new Date().toISOString(),
    isActive: true,
    isGitRepo: true,
    branch: baseBranch,
    isWorktree: true,
    parentRepoPath: '',
    parentSessionId,
    worktreeSessions: [],
  })
}

export function GetExistingWorktrees(sessionId: string): Promise<WorktreeInfo[]> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.GetExistingWorktrees) {
    return (window as any).go.main.App.GetExistingWorktrees(sessionId)
  }
  return Promise.resolve([])
}

export function AttachExistingWorktree(parentSessionId: string, worktreePath: string): Promise<Session> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.AttachExistingWorktree) {
    return (window as any).go.main.App.AttachExistingWorktree(parentSessionId, worktreePath)
  }
  return Promise.resolve({
    id: 'mock-worktree',
    name: 'attached',
    workDir: worktreePath,
    createdAt: new Date().toISOString(),
    isActive: true,
    isGitRepo: true,
    branch: '',
    isWorktree: true,
    parentRepoPath: '',
    parentSessionId,
    worktreeSessions: [],
  })
}

export function DeleteWorktreeSession(sessionId: string, force: boolean): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.DeleteWorktreeSession) {
    return (window as any).go.main.App.DeleteWorktreeSession(sessionId, force)
  }
  return Promise.resolve()
}

export function CloseWorktreeSession(sessionId: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.CloseWorktreeSession) {
    return (window as any).go.main.App.CloseWorktreeSession(sessionId)
  }
  return Promise.resolve()
}

export function GetWorktreeSessions(parentSessionId: string): Promise<Session[]> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.GetWorktreeSessions) {
    return (window as any).go.main.App.GetWorktreeSessions(parentSessionId)
  }
  return Promise.resolve([])
}

export function CheckWorktreeHasChanges(sessionId: string): Promise<boolean> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.CheckWorktreeHasChanges) {
    return (window as any).go.main.App.CheckWorktreeHasChanges(sessionId)
  }
  return Promise.resolve(false)
}

// History operations
// Types imported from '../../../types/history'

export function GetHistoryList(): Promise<HistoryInfo[]> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.GetHistoryList) {
    return (window as any).go.main.App.GetHistoryList()
  }
  return Promise.resolve([])
}

export function GetHistoryContent(filename: string): Promise<TerminalHistory | null> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.GetHistoryContent) {
    return (window as any).go.main.App.GetHistoryContent(filename)
  }
  return Promise.resolve(null)
}

export function DeleteHistory(filename: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.DeleteHistory) {
    return (window as any).go.main.App.DeleteHistory(filename)
  }
  return Promise.resolve()
}

export function FlushCurrentHistory(sessionId: string): Promise<string> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.FlushCurrentHistory) {
    return (window as any).go.main.App.FlushCurrentHistory(sessionId)
  }
  return Promise.resolve('')
}

export interface ActiveSessionInfo {
  isActive: boolean
  sessionId: string
}

export function IsActiveSessionHistory(filename: string): Promise<ActiveSessionInfo> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.IsActiveSessionHistory) {
    return (window as any).go.main.App.IsActiveSessionHistory(filename)
  }
  return Promise.resolve({ isActive: false, sessionId: '' })
}

export function GetHistoryContentWithFlush(filename: string, currentSessionId: string): Promise<TerminalHistory | null> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.GetHistoryContentWithFlush) {
    return (window as any).go.main.App.GetHistoryContentWithFlush(filename, currentSessionId)
  }
  return Promise.resolve(null)
}

export function GetHistoryChunk(filename: string, offset: number, limit: number, currentSessionId: string): Promise<HistoryChunk> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.GetHistoryChunk) {
    return (window as any).go.main.App.GetHistoryChunk(filename, offset, limit, currentSessionId)
  }
  return Promise.resolve({
    data: '',
    startIndex: 0,
    endIndex: 0,
    fileSize: 0,
    hasMore: false,
  })
}

export function StartHistoryStream(requestId: string, filename: string, offset: number, currentSessionId: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.StartHistoryStream) {
    return (window as any).go.main.App.StartHistoryStream(requestId, filename, offset, currentSessionId)
  }
  return Promise.resolve()
}

export function StopHistoryStream(requestId: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).go?.main?.App?.StopHistoryStream) {
    return (window as any).go.main.App.StopHistoryStream(requestId)
  }
  return Promise.resolve()
}

