import { useState, useCallback, useEffect, useRef } from 'react'
import { DiffEditor, type DiffOnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { SkeletonEditor, CopyButton } from '../common'
import {
  useDiffStore,
  selectDiffOriginal,
  selectDiffModified,
  selectDiffFilePath,
} from '../../stores/diffStore'
import { isBinaryFile } from '../../utils/binaryUtils'
import { getLanguageFromPath } from '../../utils/languageUtils'

interface DiffViewerProps {
  // Optional props for external use (e.g., WorktreeTab)
  // If not provided, uses internal store
  original?: string
  modified?: string
  filePath?: string
  language?: string
}

export function DiffViewer({
  original: externalOriginal,
  modified: externalModified,
  filePath: externalFilePath,
  language,
}: DiffViewerProps) {
  // Get diff content from store (fallback if props not provided)
  const storeOriginal = useDiffStore(selectDiffOriginal)
  const storeModified = useDiffStore(selectDiffModified)
  const storeFilePath = useDiffStore(selectDiffFilePath)

  // Use external props if provided, otherwise use store
  const original = externalOriginal ?? storeOriginal
  const modified = externalModified ?? storeModified
  const filePath = externalFilePath ?? storeFilePath

  const [renderSideBySide, setRenderSideBySide] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const prevPropsRef = useRef({ filePath, original, modified })
  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null)
  const isMountedRef = useRef(true)
  const detectedLanguage = language || getLanguageFromPath(filePath)

  // Handle editor mount
  const handleEditorMount: DiffOnMount = useCallback((editor) => {
    editorRef.current = editor
  }, [])

  // Cleanup on unmount - dispose editor and models explicitly
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false

      if (editorRef.current) {
        try {
          const originalModel = editorRef.current.getOriginalEditor().getModel()
          const modifiedModel = editorRef.current.getModifiedEditor().getModel()

          editorRef.current.dispose()

          if (originalModel) originalModel.dispose()
          if (modifiedModel) modifiedModel.dispose()
        } catch (e) {
          // Log disposal errors for debugging, but continue cleanup
          console.warn('Editor disposal warning:', e)
        }
        editorRef.current = null
      }
    }
  }, [])

  // Handle props changes - unmount and remount DiffEditor to prevent TextModel errors
  useEffect(() => {
    const prev = prevPropsRef.current
    const propsChanged = prev.filePath !== filePath || prev.original !== original || prev.modified !== modified

    if (propsChanged && isReady) {
      setIsReady(false)
      prevPropsRef.current = { filePath, original, modified }
    }
  }, [filePath, original, modified, isReady])

  // Remount after props change
  useEffect(() => {
    if (!isReady) {
      const timer = setTimeout(() => {
        setIsReady(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isReady])

  // Handle toggle with forced remount via key change
  // Note: @monaco-editor/react handles cleanup automatically when key changes
  const handleToggle = useCallback(() => {
    setIsTransitioning(true)
    // Brief delay to show loading state, then toggle
    setTimeout(() => {
      setRenderSideBySide(v => !v)
      setIsTransitioning(false)
    }, 100)
  }, [])

  // Render content based on state (extracted for readability)
  const renderDiffContent = () => {
    if (!filePath) {
      return (
        <div className="flex-1 flex items-center justify-center text-text-muted h-full">
          Select a file to view diff
        </div>
      )
    }

    if (isBinaryFile(filePath)) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-text-muted h-full gap-2">
          <svg className="w-12 h-12 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm">バイナリファイルは表示できません</span>
          <span className="text-xs text-text-secondary">{filePath.split(/[/\\]/).pop()}</span>
        </div>
      )
    }

    if (isTransitioning || !isReady) {
      return <SkeletonEditor showLineNumbers lines={25} />
    }

    return (
      <DiffEditor
        key={`diff-editor-${filePath}-${renderSideBySide}`}
        height="100%"
        original={original}
        modified={modified}
        language={detectedLanguage}
        theme="vs-dark"
        keepCurrentOriginalModel={true}
        keepCurrentModifiedModel={true}
        onMount={handleEditorMount}
        options={{
          readOnly: true,
          renderSideBySide: renderSideBySide,
          useInlineViewWhenSpaceIsLimited: false,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          lineNumbers: 'on',
          wordWrap: 'off',
          automaticLayout: true,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
          },
        }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="h-8 px-4 flex items-center bg-bg-editor border-b border-border text-xs flex-shrink-0 justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">
            <span className="text-accent-yellow">DIFF:</span>{' '}
            {filePath || 'No file selected'}
          </span>
          {filePath && <CopyButton text={filePath} size="xs" tooltip="パスをコピー" />}
        </div>
        <button
          onClick={handleToggle}
          disabled={isTransitioning}
          className="px-2 py-0.5 rounded text-xs bg-bg-tertiary text-text-secondary hover:text-white hover:bg-bg-secondary transition-colors disabled:opacity-50"
        >
          {renderSideBySide ? 'Inline' : 'Side-by-Side'}
        </button>
      </div>

      {/* Diff Editor */}
      <div className="flex-1 min-h-0 h-full">
        {renderDiffContent()}
      </div>
    </div>
  )
}
