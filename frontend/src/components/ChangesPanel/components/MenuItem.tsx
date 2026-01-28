import { memo } from 'react'
import type { MenuItemProps } from '../types'
import { IconChevronRight } from '../../Icons'

export const MenuItem = memo(function MenuItem({ label, onClick, disabled, shortcut, hasSubmenu }: MenuItemProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full px-3 py-1 text-left text-[13px] flex items-center justify-between ${
        disabled
          ? 'text-[#6e6e6e] cursor-not-allowed'
          : 'text-[#cccccc] hover:bg-[#094771]'
      }`}
    >
      <span>{label}</span>
      {shortcut && <span className="text-[11px] text-[#808080] ml-4">{shortcut}</span>}
      {hasSubmenu && <IconChevronRight size="sm" />}
    </button>
  )
})
MenuItem.displayName = 'MenuItem'

export const MenuDivider = memo(function MenuDivider(): JSX.Element {
  return <div className="border-t border-[#454545] my-1" />
})
MenuDivider.displayName = 'MenuDivider'
