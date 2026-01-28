import { useState, useCallback, useRef, useEffect } from 'react'
import { copyToClipboard } from '../utils/clipboardUtils'

interface UseCopyToClipboardResult {
  /** コピー成功状態（2秒後にリセット） */
  isCopied: boolean
  /** コピー実行関数 */
  copy: (text: string) => Promise<boolean>
  /** エラーメッセージ（失敗時） */
  error: string | null
}

/**
 * クリップボードコピー状態を管理するフック
 * @param resetDelay コピー成功状態のリセット時間（ミリ秒）デフォルト2000ms
 */
export function useCopyToClipboard(resetDelay: number = 2000): UseCopyToClipboardResult {
  const [isCopied, setIsCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const copy = useCallback(async (text: string): Promise<boolean> => {
    // 前回のタイマーをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    try {
      await copyToClipboard(text)
      setIsCopied(true)
      setError(null)

      // 指定時間後にリセット
      timeoutRef.current = setTimeout(() => {
        setIsCopied(false)
      }, resetDelay)

      return true
    } catch (err) {
      setIsCopied(false)
      setError(err instanceof Error ? err.message : 'コピーに失敗しました')
      return false
    }
  }, [resetDelay])

  return { isCopied, copy, error }
}
