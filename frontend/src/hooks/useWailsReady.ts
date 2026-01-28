import { useEffect, useState } from 'react'

/**
 * Hook to wait for Wails runtime to be ready
 * @returns boolean indicating if Wails is ready
 */
export function useWailsReady(): boolean {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const checkWails = (): void => {
      if (typeof window !== 'undefined' && (window as unknown as { go?: unknown }).go) {
        setIsReady(true)
      } else {
        timeoutId = setTimeout(checkWails, 100)
      }
    }
    checkWails()

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  return isReady
}
