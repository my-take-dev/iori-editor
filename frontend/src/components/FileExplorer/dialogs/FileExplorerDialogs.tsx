import { memo } from 'react'
import type { FileExplorerDialogsProps } from '../types'
import { DeleteDialog } from './DeleteDialog'
import { RenameDialog } from './RenameDialog'

export const FileExplorerDialogs = memo(function FileExplorerDialogs({
  deleteTarget,
  renameTarget,
  onConfirmDelete,
  onCancelDelete,
  onConfirmRename,
  onCancelRename,
}: FileExplorerDialogsProps): JSX.Element | null {
  if (!deleteTarget && !renameTarget) {
    return null
  }

  return (
    <>
      {deleteTarget && (
        <DeleteDialog
          fileName={deleteTarget.name}
          onConfirm={onConfirmDelete}
          onCancel={onCancelDelete}
        />
      )}
      {renameTarget && (
        <RenameDialog
          currentName={renameTarget.name}
          onConfirm={onConfirmRename}
          onCancel={onCancelRename}
        />
      )}
    </>
  )
})
