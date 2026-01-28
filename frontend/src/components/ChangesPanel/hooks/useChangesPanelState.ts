import { useState, useRef, useEffect } from 'react'

export interface UseChangesPanelStateReturn {
  // Dropdown states
  isDropdownOpen: boolean
  setIsDropdownOpen: (open: boolean) => void
  isMainMenuOpen: boolean
  setIsMainMenuOpen: (open: boolean) => void

  // Section expansion states
  isStagedExpanded: boolean
  setIsStagedExpanded: (expanded: boolean) => void
  isChangesExpanded: boolean
  setIsChangesExpanded: (expanded: boolean) => void

  // Commit message
  commitMessage: string
  setCommitMessage: (message: string) => void

  // Refs
  dropdownRef: React.RefObject<HTMLDivElement>
  mainMenuRef: React.RefObject<HTMLDivElement>
  textareaRef: React.RefObject<HTMLTextAreaElement>
}

/**
 * Hook for managing UI state in the ChangesPanel.
 * Only handles pure UI state - no business logic or async operations.
 *
 * Note: operationError is managed by useCommitOperations
 * Note: discard dialog states are managed by useDiscardOperations
 */
export function useChangesPanelState(): UseChangesPanelStateReturn {
  const [commitMessage, setCommitMessage] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(false)
  const [isStagedExpanded, setIsStagedExpanded] = useState(true)
  const [isChangesExpanded, setIsChangesExpanded] = useState(true)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const mainMenuRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
      if (mainMenuRef.current && !mainMenuRef.current.contains(event.target as Node)) {
        setIsMainMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return {
    isDropdownOpen,
    setIsDropdownOpen,
    isMainMenuOpen,
    setIsMainMenuOpen,
    isStagedExpanded,
    setIsStagedExpanded,
    isChangesExpanded,
    setIsChangesExpanded,
    commitMessage,
    setCommitMessage,
    dropdownRef,
    mainMenuRef,
    textareaRef,
  }
}
