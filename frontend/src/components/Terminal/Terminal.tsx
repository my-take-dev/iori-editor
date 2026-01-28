import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { WebglAddon } from 'xterm-addon-webgl'
import 'xterm/css/xterm.css'
import type { TerminalType, TerminalOutput } from '../../types/session'
import { WriteToTerminal, ResizeTerminal, GetTerminalHistory } from '../../wailsjs/go/main/App'
import { EventsOn } from '../../wailsjs/runtime/runtime'

interface TerminalProps {
  sessionId: string
  terminalType: TerminalType
  label?: string
}

export interface TerminalHandle {
  scrollToBottom: () => void
  requestFit: () => void
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(function Terminal(
  { sessionId, terminalType, label },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const webglAddonRef = useRef<WebglAddon | null>(null)
  const isInitializedRef = useRef(false)
  const isRendererReadyRef = useRef(false)
  const isMountedRef = useRef(true)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const fitRafRef = useRef<number | null>(null)
  const fitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fitRetryStartRef = useRef<number | null>(null)
  const lastResizeRef = useRef<{ cols: number; rows: number } | null>(null)
  const didForceRenderRef = useRef(false)
  const isComposingRef = useRef(false)
  const composingOutputRef = useRef<string[]>([])
  const scrollOnUserInputRef = useRef(true)
  const pendingResizeRef = useRef(false)
  const restoreScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollLockRafRef = useRef<number | null>(null)
  const FIT_RETRY_INTERVAL_MS = 50
  const FIT_RETRY_TIMEOUT_MS = 3000

  const focusTerminal = useCallback(() => {
    terminalRef.current?.focus()
  }, [])

  const requestScrollToBottom = useCallback(() => {
    if (scrollLockRafRef.current !== null) {
      return
    }
    scrollLockRafRef.current = requestAnimationFrame(() => {
      scrollLockRafRef.current = null
      const term = terminalRef.current
      if (!term || !isMountedRef.current) {
        return
      }
      if (term.buffer.active.type !== 'normal') {
        return
      }
      term.scrollToBottom()
    })
  }, [])

  // Handle terminal input
  const handleInput = useCallback(
    (data: string) => {
      WriteToTerminal(sessionId, terminalType, data).catch(console.error)
      if (terminalType === 'ai') {
        requestScrollToBottom()
      }
    },
    [sessionId, terminalType, requestScrollToBottom]
  )

  const flushComposedOutput = useCallback(() => {
    if (!terminalRef.current) {
      composingOutputRef.current.length = 0
      return
    }
    if (composingOutputRef.current.length === 0) {
      return
    }
    const buffered = composingOutputRef.current.join('')
    composingOutputRef.current.length = 0
    terminalRef.current.write(buffered)
  }, [])

  // Handle drag over for file drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  // Handle file drop - insert path into terminal
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const path = e.dataTransfer.getData('text/plain')
    if (path) {
      WriteToTerminal(sessionId, terminalType, path).catch(console.error)
    }
  }, [sessionId, terminalType])

