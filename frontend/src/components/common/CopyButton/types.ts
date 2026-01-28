export type CopyButtonVariant = 'icon' | 'text' | 'icon-text'
export type CopyButtonSize = 'xs' | 'sm' | 'md'

export interface CopyButtonProps {
  /** コピーするテキスト */
  text: string
  /** 表示バリアント */
  variant?: CopyButtonVariant
  /** サイズ */
  size?: CopyButtonSize
  /** ツールチップテキスト */
  tooltip?: string
  /** コピー成功時コールバック */
  onCopy?: () => void
  /** 追加スタイル */
  className?: string
  /** ボタンのラベル（variant が 'text' または 'icon-text' の場合） */
  label?: string
}
