import type { LargeFileWarningProps } from '../types'
import { IconWarning } from '../../Icons'
import { formatFileSize } from '../../../utils/languageUtils'

export function LargeFileWarning({ fileSize, onLoadFull }: LargeFileWarningProps): JSX.Element {
  return (
    <div className="flex items-center gap-2 text-accent-yellow">
      <IconWarning />
      <span>Large file ({formatFileSize(fileSize)}) - Preview mode</span>
      <button
        onClick={onLoadFull}
        className="px-2 py-0.5 rounded text-xs bg-accent-yellow text-black hover:bg-yellow-400 transition-colors"
      >
        Load Full
      </button>
    </div>
  )
}
