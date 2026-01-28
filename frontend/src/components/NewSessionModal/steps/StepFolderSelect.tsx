import { FolderSelectButton } from '../FolderSelectButton'
import { RecentFoldersList } from '../RecentFoldersList'
import type { StepFolderSelectProps } from '../types'

export function StepFolderSelect({
  onSelectFolder,
  onSelectRecent,
  recentFolders,
  isLoading,
}: StepFolderSelectProps): JSX.Element {
  return (
    <div className="space-y-4">
      <FolderSelectButton
        onClick={onSelectFolder}
        isLoading={isLoading}
      />
      <RecentFoldersList
        folders={recentFolders}
        onSelect={onSelectRecent}
        disabled={isLoading}
      />
    </div>
  )
}
