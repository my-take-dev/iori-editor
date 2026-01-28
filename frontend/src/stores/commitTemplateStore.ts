import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CommitTemplate {
  id: string
  name: string
  content: string
}

interface CommitTemplateState {
  templates: CommitTemplate[]
  addTemplate: (name: string, content: string) => void
  updateTemplate: (id: string, name: string, content: string) => void
  deleteTemplate: (id: string) => void
}

export const useCommitTemplateStore = create<CommitTemplateState>()(
  persist(
    (set) => ({
      templates: [],

      addTemplate: (name, content) =>
        set((state) => ({
          templates: [
            ...state.templates,
            {
              id: crypto.randomUUID(),
              name,
              content,
            },
          ],
        })),

      updateTemplate: (id, name, content) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, name, content } : t
          ),
        })),

      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        })),
    }),
    {
      name: 'commit-templates',
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('Failed to rehydrate commit templates from localStorage:', error)
          // State will remain at initial value (empty templates array)
        }
      },
    }
  )
)

// Selectors
export const selectTemplates = (state: CommitTemplateState) => state.templates
