import { useCallback, useRef, useState, useEffect } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { GetFileInfo, ReadFile, ReadFilePartial } from '../../wailsjs/go/main/App'
import { getLanguageFromPath } from '../../utils/languageUtils'
import { FILE_EDITOR_CONFIG, EDITOR_OPTIONS } from './types'
import type { FileEditorProps, LoadingState } from './types'
import { EditorToolbar, LoadingOverlay, ErrorOverlay, EmptyStateOverlay } from './components'

// Re-export types for backward compatibility
export type { FileEditorProps, LoadingState }

export function FileEditor({
  filePath,
  sessionId,
  language,
  onSave,
  onChange,
  readOnly = false,
}: FileEditorProps) {
  // Refs
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const isEditorReadyRef = useRef(false)
  const pendingContentRef = useRef<string | null>(null)
  const originalContentRef = useRef<string>('')
  const currentPathRef = useRef<string>('')
  const loadingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const layoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Keep onSave in a ref to always have the latest version in event handlers
  const onSaveRef = useRef(onSave)

  // State
  const [isModified, setIsModified] = useState(false)
  const [loadingState, setLoadingState] = useState<LoadingState>('idle')
  const [fileSize, setFileSize] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  const detectedLanguage = language || getLanguageFromPath(filePath)
  const fileName = filePath.split(/[/\\]/).pop() || filePath

  // Keep onSaveRef updated with the latest onSave prop
  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  // Set editor value safely (handles case when editor isn't ready yet)
  const setEditorValue = useCallback((content: string) => {
    if (editorRef.current && isEditorReadyRef.current) {
      editorRef.current.setValue(content)

      // Cancel previous layout timeout to prevent race conditions
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current)
      }

      // Wait for content to be measured before layout
      layoutTimeoutRef.current = setTimeout(() => {
        editorRef.current?.layout()
        layoutTimeoutRef.current = null
      }, FILE_EDITOR_CONFIG.LAYOUT_DELAY_MS)
    } else {
      pendingContentRef.current = content
    }
  }, [])

  // Load file directly into editor without going through React state
  const loadFile = useCallback(async (path: string) => {
    if (!sessionId || !path) {
      setLoadingState('idle')
      return
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    currentPathRef.current = path
    loadingRef.current = true

    setLoadingState('loading')
    setError(null)

    try {
      // First, get file info to check size
      const info = await GetFileInfo(sessionId, path)

      if (abortController.signal.aborted) {
        return
      }

      setFileSize(info.size)

      if (info.isDir) {
        setLoadingState('error')
        setError('Cannot open directory')
        return
      }

      if (info.size > FILE_EDITOR_CONFIG.LARGE_FILE_THRESHOLD) {
        // Large file - load preview only
        const result = await ReadFilePartial(sessionId, path, FILE_EDITOR_CONFIG.PREVIEW_SIZE)
        if (abortController.signal.aborted) {
          return
        }
        setEditorValue(result.content)
        originalContentRef.current = result.content
        setLoadingState('preview')
      } else {
        // Normal size - load full content
        const content = await ReadFile(sessionId, path)
        if (abortController.signal.aborted) {
          return
        }
        setEditorValue(content)
        originalContentRef.current = content
        setLoadingState('loaded')
      }

      setIsModified(false)
    } catch (err) {
      if (abortController.signal.aborted) {
        return
      }
      console.error('Failed to load file:', err)
      setError((err as Error).message)
      setLoadingState('error')
    } finally {
      if (!abortController.signal.aborted) {
        loadingRef.current = false
      }
    }
  }, [sessionId, setEditorValue])

  // Load full content for large files
  const loadFullContent = useCallback(async () => {
    if (!sessionId || !filePath) {
      return
    }

    setLoadingState('loading')
    try {
      const content = await ReadFile(sessionId, filePath)
      setEditorValue(content)
      originalContentRef.current = content
      setLoadingState('loaded')
      setIsModified(false)
    } catch (err) {
      console.error('Failed to load full content:', err)
      const errorMessage = (err as Error).message
      // Handle "file too large" error from backend
      if (errorMessage.includes('file too large')) {
        setError(`ファイルが最大サイズ制限(${FILE_EDITOR_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)を超えています`)
      } else {
        setError(errorMessage)
      }
      setLoadingState('error')
    }
  }, [sessionId, filePath, setEditorValue])

  // Load file when filePath changes
  useEffect(() => {
    if (filePath && sessionId) {
      loadFile(filePath)
    } else {
      setLoadingState('idle')
      currentPathRef.current = ''
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current)
        layoutTimeoutRef.current = null
      }
    }
  }, [filePath, sessionId, loadFile])

  const handleEditorDidMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    isEditorReadyRef.current = true

    // Listen to content size changes and update layout accordingly
    editor.onDidContentSizeChange(() => {
      editor.layout()
    })

    // Apply pending content if any
    if (pendingContentRef.current !== null) {
      editor.setValue(pendingContentRef.current)
      pendingContentRef.current = null
    }

    // Cancel previous layout timeout to prevent race conditions
    if (layoutTimeoutRef.current) {
      clearTimeout(layoutTimeoutRef.current)
    }

    // Delayed layout for initial mount
    layoutTimeoutRef.current = setTimeout(() => {
      editor.layout()
      layoutTimeoutRef.current = null
    }, FILE_EDITOR_CONFIG.LAYOUT_DELAY_MS)

    // Add Ctrl+S save shortcut - use onSaveRef to always get the latest onSave function
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
      const currentOnSave = onSaveRef.current
      if (currentOnSave && editorRef.current) {
        const value = editorRef.current.getValue()
        try {
          await currentOnSave(value)
          originalContentRef.current = value
          setIsModified(false)
          setError(null)
        } catch (err) {
          // Save failed - show error to user
          const errorMessage = err instanceof Error ? err.message : String(err)
          setError(`保存に失敗しました: ${errorMessage}`)
          console.error('Failed to save file:', err)
        }
      }
    })

    editor.focus()
  }, []) // Empty deps - onSaveRef handles the latest onSave

  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setIsModified(value !== originalContentRef.current)
      onChange?.(value)
    }
  }, [onChange])

  const handleSave = useCallback(async () => {
    if (onSave && editorRef.current) {
      const value = editorRef.current.getValue()
      try {
        await onSave(value)
        originalContentRef.current = value
        setIsModified(false)
        setError(null)
      } catch (err) {
        // Save failed - show error to user
        const errorMessage = err instanceof Error ? err.message : String(err)
        setError(`保存に失敗しました: ${errorMessage}`)
        console.error('Failed to save file:', err)
      }
    }
  }, [onSave])

  const showEmptyState = !filePath && loadingState !== 'loading' && loadingState !== 'error'

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar
        fileName={fileName}
        filePath={filePath}
        isModified={isModified}
        detectedLanguage={detectedLanguage}
        loadingState={loadingState}
        fileSize={fileSize}
        readOnly={readOnly}
        onSave={handleSave}
        onLoadFull={loadFullContent}
      />

      <div className="flex-1 min-h-0 relative">
        <Editor
          language={detectedLanguage}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          onChange={handleChange}
          options={{
            ...EDITOR_OPTIONS,
            readOnly: readOnly || loadingState === 'preview',
          }}
        />

        {loadingState === 'loading' && <LoadingOverlay />}
        {loadingState === 'error' && error && <ErrorOverlay error={error} />}
        {showEmptyState && <EmptyStateOverlay />}
      </div>
    </div>
  )
}
