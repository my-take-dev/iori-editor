import { useState, useRef, useEffect, useCallback } from 'react'
import { useCommitTemplateStore, selectTemplates } from '../../../stores/commitTemplateStore'
import { IconChevronDown } from '../../Icons'

interface TemplateDropdownProps {
  onSelectTemplate: (content: string) => void
  onOpenManager: () => void
}

export function TemplateDropdown({
  onSelectTemplate,
  onOpenManager,
}: TemplateDropdownProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const templates = useCommitTemplateStore(selectTemplates)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelectTemplate = useCallback((content: string) => {
    onSelectTemplate(content)
    setIsOpen(false)
  }, [onSelectTemplate])

  const handleOpenManager = useCallback(() => {
    onOpenManager()
    setIsOpen(false)
  }, [onOpenManager])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-[12px] text-[#808080] hover:text-[#cccccc] hover:bg-[#3c3c3c] rounded transition-colors"
        title="テンプレートを挿入"
      >
        <span>📋</span>
        <IconChevronDown size="sm" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 min-w-[200px] bg-[#252526] border border-[#3c3c3c] rounded shadow-lg z-50">
          {templates.length > 0 ? (
            <>
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template.content)}
                  className="w-full px-3 py-1.5 text-left text-[13px] text-[#cccccc] hover:bg-[#094771] truncate"
                  title={template.content}
                >
                  {template.name}
                </button>
              ))}
              <div className="border-t border-[#3c3c3c]" />
            </>
          ) : (
            <div className="px-3 py-2 text-[12px] text-[#808080]">
              テンプレートがありません
            </div>
          )}
          <button
            onClick={handleOpenManager}
            className="w-full px-3 py-1.5 text-left text-[13px] text-[#cccccc] hover:bg-[#094771]"
          >
            テンプレート管理...
          </button>
        </div>
      )}
    </div>
  )
}
