import { useState, useCallback } from 'react'
import {
  useCommitTemplateStore,
  selectTemplates,
  type CommitTemplate,
} from '../../../stores/commitTemplateStore'

interface TemplateManagerModalProps {
  onClose: () => void
}

export function TemplateManagerModal({
  onClose,
}: TemplateManagerModalProps): JSX.Element {
  const templates = useCommitTemplateStore(selectTemplates)
  const addTemplate = useCommitTemplateStore((state) => state.addTemplate)
  const updateTemplate = useCommitTemplateStore((state) => state.updateTemplate)
  const deleteTemplate = useCommitTemplateStore((state) => state.deleteTemplate)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [formName, setFormName] = useState('')
  const [formContent, setFormContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleStartAdd = useCallback(() => {
    setIsAdding(true)
    setEditingId(null)
    setFormName('')
    setFormContent('')
  }, [])

  const handleStartEdit = useCallback((template: CommitTemplate) => {
    setEditingId(template.id)
    setIsAdding(false)
    setFormName(template.name)
    setFormContent(template.content)
  }, [])

  const handleCancel = useCallback(() => {
    setIsAdding(false)
    setEditingId(null)
    setFormName('')
    setFormContent('')
  }, [])

  const handleSave = useCallback(() => {
    if (!formName.trim() || !formContent.trim()) return

    try {
      setError(null)
      if (isAdding) {
        addTemplate(formName.trim(), formContent.trim())
      } else if (editingId) {
        updateTemplate(editingId, formName.trim(), formContent.trim())
      }

      setIsAdding(false)
      setEditingId(null)
      setFormName('')
      setFormContent('')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'テンプレートの保存に失敗しました'
      console.error('Failed to save template:', err)
      setError(errorMsg)
    }
  }, [formName, formContent, isAdding, editingId, addTemplate, updateTemplate])

  const handleDelete = useCallback((id: string) => {
    try {
      setError(null)
      deleteTemplate(id)
      if (editingId === id) {
        handleCancel()
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'テンプレートの削除に失敗しました'
      console.error('Failed to delete template:', err)
      setError(errorMsg)
    }
  }, [editingId, deleteTemplate, handleCancel])

  const isFormVisible = isAdding || editingId !== null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl w-[500px] max-h-[80vh] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-[#3c3c3c] bg-[#1e1e1e] rounded-t-lg flex justify-between items-center">
          <h2 className="font-semibold text-[#cccccc] text-[14px]">
            コミットテンプレート管理
          </h2>
          <button
            onClick={onClose}
            className="text-[#808080] hover:text-[#cccccc] text-[18px] leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-2 bg-[#5a1d1d] border border-[#f14c4c] rounded text-[#f14c4c] text-[12px] flex items-start gap-2">
              <span className="flex-1">{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-[#f14c4c] hover:text-white flex-shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          {/* Template list */}
          <div className="space-y-2 mb-4">
            {templates.length === 0 && !isFormVisible && (
              <div className="text-[#808080] text-[13px] text-center py-4">
                テンプレートがありません
              </div>
            )}
            {templates.map((template) => (
              <div
                key={template.id}
                className={`p-3 rounded border ${
                  editingId === template.id
                    ? 'border-[#007acc] bg-[#1e1e1e]'
                    : 'border-[#3c3c3c] bg-[#1e1e1e] hover:border-[#505050]'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#cccccc] text-[13px] truncate">
                      {template.name}
                    </div>
                    <div className="text-[#808080] text-[12px] mt-1 line-clamp-2">
                      {template.content}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleStartEdit(template)}
                      className="px-2 py-1 text-[12px] text-[#cccccc] hover:bg-[#3c3c3c] rounded"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="px-2 py-1 text-[12px] text-[#f48771] hover:bg-[#3c3c3c] rounded"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add/Edit form */}
          {isFormVisible && (
            <div className="p-3 rounded border border-[#007acc] bg-[#1e1e1e]">
              <div className="mb-3">
                <label className="block text-[12px] text-[#808080] mb-1">
                  テンプレート名
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例: feat: 新機能"
                  className="w-full px-2 py-1.5 bg-[#3c3c3c] border border-[#3c3c3c] focus:border-[#007acc] rounded text-[13px] text-[#cccccc] placeholder-[#808080] focus:outline-none"
                />
              </div>
              <div className="mb-3">
                <label className="block text-[12px] text-[#808080] mb-1">
                  コミットメッセージ
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="コミットメッセージの内容..."
                  rows={4}
                  className="w-full px-2 py-1.5 bg-[#3c3c3c] border border-[#3c3c3c] focus:border-[#007acc] rounded text-[13px] text-[#cccccc] placeholder-[#808080] resize-none focus:outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 border border-[#3c3c3c] hover:bg-[#3c3c3c] rounded text-[#cccccc] text-[13px] transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formName.trim() || !formContent.trim()}
                  className="px-3 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#3c3c3c] disabled:text-[#808080] rounded text-white text-[13px] transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#3c3c3c] flex justify-between">
          <button
            onClick={handleStartAdd}
            disabled={isFormVisible}
            className="px-3 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#3c3c3c] disabled:text-[#808080] rounded text-white text-[13px] transition-colors"
          >
            + 新規追加
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-[#3c3c3c] hover:bg-[#3c3c3c] rounded text-[#cccccc] text-[13px] transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
