import type { ViewMode } from '../types/viewMode'
import type { Session } from '../types/session'
import { useSessionCreation, type UseSessionCreationReturn } from './useSessionCreation'
import { useFileOperations, type UseFileOperationsReturn } from './useFileOperations'
import { useSessionNavigation, type UseSessionNavigationReturn } from './useSessionNavigation'

// Re-export types for backward compatibility
export type { AllWorktreeSessionsMap } from './useSessionNavigation'

export interface UseSessionHandlersReturn
  extends UseSessionCreationReturn,
    UseFileOperationsReturn,
    UseSessionNavigationReturn {}

interface UseSessionHandlersOptions {
  activeSession: Session | undefined
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

/**
 * Hook for session-related handlers
 * Aggregates session creation, file operations, and session navigation
 */
export function useSessionHandlers({
  activeSession,
  viewMode,
  setViewMode,
}: UseSessionHandlersOptions): UseSessionHandlersReturn {
  // Session creation handlers
  const creation = useSessionCreation()

  // File operation handlers
  const fileOps = useFileOperations({ activeSession })

  // Session navigation handlers
  const navigation = useSessionNavigation({ viewMode, setViewMode })

  return {
    ...creation,
    ...fileOps,
    ...navigation,
  }
}
