import { useCloneFlow } from '../../hooks/useCloneFlow'
import { IconGithub } from '../Icons'
import { CloneInputForm, CloneProgress, CloneSuccess, CloneError } from './steps'

interface CloneModalProps {
  isOpen: boolean
  onClose: () => void
  onClone: (url: string, destPath: string) => Promise<string>
  onSelectFolder: () => Promise<string>
  onStartSession: (folderPath: string) => void
}

export function CloneModal({
  isOpen,
  onClose,
  onClone,
  onSelectFolder,
  onStartSession,
}: CloneModalProps): JSX.Element | null {
  const {
    step,
    url,
    destPath,
    clonedPath,
    error,
    setUrl,
    handleSelectDestination,
    handleClone,
    handleStartSession,
    goBackToInput,
    isValidUrl,
    getRepoName,
  } = useCloneFlow({
    isOpen,
    onClone,
    onSelectFolder,
    onStartSession,
    onClose,
  })

  if (!isOpen) return null

  function renderContent(): JSX.Element {
    switch (step) {
      case 'input':
        return (
          <CloneInputForm
            url={url}
            destPath={destPath}
            repoName={getRepoName(url)}
            isValidUrl={isValidUrl(url)}
            onUrlChange={setUrl}
            onSelectDestination={handleSelectDestination}
            onClone={handleClone}
          />
        )
      case 'cloning':
        return <CloneProgress url={url} />
      case 'success':
        return (
          <CloneSuccess
            clonedPath={clonedPath}
            onClose={onClose}
            onStartSession={handleStartSession}
          />
        )
      case 'error':
        return (
          <CloneError
            error={error}
            onBack={goBackToInput}
            onClose={onClose}
          />
        )
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-[520px] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-[#3c3c3c] flex justify-between items-center bg-[#1e1e1e] rounded-t-lg">
          <h2 className="font-semibold text-[#cccccc] text-[14px] flex items-center gap-2">
            <IconGithub />
            リポジトリをクローン
          </h2>
          <button
            onClick={onClose}
            className="text-[#808080] hover:text-white transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
