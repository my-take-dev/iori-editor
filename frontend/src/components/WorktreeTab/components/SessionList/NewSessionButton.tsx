import { IconPlus } from '../../../Icons'

interface NewSessionButtonProps {
  onClick: () => void
}

export function NewSessionButton({ onClick }: NewSessionButtonProps): JSX.Element {
  return (
    <div className="p-2 border-t border-[#3c3c3c]">
      <button
        onClick={onClick}
        className="w-full py-2 px-3 bg-[#0e639c] hover:bg-[#1177bb] rounded text-white text-[12px] font-medium flex items-center justify-center gap-2 transition-colors"
      >
        <IconPlus />
        NEW
      </button>
    </div>
  )
}