  // Handle terminal resize
  const handleResize = useCallback((): boolean => {
    // Must wait for renderer to be ready before calling fit()
    if (!fitAddonRef.current || !terminalRef.current || !isRendererReadyRef.current) {
      return false
    }
    if (isComposingRef.current) {
      pendingResizeRef.current = true
      return false
    }
    // Check if terminal is properly attached to DOM
    const term = terminalRef.current
    if (!term.element || !containerRef.current?.contains(term.element)) {
      return false
    }
    const container = containerRef.current
    if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
      return false
    }
    const proposed = fitAddonRef.current.proposeDimensions()
    if (
      !proposed ||
      !Number.isFinite(proposed.cols) ||
      !Number.isFinite(proposed.rows)
    ) {
      return false
    }
    try {
      fitAddonRef.current.fit()
      const { cols, rows } = term
      const lastSize = lastResizeRef.current
      if (!lastSize || lastSize.cols !== cols || lastSize.rows !== rows) {
        lastResizeRef.current = { cols, rows }
        ResizeTerminal(sessionId, terminalType, cols, rows).catch(console.error)
      }
      return true
    } catch (err) {
      console.warn('Terminal resize failed during initialization:', err)
      return false
    }
  }, [sessionId, terminalType])

  const retryFit = useCallback(() => {
    if (fitRafRef.current !== null) {
      cancelAnimationFrame(fitRafRef.current)
    }
    if (fitTimeoutRef.current) {
      clearTimeout(fitTimeoutRef.current)
    }

    fitRafRef.current = requestAnimationFrame(() => {
      if (isComposingRef.current) {
        pendingResizeRef.current = true
        fitRetryStartRef.current = null
        return
      }
      if (fitRetryStartRef.current === null) {
        fitRetryStartRef.current = performance.now()
      }

      const didFit = handleResize()
      if (didFit) {
        fitRetryStartRef.current = null
        return
      }

      if (!didForceRenderRef.current && terminalRef.current) {
        didForceRenderRef.current = true
        try {
          terminalRef.current.refresh(0, Math.max(0, terminalRef.current.rows - 1))
        } catch (err) {
          console.warn('Terminal refresh failed during fit retry:', err)
        }
      }

      const elapsed = performance.now() - fitRetryStartRef.current
      if (elapsed < FIT_RETRY_TIMEOUT_MS) {
        fitTimeoutRef.current = setTimeout(() => {
          retryFit()
        }, FIT_RETRY_INTERVAL_MS)
      } else {
        fitRetryStartRef.current = null
      }
    })
  }, [handleResize])

  const scheduleFit = useCallback(() => {
    if (isComposingRef.current) {
      pendingResizeRef.current = true
      return
    }
    fitRetryStartRef.current = null
    didForceRenderRef.current = false
    retryFit()
  }, [retryFit])

  // Expose terminal controls to parent components
  useImperativeHandle(
    ref,
    () => ({
      scrollToBottom: () => {
        if (!isComposingRef.current) {
          terminalRef.current?.scrollToBottom()
        }
      },
      requestFit: () => {
        scheduleFit()
      },
    }),
    [scheduleFit]
  )

  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current || !sessionId) return

    isInitializedRef.current = true
    isMountedRef.current = true

    let wheelTarget: HTMLElement | null = null
    let wheelHandler: ((event: WheelEvent) => void) | null = null

    // Create terminal instance
    const term = new XTerm({
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#ffffff',
        cursorAccent: '#0d1117',
        selectionBackground: '#264f78',
        black: '#0d1117',
        red: '#f85149',
        green: '#56d364',
        yellow: '#e3b341',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#7ee787',
        brightYellow: '#eac54f',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#ffffff',
      },
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      cursorBlink: true,
      scrollback: 500,
      convertEol: true,
      smoothScrollDuration: 100,
      scrollOnUserInput: false,
      fastScrollSensitivity: 5,
      scrollSensitivity: 3,
    })
    scrollOnUserInputRef.current = term.options.scrollOnUserInput ?? true

    // Load addons
    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)

    // Store refs before opening
    terminalRef.current = term
    fitAddonRef.current = fitAddon

    term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      if (event.type !== 'keydown') {
        return true
      }
      if (
        terminalType === 'ai' &&
        (event.key === 'ArrowUp' ||
          event.key === 'ArrowDown' ||
          event.key === 'ArrowLeft' ||
          event.key === 'ArrowRight')
      ) {
        event.preventDefault()
        event.stopPropagation()
        requestScrollToBottom()
        return true
      }
      if (event.key === 'PageUp' || event.key === 'PageDown') {
        if (term.buffer.active.type !== 'normal') {
          return true
        }
        event.preventDefault()
        event.stopPropagation()
        term.scrollPages(event.key === 'PageUp' ? -1 : 1)
        return false
      }
      return true
    })

    // Handle input
    term.onData(handleInput)

    // Allow xterm.js to handle paste natively via term.onData
    // No custom paste handler needed - onData will capture pasted text

    let historyLoaded = false
    const pendingOutput: string[] = []

    const flushPendingOutput = () => {
      if (!terminalRef.current || pendingOutput.length === 0) {
        pendingOutput.length = 0
        return
      }
      const buffered = pendingOutput.join('')
      pendingOutput.length = 0
      if (isComposingRef.current) {
        composingOutputRef.current.push(buffered)
        return
      }
      terminalRef.current.write(buffered)
    }

    const markHistoryLoaded = () => {
      if (historyLoaded) {
        return
      }
      flushPendingOutput()
      historyLoaded = true
      if (isMountedRef.current) {
        term.scrollToBottom()
      }
    }

    // Listen for terminal output
    const unsubscribe = EventsOn('terminal:output', (event: TerminalOutput) => {
      if (
        event.sessionId === sessionId &&
        event.terminalType === terminalType &&
        terminalRef.current
      ) {
        if (!historyLoaded) {
          pendingOutput.push(event.data)
          return
        }
        if (isComposingRef.current) {
          composingOutputRef.current.push(event.data)
          return
        }
        terminalRef.current.write(event.data)
      }
    })

    // Handle window resize
    const resizeHandler = () => handleResize()
    window.addEventListener('resize', resizeHandler)

    let compositionTarget: HTMLTextAreaElement | null = null
    let compositionStartHandler: (() => void) | null = null
    let compositionEndHandler: (() => void) | null = null

    // Use requestAnimationFrame to ensure DOM is ready before opening terminal
    // This helps prevent "dimensions" error from xterm.js Viewport initialization
    let rafId: number
    rafId = requestAnimationFrame(() => {
      if (!containerRef.current) return

      // Open terminal in container
      term.open(containerRef.current)
      isRendererReadyRef.current = true
      scheduleFit()

      const viewport = term.element?.querySelector('.xterm-viewport') as HTMLElement | null
      if (viewport) {
        wheelTarget = viewport
        wheelHandler = (event: WheelEvent) => {
          event.preventDefault()
          event.stopPropagation()
        }
        viewport.addEventListener('wheel', wheelHandler, { passive: false })
      }

      const textarea = term.textarea
      if (textarea) {
        compositionTarget = textarea
        compositionStartHandler = () => {
          isComposingRef.current = true
          if (restoreScrollTimeoutRef.current) {
            clearTimeout(restoreScrollTimeoutRef.current)
            restoreScrollTimeoutRef.current = null
          }
          if (terminalRef.current) {
            terminalRef.current.options.scrollOnUserInput = false
          }
        }
        compositionEndHandler = () => {
          isComposingRef.current = false
          flushComposedOutput()
          if (pendingResizeRef.current) {
            pendingResizeRef.current = false
            scheduleFit()
          }
          restoreScrollTimeoutRef.current = setTimeout(() => {
            restoreScrollTimeoutRef.current = null
            if (isMountedRef.current && terminalRef.current) {
              terminalRef.current.options.scrollOnUserInput = scrollOnUserInputRef.current
            }
          }, 0)
        }
        textarea.addEventListener('compositionstart', compositionStartHandler)
        textarea.addEventListener('compositionend', compositionEndHandler)
      }

      GetTerminalHistory(sessionId, terminalType)
        .then((history) => {
          if (!isMountedRef.current || !terminalRef.current) {
            return
          }
          if (!history) {
            markHistoryLoaded()
            return
          }
          terminalRef.current.write(history, () => {
            markHistoryLoaded()
          })
        })
        .catch((err) => {
          console.warn('Failed to load terminal history:', err)
          markHistoryLoaded()
        })

      // Try to load WebGL addon for GPU-accelerated rendering
      try {
        const webglAddon = new WebglAddon()
        webglAddonRef.current = webglAddon

        // Handle WebGL context loss gracefully
        webglAddon.onContextLoss(() => {
          console.warn('WebGL context lost, falling back to default renderer')
          webglAddon.dispose()
          webglAddonRef.current = null
        })

        // Only load if still mounted
        if (isMountedRef.current && terminalRef.current) {
          term.loadAddon(webglAddon)
        }
      } catch (err) {
        console.warn('WebGL not supported, using default renderer:', err)
      }

      // Setup ResizeObserver immediately after open
      const observer = new ResizeObserver(() => {
        handleResize()
      })
      if (containerRef.current) {
        observer.observe(containerRef.current)
      }
      resizeObserverRef.current = observer
    })

    // Cleanup
    return () => {
      // Mark as unmounted first to stop any pending operations
      isMountedRef.current = false

      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resizeHandler)
      unsubscribe()

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
        resizeObserverRef.current = null
      }

      if (compositionTarget) {
        if (compositionStartHandler) {
          compositionTarget.removeEventListener('compositionstart', compositionStartHandler)
        }
        if (compositionEndHandler) {
          compositionTarget.removeEventListener('compositionend', compositionEndHandler)
        }
        compositionTarget = null
      }
      compositionStartHandler = null
      compositionEndHandler = null
      isComposingRef.current = false
      composingOutputRef.current.length = 0
      pendingResizeRef.current = false
      if (restoreScrollTimeoutRef.current) {
        clearTimeout(restoreScrollTimeoutRef.current)
        restoreScrollTimeoutRef.current = null
      }

      if (wheelTarget && wheelHandler) {
        wheelTarget.removeEventListener('wheel', wheelHandler)
      }
      wheelTarget = null
      wheelHandler = null

      if (fitRafRef.current !== null) {
        cancelAnimationFrame(fitRafRef.current)
        fitRafRef.current = null
      }
      if (scrollLockRafRef.current !== null) {
        cancelAnimationFrame(scrollLockRafRef.current)
        scrollLockRafRef.current = null
      }
      if (fitTimeoutRef.current) {
        clearTimeout(fitTimeoutRef.current)
        fitTimeoutRef.current = null
      }
      fitRetryStartRef.current = null
      lastResizeRef.current = null
      didForceRenderRef.current = false

      // Dispose WebGL addon BEFORE terminal disposal
      if (webglAddonRef.current) {
        try {
          webglAddonRef.current.dispose()
        } catch (e) {
          // Ignore errors during WebGL disposal
        }
        webglAddonRef.current = null
      }

      term.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
      isInitializedRef.current = false
      isRendererReadyRef.current = false
    }
  }, [sessionId, terminalType, handleInput, handleResize, scheduleFit, flushComposedOutput])

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {label && (
        <div className="h-8 flex items-center px-3 bg-bg-secondary border-b border-border flex-shrink-0">
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              terminalType === 'ai' ? 'text-accent-purple' : 'text-accent-blue'
            }`}
          >
            {label}
          </span>
        </div>
      )}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 bg-bg-primary"
        style={{ padding: '4px 0px 4px 4px' }}
        onMouseDown={focusTerminal}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
    </div>
  )
})
