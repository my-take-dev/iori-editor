import { useCallback, useState } from 'react'
import { WriteFile } from '../wailsjs/go/main/App'

export interface UseEditorStateReturn {
  editorFilePath: string
  setEditorFilePath: (path: string) => void
  loadFileForEditor: (path: string) => void
  handleSaveFile: (content: string) => Promise<void>
  clearEditorState: () => void
}

interface UseEditorStateOptions {
  sessionId: string | undefined
  onSaveComplete?: () => Promise<void>
}

/**
 * Hook for managing editor file state and save operations
 * Handles file path tracking and save functionality
 */
export function useEditorState({
  sessionId,
  onSaveComplete,
}: UseEditorStateOptions): UseEditorStateReturn {
  const [editorFilePath, setEditorFilePath] = useState('')

  const loadFileForEditor = useCallback(
    (path: string): void => {
      if (!sessionId || !path) {
        setEditorFilePath('')
        return
      }
      setEditorFilePath(path)
      // FileEditor will load the content internally
    },
    [sessionId]
  )

  const handleSaveFile = useCallback(
    async (content: string): Promise<void> => {
      if (!sessionId || !editorFilePath) return

      try {
        await WriteFile(sessionId, editorFilePath, content)
        if (onSaveComplete) {
          await onSaveComplete()
        }
      } catch (err) {
        console.error('Failed to save file:', err)
        throw err // Re-throw to let caller know save failed
      }
    },
    [sessionId, editorFilePath, onSaveComplete]
  )

  const clearEditorState = useCallback((): void => {
    setEditorFilePath('')
  }, [])

  return {
    editorFilePath,
    setEditorFilePath,
    loadFileForEditor,
    handleSaveFile,
    clearEditorState,
  }
}
