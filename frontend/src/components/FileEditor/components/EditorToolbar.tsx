import { memo } from 'react'
import type { EditorToolbarProps } from '../types'
import { IconEdit } from '../../Icons'
import { CopyButton } from '../../common'
import { LargeFileWarning } from './LargeFileWarning'

export const EditorToolbar = memo(function EditorToolbar({
  fileName,
  filePath,
  isModified,
  detectedLanguage,
  loadingState,
  fileSize,
  readOnly,
  onSave,
  onLoadFull,
}: EditorToolbarProps): JSX.Element {
  const showSaveButton = !readOnly && onSave && loadingState === 'loaded'
  const showLargeFileWarning = loadingState === 'preview' && onLoadFull

  return (
    <div className="h-8 px-4 flex items-center bg-bg-editor border-b border-border text-xs flex-shrink-0 justify-between">
      <div className="flex items-center gap-2">
        <span className="font-bold text-white flex items-center gap-2">
          <IconEdit />
          {fileName}
          {isModified && <span className="text-accent-yellow ml-1">*</span>}
        </span>
        {filePath && <CopyButton text={filePath} size="xs" tooltip="パスをコピー" />}
      </div>
      <div className="flex items-center gap-2">
        {showLargeFileWarning && (
          <LargeFileWarning fileSize={fileSize} onLoadFull={onLoadFull} />
        )}
        {showSaveButton && (
          <button
            onClick={onSave}
            disabled={!isModified}
            className="px-3 py-0.5 rounded text-xs bg-accent-green hover:bg-accent-green-hover disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          >
            Save
          </button>
        )}
        <span className="text-text-muted">{detectedLanguage}</span>
      </div>
    </div>
  )
})
EditorToolbar.displayName = 'EditorToolbar'
