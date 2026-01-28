import { useEffect, useCallback, useState, useRef } from 'react'
import {
  useServerStore,
  selectServerStatus,
  selectServerConfig,
  selectServerLoading,
  selectServerError,
  selectQRCode,
  selectSetStatus,
  selectSetConfig,
  selectSetLoading,
  selectSetError,
  selectSetQRCode,
  selectReset,
} from '../stores/serverStore'
import { server } from '../../wailsjs/go/models'
import {
  StartServer,
  StopServer,
  GetServerStatus,
  GetDefaultServerConfig,
  GetLocalIPAddresses,
  GenerateQRCode,
  GetBranchesForPath,
} from '../../wailsjs/go/main/App'
import { getErrorMessage } from '../utils/errorUtils'

interface UseServerControlOptions {
  isOpen: boolean
  sessionId?: string
  baseBranch?: string
  repoPath?: string
  onClose: () => void
}

export interface UseServerControlReturn {
  // State
  status: server.ServerStatus | null
  config: server.Config | null
  isLoading: boolean
  error: string | null
  qrCode: string | null
  ipAddresses: string[]
  branches: string[]
  branchLoadError: string | null
  qrWarning: string | null
  isRunning: boolean

  // Copy state
  copyFeedback: string | null

  // Actions
  handleStart: () => Promise<void>
  handleStop: () => Promise<void>
  handleConfigChange: (config: server.Config) => void
  handleClose: () => void
  copyUrl: () => Promise<void>
}

export function useServerControl({
  isOpen,
  sessionId,
  baseBranch,
  repoPath,
  onClose,
}: UseServerControlOptions): UseServerControlReturn {
  // State selectors
  const status = useServerStore(selectServerStatus)
  const config = useServerStore(selectServerConfig)
  const isLoading = useServerStore(selectServerLoading)
  const error = useServerStore(selectServerError)
  const qrCode = useServerStore(selectQRCode)

  // Action selectors
  const setStatus = useServerStore(selectSetStatus)
  const setConfig = useServerStore(selectSetConfig)
  const setLoading = useServerStore(selectSetLoading)
  const setError = useServerStore(selectSetError)
  const setQRCode = useServerStore(selectSetQRCode)
  const reset = useServerStore(selectReset)

  // Local state
  const [ipAddresses, setIpAddresses] = useState<string[]>(['0.0.0.0'])
  const [branches, setBranches] = useState<string[]>([])
  const [branchLoadError, setBranchLoadError] = useState<string | null>(null)
  const [qrWarning, setQrWarning] = useState<string | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  // Refs
  const errorCountRef = useRef(0)
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load initial data
  useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    const loadData = async () => {
      try {
        const [defaultConfig, ips, currentStatus] = await Promise.all([
          GetDefaultServerConfig(),
          GetLocalIPAddresses(),
          GetServerStatus(),
        ])

        if (cancelled) return

        const mergedConfig = new server.Config({
          ...defaultConfig,
          sessionId: sessionId || defaultConfig.sessionId,
          baseBranch: baseBranch || defaultConfig.baseBranch,
          repoPath: repoPath || defaultConfig.repoPath,
        })

        setConfig(mergedConfig)
        setIpAddresses(ips.length > 0 ? ips : ['0.0.0.0'])
        setStatus(currentStatus)

        const targetRepoPath = repoPath || defaultConfig.repoPath
        if (targetRepoPath) {
          try {
            const branchList = await GetBranchesForPath(targetRepoPath)
            if (!cancelled) {
              const branchNames = branchList.map(b => b.name)
              setBranches(branchNames)
              setBranchLoadError(null)
            }
          } catch (branchErr) {
            console.error('Failed to load branches:', branchErr)
            if (!cancelled) {
              setBranchLoadError(`ブランチの読み込みに失敗しました: ${getErrorMessage(branchErr)}`)
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(`設定の読み込みに失敗しました: ${getErrorMessage(err)}`)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [isOpen, sessionId, baseBranch, repoPath, setConfig, setStatus, setError])

  // Poll server status when running
  useEffect(() => {
    const cleanupInterval = () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current)
        statusIntervalRef.current = null
      }
    }

    if (!isOpen || !status?.running) {
      errorCountRef.current = 0
      cleanupInterval()
      return
    }

    let cancelled = false
    const maxErrors = 3

    statusIntervalRef.current = setInterval(async () => {
      try {
        const newStatus = await GetServerStatus()
        if (!cancelled) {
          setStatus(newStatus)
          errorCountRef.current = 0
        }
      } catch (err) {
        if (!cancelled) {
          errorCountRef.current++
          console.error('Failed to get server status:', err)

          if (errorCountRef.current >= maxErrors) {
            cleanupInterval()
            setStatus(new server.ServerStatus({ running: false }))
            setError('サーバーとの接続が失われました')
            setQRCode(null)
          }
        }
      }
    }, 5000)

    return () => {
      cancelled = true
      cleanupInterval()
    }
  }, [isOpen, status?.running, setStatus, setError, setQRCode])

  // Cleanup copyFeedback timeout on unmount
  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current)
      }
    }
  }, [])

  const handleConfigChange = useCallback((newConfig: server.Config) => {
    setConfig(newConfig)
  }, [setConfig])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  const handleStart = useCallback(async () => {
    if (!config) return

    setLoading(true)
    setError(null)

    try {
      await StartServer(config)
      const newStatus = await GetServerStatus()
      setStatus(newStatus)

      if (newStatus.url) {
        try {
          const qrDataUrl = await GenerateQRCode(newStatus.url)
          setQRCode(qrDataUrl)
          setQrWarning(null)
        } catch (qrErr) {
          console.error('Failed to generate QR code:', qrErr)
          setQrWarning('QRコードの生成に失敗しました。URLを直接コピーしてください。')
        }
      }
    } catch (err) {
      setError(`サーバー起動に失敗しました: ${getErrorMessage(err)}`)
    } finally {
      setLoading(false)
    }
  }, [config, setLoading, setError, setStatus, setQRCode])

  const handleStop = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      await StopServer()
      const newStatus = await GetServerStatus()
      setStatus(newStatus)
      setQRCode(null)
      setQrWarning(null)
    } catch (err) {
      setError(`サーバー停止に失敗しました: ${getErrorMessage(err)}`)
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setStatus, setQRCode])

  const copyUrl = useCallback(async () => {
    if (status?.url) {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current)
      }

      try {
        await navigator.clipboard.writeText(status.url)
        setCopyFeedback('コピーしました')
      } catch (err) {
        console.error('Failed to copy URL:', err)
        setCopyFeedback('コピーに失敗しました')
      }

      copyFeedbackTimeoutRef.current = setTimeout(() => {
        setCopyFeedback(null)
        copyFeedbackTimeoutRef.current = null
      }, 2000)
    }
  }, [status?.url])

  const isRunning = status?.running ?? false

  return {
    status,
    config,
    isLoading,
    error,
    qrCode,
    ipAddresses,
    branches,
    branchLoadError,
    qrWarning,
    isRunning,
    copyFeedback,
    handleStart,
    handleStop,
    handleConfigChange,
    handleClose,
    copyUrl,
  }
}
