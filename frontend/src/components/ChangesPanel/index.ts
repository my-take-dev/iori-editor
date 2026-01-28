// Main components
export { ChangesPanel } from './ChangesPanel'
export { ChangesPanelView } from './ChangesPanelView'
export { ChangesPanelContainer } from './ChangesPanelContainer'
export { FileChangeItem } from './FileChangeItem'

// Types
export type {
  ChangesPanelProps,
  ChangesPanelViewProps,
  ChangesPanelContainerProps,
  FileChange,
} from './types'

// Hooks (for advanced usage)
export { useChangesPanelData } from './hooks/useChangesPanelData'
export type { UseChangesPanelDataReturn } from './hooks/useChangesPanelData'
