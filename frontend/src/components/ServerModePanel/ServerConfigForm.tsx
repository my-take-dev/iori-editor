import { useState, useEffect, useCallback, useRef } from 'react'
import { server } from '../../../wailsjs/go/models'

interface ServerConfigFormProps {
  config: server.Config | null
  ipAddresses: string[]
  branches?: string[]
  disabled?: boolean
  onConfigChange: (config: server.Config) => void
}

export function ServerConfigForm({
  config,
  ipAddresses,
  branches = [],
  disabled = false,
  onConfigChange,
}: ServerConfigFormProps): JSX.Element {
  const [localConfig, setLocalConfig] = useState<server.Config | null>(config)
  const [portError, setPortError] = useState<string | null>(null)
  // Local port input value to handle empty/invalid input states
  const [portInputValue, setPortInputValue] = useState<string>(config?.port?.toString() ?? '8080')

  // Use ref to track if we've already auto-selected IP to prevent redundant updates
  const hasAutoSelectedIpRef = useRef(false)
  // Track previous ipAddresses to detect changes
  const prevIpAddressesRef = useRef<string[]>(ipAddresses)
  // Use ref for onConfigChange to avoid infinite loops (callback must be stable)
  const onConfigChangeRef = useRef(onConfigChange)
  onConfigChangeRef.current = onConfigChange

  useEffect(() => {
    // Reset auto-select flag when ipAddresses change (e.g., network interface added)
    const ipAddressesChanged = prevIpAddressesRef.current.length !== ipAddresses.length ||
      prevIpAddressesRef.current.some((ip, i) => ip !== ipAddresses[i])
    if (ipAddressesChanged) {
      hasAutoSelectedIpRef.current = false
      prevIpAddressesRef.current = ipAddresses
    }

    if (config) {
      // Sync port input value with config
      setPortInputValue(config.port.toString())
      setPortError(null)

      // If config.ip is empty or not in the available ipAddresses, use the first available IP
      const effectiveIp = config.ip && ipAddresses.includes(config.ip)
        ? config.ip
        : ipAddresses[0] || ''

      if (effectiveIp !== config.ip && !hasAutoSelectedIpRef.current) {
        // Mark that we've auto-selected to prevent infinite loops
        hasAutoSelectedIpRef.current = true
        const updatedConfig = new server.Config({
          ...config,
          ip: effectiveIp,
        })
        setLocalConfig(updatedConfig)
        // Use ref to avoid adding callback to dependencies
        onConfigChangeRef.current(updatedConfig)
      } else {
        setLocalConfig(config)
      }
    } else {
      setLocalConfig(config)
      // Reset auto-select flag when config becomes null
      hasAutoSelectedIpRef.current = false
    }
  }, [config, ipAddresses])

  const handleChange = useCallback((field: keyof server.Config, value: string | number) => {
    // Null check first to avoid accessing properties of null
    if (!localConfig) return

    const updated = new server.Config({
      ...localConfig,
      [field]: value,
    })

    setLocalConfig(updated)
    onConfigChange(updated)
  }, [onConfigChange, localConfig])

  if (!localConfig) {
    return (
      <div className="text-[#808080] text-sm">
        設定を読み込み中...
      </div>
    )
  }

  if (ipAddresses.length === 0) {
    return (
      <div className="text-[#f85149] text-sm">
        利用可能なIPアドレスがありません
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* IP Address */}
      <div>
        <label className="block text-[#cccccc] text-sm mb-1.5">
          IPアドレス
        </label>
        <select
          value={localConfig.ip}
          onChange={(e) => handleChange('ip', e.target.value)}
          disabled={disabled}
          className="w-full bg-[#3c3c3c] border border-[#555555] rounded px-3 py-2 text-[#cccccc] text-sm focus:outline-none focus:border-[#0078d4] disabled:opacity-50"
        >
          {ipAddresses.map((ip) => (
            <option key={ip} value={ip}>
              {ip}
            </option>
          ))}
        </select>
      </div>

      {/* Port */}
      <div>
        <label className="block text-[#cccccc] text-sm mb-1.5">
          ポート
        </label>
        <input
          type="number"
          value={portInputValue}
          onChange={(e) => {
            const value = e.target.value
            // Always update the display value
            setPortInputValue(value)

            // Validate and update config
            if (value === '') {
              setPortError('ポート番号を入力してください')
              return
            }
            const parsed = parseInt(value, 10)
            if (isNaN(parsed)) {
              setPortError('有効な数値を入力してください')
              return
            }
            if (parsed < 1024 || parsed > 65535) {
              setPortError('ポートは1024〜65535の範囲で指定してください')
              return
            }
            // Valid - update config
            setPortError(null)
            handleChange('port', parsed)
          }}
          disabled={disabled}
          min={1024}
          max={65535}
          className={`w-full bg-[#3c3c3c] border rounded px-3 py-2 text-[#cccccc] text-sm focus:outline-none disabled:opacity-50 ${
            portError ? 'border-[#f44336] focus:border-[#f44336]' : 'border-[#555555] focus:border-[#0078d4]'
          }`}
        />
        {portError && (
          <p className="text-[#f44336] text-xs mt-1">{portError}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="block text-[#cccccc] text-sm mb-1.5">
          パスワード（任意）
        </label>
        <input
          type="password"
          value={localConfig.password}
          onChange={(e) => handleChange('password', e.target.value)}
          disabled={disabled}
          placeholder="空欄の場合は認証なし"
          className="w-full bg-[#3c3c3c] border border-[#555555] rounded px-3 py-2 text-[#cccccc] text-sm focus:outline-none focus:border-[#0078d4] disabled:opacity-50 placeholder-[#808080]"
        />
        <p className="text-[#808080] text-xs mt-1">
          スマホからのアクセス時に要求されます
        </p>
      </div>

      {/* Base Branch */}
      <div>
        <label className="block text-[#cccccc] text-sm mb-1.5">
          ベースブランチ
        </label>
        {branches.length > 0 ? (
          <select
            value={localConfig.baseBranch}
            onChange={(e) => handleChange('baseBranch', e.target.value)}
            disabled={disabled}
            className="w-full bg-[#3c3c3c] border border-[#555555] rounded px-3 py-2 text-[#cccccc] text-sm focus:outline-none focus:border-[#0078d4] disabled:opacity-50"
          >
            {branches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        ) : (
          <div className="bg-[#2d2d2d] border border-[#555555] rounded px-3 py-2 text-[#808080] text-sm">
            {localConfig.baseBranch || '読み込み中...'}
          </div>
        )}
        <p className="text-[#808080] text-xs mt-1">
          新しいworktreeのベースとなるブランチ
        </p>
      </div>
    </div>
  )
}
