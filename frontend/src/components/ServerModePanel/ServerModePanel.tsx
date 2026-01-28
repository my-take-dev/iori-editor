import { ServerConfigForm } from './ServerConfigForm'
import { useServerControl } from '../../hooks/useServerControl'

interface ServerModePanelProps {
  isOpen: boolean
  onClose: () => void
  sessionId?: string
  baseBranch?: string
  repoPath?: string
}

export function ServerModePanel({
  isOpen,
  onClose,
  sessionId,
  baseBranch,
  repoPath,
}: ServerModePanelProps): JSX.Element | null {
  const {
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
  } = useServerControl({
    isOpen,
    sessionId,
    baseBranch,
    repoPath,
    onClose,
  })

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(2px)' }}
      onClick={handleClose}
    >
      <div
        className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-[480px] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-[#3c3c3c] flex justify-between items-center bg-[#1e1e1e] rounded-t-lg">
          <h2 className="font-semibold text-[#cccccc] text-[14px] flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            サーバーモード
          </h2>
          <button
            onClick={handleClose}
            className="text-[#808080] hover:text-white transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Status Display */}
          {isRunning && status && (
            <div className="bg-[#1e3a1e] border border-[#4caf50] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-[#4caf50] rounded-full animate-pulse" />
                <span className="text-[#4caf50] font-medium text-sm">サーバー稼働中</span>
              </div>

              {/* QR Code and URL side by side */}
              <div className="flex gap-4 items-start">
                {/* QR Code */}
                {qrCode && (
                  <div className="flex-shrink-0 bg-white p-2 rounded">
                    <img
                      src={qrCode}
                      alt="QR Code"
                      className="w-32 h-32"
                    />
                  </div>
                )}

                {/* URL and Instructions */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[#cccccc] text-sm font-mono flex-1 truncate">
                      {status.url}
                    </span>
                    <button
                      onClick={copyUrl}
                      className="text-[#808080] hover:text-[#cccccc] transition-colors flex-shrink-0"
                      title="URLをコピー"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    {copyFeedback && (
                      <span className="text-xs text-[#4caf50]">{copyFeedback}</span>
                    )}
                  </div>
                  <p className="text-[#808080] text-xs mt-2">
                    QRコードをスキャンするか、URLに直接アクセスしてください
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-[#3a1e1e] border border-[#f44336] rounded-lg p-3">
              <span className="text-[#f44336] text-sm">{error}</span>
            </div>
          )}

          {/* Branch Load Warning */}
          {branchLoadError && (
            <div className="bg-[#3a2e1e] border border-[#ff9800] rounded-lg p-3">
              <span className="text-[#ff9800] text-sm">{branchLoadError}</span>
            </div>
          )}

          {/* QR Code Warning */}
          {qrWarning && (
            <div className="bg-[#3a2e1e] border border-[#ff9800] rounded-lg p-3">
              <span className="text-[#ff9800] text-sm">{qrWarning}</span>
            </div>
          )}

          {/* Server IP Warning (localhost fallback) */}
          {status?.warning && (
            <div className="bg-[#3a2e1e] border border-[#ff9800] rounded-lg p-3">
              <span className="text-[#ff9800] text-sm">{status.warning}</span>
            </div>
          )}

          {/* Config Form */}
          <ServerConfigForm
            config={config}
            ipAddresses={ipAddresses}
            branches={branches}
            disabled={isRunning || isLoading}
            onConfigChange={handleConfigChange}
          />

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {isRunning ? (
              <button
                onClick={handleStop}
                disabled={isLoading}
                className="flex-1 bg-[#d32f2f] hover:bg-[#b71c1c] text-white py-2.5 px-4 rounded font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '停止中...' : 'サーバーを停止'}
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={isLoading || !config}
                className="flex-1 bg-[#0078d4] hover:bg-[#106ebe] text-white py-2.5 px-4 rounded font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '起動中...' : 'サーバーを開始'}
              </button>
            )}
            <button
              onClick={handleClose}
              className="px-4 py-2.5 bg-[#3c3c3c] hover:bg-[#505050] text-[#cccccc] rounded font-medium text-sm transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
