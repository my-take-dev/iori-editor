export type FileStatus = 'M' | 'A' | 'D' | 'R' | '?'

export interface FileChange {
  path: string
  status: FileStatus
  staged: boolean
  added: number
  removed: number
  original?: string
  modified?: string
}

export interface FileDiff {
  original: string
  modified: string
}

export interface FileChangeEvent {
  sessionId: string
  path: string
  eventType: 'create' | 'write' | 'remove' | 'rename'
  isDir: boolean
}
