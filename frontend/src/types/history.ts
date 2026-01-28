// History type definitions

export interface TerminalHistoryEntry {
  timestamp: string
  terminalType: 'ai' | 'user'
  data: string
}

export interface TerminalHistory {
  sessionId: string
  sessionName: string
  startedAt: string
  endedAt?: string
  workDir: string
  entries: TerminalHistoryEntry[]
}

export interface HistoryInfo {
  filename: string
  sessionId: string
  sessionName: string
  startedAt: string
  endedAt: string
  workDir: string
  entryCount: number
}

export interface HistoryChunk {
  data: string
  startIndex: number
  endIndex: number
  fileSize: number  // File size in bytes
  hasMore: boolean
}
