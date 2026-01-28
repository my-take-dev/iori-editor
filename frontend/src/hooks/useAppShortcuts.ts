import { useEffect } from 'react'

export interface UseAppShortcutsOptions {
  onDiffShortcut: () => void
  onEditorShortcut: () => void
  onHistoryShortcut: () => void
  enabled?: boolean
}

/**
 * Hook for managing application keyboard shortcuts
 * - Ctrl+1: Switch to diff view
 * - Ctrl+2: Switch to editor view
 * - Ctrl+3: Switch to history view
 */
export function useAppShortcuts({
  onDiffShortcut,
  onEditorShortcut,
  onHistoryShortcut,
  enabled = true,
}: UseAppShortcutsOptions): void {
  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.ctrlKey && e.key === '1') {
        e.preventDefault()
        onDiffShortcut()
      }
      if (e.ctrlKey && e.key === '2') {
        e.preventDefault()
        onEditorShortcut()
      }
      if (e.ctrlKey && e.key === '3') {
        e.preventDefault()
        onHistoryShortcut()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, onDiffShortcut, onEditorShortcut, onHistoryShortcut])
}
