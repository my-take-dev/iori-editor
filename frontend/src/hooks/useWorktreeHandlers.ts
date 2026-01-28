import { useWorktreeLifecycle, type UseWorktreeLifecycleReturn } from './useWorktreeLifecycle'
import { useWorktreeNavigation, type UseWorktreeNavigationReturn } from './useWorktreeNavigation'
import type { ViewMode } from '../types/viewMode'

/**
 * Return type for useWorktreeHandlers
 * Git/file operations are now in worktreeOperationsStore and consumed directly
 */
export interface UseWorktreeHandlersReturn extends UseWorktreeLifecycleReturn, UseWorktreeNavigationReturn {}

interface UseWorktreeHandlersOptions {
  setViewMode: (mode: ViewMode) => void
}

/**
 * Aggregated worktree handlers hook
 * Combines lifecycle and navigation handlers for convenience
 *
 * Note: Git/file operations (getChanges, acceptChange, etc.) are now
 * handled by worktreeOperationsStore and consumed directly by components.
 */
export function useWorktreeHandlers({
  setViewMode,
}: UseWorktreeHandlersOptions): UseWorktreeHandlersReturn {
  // Delegate to specialized hooks
  const lifecycle = useWorktreeLifecycle()
  const navigation = useWorktreeNavigation({ setViewMode })

  return {
    // From useWorktreeLifecycle
    ...lifecycle,

    // From useWorktreeNavigation
    ...navigation,
  }
}
