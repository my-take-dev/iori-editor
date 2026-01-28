import { IconSpinner } from '../../Icons'

interface CloneProgressProps {
  url: string
}

export function CloneProgress({ url }: CloneProgressProps): JSX.Element {
  return (
    <div className="flex flex-col items-center py-8">
      <IconSpinner />
      <div className="text-[#cccccc] text-[13px] mt-4">クローン中...</div>
      <div className="text-[#808080] text-[11px] mt-2 truncate max-w-full">
        {url}
      </div>
    </div>
  )
}
