import type { editor } from 'monaco-editor'

// Loading states
export type LoadingState = 'idle' | 'loading' | 'loaded' | 'preview' | 'error'

// File size thresholds
export const FILE_EDITOR_CONFIG = {
  LARGE_FILE_THRESHOLD: 2 * 1024 * 1024, // 2MB - switch to preview mode
  // Must match MaxReadFileSize in internal/session/session_file.go
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB - backend hard limit
  PREVIEW_SIZE: 100 * 1024, // 100KB for preview
  LAYOUT_DELAY_MS: 100,
} as const

// Editor options
export const EDITOR_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: true, scale: 0.8 },
  scrollBeyondLastLine: false,
  fontSize: 13,
  lineNumbers: 'on',
  wordWrap: 'off',
  automaticLayout: true,
  tabSize: 2,
  insertSpaces: true,
  formatOnPaste: true,
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
  },
  bracketPairColorization: {
    enabled: true,
  },
}

export interface FileEditorProps {
  filePath: string
  sessionId: string | null
  language?: string
  onSave?: (content: string) => Promise<void>
  onChange?: (content: string) => void
  readOnly?: boolean
}

export interface EditorToolbarProps {
  fileName: string
  filePath?: string
  isModified: boolean
  detectedLanguage: string
  loadingState: LoadingState
  fileSize: number
  readOnly: boolean
  onSave?: () => Promise<void>
  onLoadFull?: () => void
}

export interface LargeFileWarningProps {
  fileSize: number
  onLoadFull: () => void
}

export interface ErrorOverlayProps {
  error: string
}
