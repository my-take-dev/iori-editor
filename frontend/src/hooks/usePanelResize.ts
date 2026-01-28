import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface PanelSizes {
  leftWidth: number
  rightWidth: number
  centerSplit: number
  logPanelHeight: number
}

export interface PanelCollapsedStates {
  leftCollapsed: boolean
  rightCollapsed: boolean
  terminalMaximized: boolean
  logPanelCollapsed: boolean
}

export interface PanelResizeActions {
  setLeftWidth: (width: number) => void
  setRightWidth: (width: number) => void
  setCenterSplit: (split: number) => void
  setLogPanelHeight: (height: number) => void
  setRightCollapsed: (collapsed: boolean) => void
  toggleLeftCollapsed: () => void
  toggleRightCollapsed: () => void
  toggleTerminalMaximized: () => void
  toggleLogPanelCollapsed: () => void
  setTerminalMaximized: (maximized: boolean) => void
}

export interface ResizeHandlers {
  startResizingLeft: () => void
  startResizingRight: () => void
  startResizingCenter: () => void
  startResizingLogPanel: () => void
}

export interface UsePanelResizeReturn {
  sizes: PanelSizes
  collapsed: PanelCollapsedStates
  actions: PanelResizeActions
  resizeHandlers: ResizeHandlers
}

export interface PanelConstraints {
  leftWidth?: { min: number; max: number }
  rightWidth?: { min: number; max: number }
  centerSplit?: { min: number; max: number }
  logPanelHeight?: { min: number; max: number }
}

interface PanelResizeOptions {
  initialLeftWidth?: number
  initialRightWidth?: number
  initialCenterSplit?: number
  initialLogPanelHeight?: number
  constraints?: PanelConstraints
  centerContainerRef?: React.RefObject<HTMLElement>
}

/**
 * Hook for managing panel resize and layout state
 * Handles left/right panel widths, center split, log panel height,
 * and collapsed/maximized states with mouse drag support
 */
