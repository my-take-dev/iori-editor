import { create } from 'zustand'
import type { FileChange } from '../types/git'
import type { FileNode } from '../components/FileExplorer/FileExplorer'
import {
  GetChanges,
  GetFileDiff,
  AcceptChange,
  UnstageChange,
  RejectChange,
  CommitChanges,
  PushChanges,
  PullChanges,
  FetchChanges,
  WriteFile,
  GetFileTree,
  GetDirectoryChildren,
  RenameFile,
  DeleteFile,
} from '../wailsjs/go/main/App'

/**
 * Helper function to wrap async operations with error logging
 */
async function withErrorLogging<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T> {
  try {
    return await operation()
  } catch (err) {
    console.error(errorMessage, err)
    throw err
  }
}

interface WorktreeOperationsState {
  // Git operations
  getChanges: (sessionId: string) => Promise<FileChange[]>
  getFileDiff: (sessionId: string, path: string) => Promise<{ original: string; modified: string }>
  acceptChange: (sessionId: string, path: string) => Promise<void>
  unstageChange: (sessionId: string, path: string) => Promise<void>
  rejectChange: (sessionId: string, path: string) => Promise<void>
  commit: (sessionId: string, message: string) => Promise<void>
  push: (sessionId: string) => Promise<void>
  pull: (sessionId: string) => Promise<void>
  fetch: (sessionId: string) => Promise<void>

  // File operations
  writeFile: (sessionId: string, path: string, content: string) => Promise<void>
  getFileTree: (sessionId: string) => Promise<FileNode[]>
  getDirectoryChildren: (sessionId: string, path: string) => Promise<FileNode[]>
  renameFile: (sessionId: string, oldPath: string, newPath: string) => Promise<void>
  deleteFile: (sessionId: string, path: string) => Promise<void>
}

export const useWorktreeOperationsStore = create<WorktreeOperationsState>(() => ({
  // Git operations
  getChanges: (sessionId: string) =>
    withErrorLogging(
      async () => (await GetChanges(sessionId)) || [],
      'Failed to get changes:'
    ),

  getFileDiff: (sessionId: string, path: string) =>
    withErrorLogging(async () => {
      const diff = await GetFileDiff(sessionId, path)
      return { original: diff.original || '', modified: diff.modified || '' }
    }, 'Failed to get file diff:'),

  acceptChange: (sessionId: string, path: string) =>
    withErrorLogging(() => AcceptChange(sessionId, path), 'Failed to accept change:'),

  unstageChange: (sessionId: string, path: string) =>
    withErrorLogging(() => UnstageChange(sessionId, path), 'Failed to unstage change:'),

  rejectChange: (sessionId: string, path: string) =>
    withErrorLogging(() => RejectChange(sessionId, path), 'Failed to reject change:'),

  commit: (sessionId: string, message: string) =>
    withErrorLogging(async () => {
      await CommitChanges(sessionId, message)
    }, 'Failed to commit changes:'),

  push: (sessionId: string) =>
    withErrorLogging(() => PushChanges(sessionId), 'Failed to push changes:'),

  pull: (sessionId: string) =>
    withErrorLogging(() => PullChanges(sessionId), 'Failed to pull changes:'),

  fetch: (sessionId: string) =>
    withErrorLogging(() => FetchChanges(sessionId), 'Failed to fetch changes:'),

  // File operations
  writeFile: (sessionId: string, path: string, content: string) =>
    withErrorLogging(() => WriteFile(sessionId, path, content), 'Failed to write file:'),

  getFileTree: (sessionId: string) =>
    withErrorLogging(() => GetFileTree(sessionId), 'Failed to get file tree:'),

  getDirectoryChildren: (sessionId: string, path: string) =>
    withErrorLogging(
      async () => (await GetDirectoryChildren(sessionId, path)) || [],
      'Failed to get directory children:'
    ),

  renameFile: (sessionId: string, oldPath: string, newPath: string) =>
    withErrorLogging(() => RenameFile(sessionId, oldPath, newPath), 'Failed to rename file:'),

  deleteFile: (sessionId: string, path: string) =>
    withErrorLogging(() => DeleteFile(sessionId, path), 'Failed to delete file:'),
}))

// Note: Use individual selectors like (s) => s.getChanges for stable references
// Avoid selecting the entire store as it creates unstable object references
