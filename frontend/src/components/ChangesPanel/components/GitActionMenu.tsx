import type { GitActionMenuProps } from '../types'
import { MenuItem, MenuDivider } from './MenuItem'

export function GitActionMenu({
  isOpen,
  onClose,
  onPull,
  onPush,
  onClone,
  onFetch,
  onCommit,
  commitDisabled,
}: GitActionMenuProps): JSX.Element | null {
  if (!isOpen) {
    return null
  }

  return (
    <div className="absolute top-full right-0 mt-1 w-56 bg-[#252526] border border-[#454545] rounded shadow-xl z-50 py-1">
      <MenuItem label="ツリーとして表示" disabled />
      <MenuItem label="表示と並べ替え" hasSubmenu disabled />
      <MenuDivider />
      <MenuItem
        label="プル"
        onClick={() => { onPull?.(); onClose() }}
        disabled={!onPull}
      />
      <MenuItem
        label="プッシュ"
        onClick={() => { onPush(); onClose() }}
      />
      <MenuItem
        label="クローン"
        onClick={() => { onClone?.(); onClose() }}
        disabled={!onClone}
      />
      <MenuItem label="チェックアウト先..." disabled />
      <MenuItem
        label="フェッチ"
        onClick={() => { onFetch?.(); onClose() }}
        disabled={!onFetch}
      />
      <MenuDivider />
      <MenuItem
        label="コミット"
        onClick={() => { onCommit(); onClose() }}
        disabled={commitDisabled}
      />
      <MenuItem label="変更" hasSubmenu disabled />
      <MenuItem label="プル、プッシュ" hasSubmenu disabled />
      <MenuItem label="ブランチ" hasSubmenu disabled />
      <MenuItem label="リモート" hasSubmenu disabled />
      <MenuItem label="スタッシュ" hasSubmenu disabled />
      <MenuItem label="タグ" hasSubmenu disabled />
      <MenuDivider />
      <MenuItem label="Git 出力の表示" disabled />
    </div>
  )
}