export function usePanelResize(options: PanelResizeOptions = {}): UsePanelResizeReturn {
  const {
    initialLeftWidth = 250,
    initialRightWidth = 280,
    initialCenterSplit = 50,
    initialLogPanelHeight = 150,
    constraints,
    centerContainerRef,
  } = options

  // Memoize constraints to prevent unnecessary effect re-runs
  const leftWidthConstraints = useMemo(
    () => constraints?.leftWidth ?? { min: 200, max: 400 },
    [constraints?.leftWidth?.min, constraints?.leftWidth?.max]
  )
  const rightWidthConstraints = useMemo(
    () => constraints?.rightWidth ?? { min: 200, max: 400 },
    [constraints?.rightWidth?.min, constraints?.rightWidth?.max]
  )
  const centerSplitConstraints = useMemo(
    () => constraints?.centerSplit ?? { min: 20, max: 80 },
    [constraints?.centerSplit?.min, constraints?.centerSplit?.max]
  )
  const logPanelHeightConstraints = useMemo(
    () => constraints?.logPanelHeight ?? { min: 100, max: 400 },
    [constraints?.logPanelHeight?.min, constraints?.logPanelHeight?.max]
  )

  // Panel sizes
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth)
  const [rightWidth, setRightWidth] = useState(initialRightWidth)
  const [centerSplit, setCenterSplit] = useState(initialCenterSplit)
  const [logPanelHeight, setLogPanelHeight] = useState(initialLogPanelHeight)

  // Collapsed/maximized states
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [terminalMaximized, setTerminalMaximized] = useState(false)
  const [logPanelCollapsed, setLogPanelCollapsed] = useState(false)

  // Resizing refs
  const isResizingLeft = useRef(false)
  const isResizingRight = useRef(false)
  const isResizingCenter = useRef(false)
  const isResizingLogPanel = useRef(false)
  const rAfRef = useRef<number | undefined>(undefined)

  // Toggle functions
  const toggleLeftCollapsed = useCallback((): void => {
    setLeftCollapsed((c) => !c)
  }, [])

  const toggleRightCollapsed = useCallback((): void => {
    setRightCollapsed((c) => !c)
  }, [])

  const toggleTerminalMaximized = useCallback((): void => {
    setTerminalMaximized((m) => !m)
  }, [])

  const toggleLogPanelCollapsed = useCallback((): void => {
    setLogPanelCollapsed((c) => !c)
  }, [])

  // Resize handlers - set cursor and userSelect for better UX
  const startResizingLeft = useCallback((): void => {
    isResizingLeft.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const startResizingRight = useCallback((): void => {
    isResizingRight.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const startResizingCenter = useCallback((): void => {
    isResizingCenter.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const startResizingLogPanel = useCallback((): void => {
    isResizingLogPanel.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])

  // Handle resize events
  useEffect(() => {
    function handleMouseMove(e: MouseEvent): void {
      // Skip if not resizing
      if (
        !isResizingLeft.current &&
        !isResizingRight.current &&
        !isResizingCenter.current &&
        !isResizingLogPanel.current
      ) {
        return
      }

      // Skip if rAF is already scheduled
      if (rAfRef.current !== undefined) return

      rAfRef.current = requestAnimationFrame(() => {
        if (isResizingLeft.current) {
          setLeftWidth(Math.min(leftWidthConstraints.max, Math.max(leftWidthConstraints.min, e.clientX)))
          window.dispatchEvent(new Event('resize'))
        }
        if (isResizingRight.current) {
          setRightWidth(Math.min(rightWidthConstraints.max, Math.max(rightWidthConstraints.min, window.innerWidth - e.clientX)))
          window.dispatchEvent(new Event('resize'))
        }
        if (isResizingCenter.current) {
          // Use centerContainerRef if provided, otherwise fall back to window height
          let percent: number
          if (centerContainerRef?.current) {
            const rect = centerContainerRef.current.getBoundingClientRect()
            percent = ((e.clientY - rect.top) / rect.height) * 100
          } else {
            percent = (e.clientY / window.innerHeight) * 100
          }
          setCenterSplit(Math.min(centerSplitConstraints.max, Math.max(centerSplitConstraints.min, percent)))
          window.dispatchEvent(new Event('resize'))
        }
        if (isResizingLogPanel.current) {
          const newHeight = window.innerHeight - e.clientY
          setLogPanelHeight(Math.min(logPanelHeightConstraints.max, Math.max(logPanelHeightConstraints.min, newHeight)))
          window.dispatchEvent(new Event('resize'))
        }
        rAfRef.current = undefined
      })
    }

    function handleMouseUp(): void {
      isResizingLeft.current = false
      isResizingRight.current = false
      isResizingCenter.current = false
      isResizingLogPanel.current = false
      // Reset cursor and user-select
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      // Cancel pending rAF
      if (rAfRef.current !== undefined) {
        cancelAnimationFrame(rAfRef.current)
        rAfRef.current = undefined
      }
    }
  }, [leftWidthConstraints, rightWidthConstraints, centerSplitConstraints, logPanelHeightConstraints, centerContainerRef])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault()
        setLeftCollapsed((c) => !c)
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault()
        setRightCollapsed((c) => !c)
      }
      if (e.key === 'Escape') {
        setTerminalMaximized(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    sizes: {
      leftWidth,
      rightWidth,
      centerSplit,
      logPanelHeight,
    },
    collapsed: {
      leftCollapsed,
      rightCollapsed,
      terminalMaximized,
      logPanelCollapsed,
    },
    actions: {
      setLeftWidth,
      setRightWidth,
      setCenterSplit,
      setLogPanelHeight,
      setRightCollapsed,
      toggleLeftCollapsed,
      toggleRightCollapsed,
      toggleTerminalMaximized,
      toggleLogPanelCollapsed,
      setTerminalMaximized,
    },
    resizeHandlers: {
      startResizingLeft,
      startResizingRight,
      startResizingCenter,
      startResizingLogPanel,
    },
  }
}
