/**
 * クリップボードユーティリティ
 */

/**
 * テキストをクリップボードにコピーする
 * Clipboard API が使用できない場合はフォールバックを使用
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
  } else {
    // フォールバック: execCommand
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    textArea.style.top = '-9999px'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      const success = document.execCommand('copy')
      if (!success) {
        throw new Error('execCommand copy failed')
      }
    } finally {
      document.body.removeChild(textArea)
    }
  }
}
