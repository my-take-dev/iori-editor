/**
 * Centralized icon exports
 */

// Types
export type { IconProps, IconSize } from './types'
export { sizeMap, getSizeClass } from './types'

// Navigation icons
export { IconChevronLeft, IconChevronRight, IconChevronDown, IconChevronUp, IconExternalLink } from './icons/navigation'

// Action icons
export {
  IconPlus,
  IconMinus,
  IconEdit,
  IconDelete,
  IconCopy,
  IconCopyRelative,
  IconRename,
  IconUndo,
  IconRefresh,
  IconClose,
} from './icons/actions'

// Status icons
export { IconCheck, IconError, IconWarning, IconPause } from './icons/status'

// File icons
export { IconFolder } from './icons/files'

// Git icons
export { IconGitBranch, IconCloud, IconSync } from './icons/git'

// Misc icons
export {
  IconRobot,
  IconTerminal,
  IconGithub,
  IconHistory,
  IconDiff,
  IconMoreHorizontal,
} from './icons/misc'

// Special icons
export { IconFile } from './special/IconFile'
export type { IconFileProps } from './special/IconFile'
export { IconArrow } from './special/IconArrow'
export type { IconArrowProps } from './special/IconArrow'
export { IconSpinner } from './special/IconSpinner'
