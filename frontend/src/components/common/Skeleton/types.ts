export type SkeletonVariant = 'text' | 'rect' | 'circle' | 'line'

export interface SkeletonProps {
  /** 形状バリアント */
  variant?: SkeletonVariant
  /** 幅（Tailwindクラスまたはピクセル/パーセント） */
  width?: string | number
  /** 高さ（Tailwindクラスまたはピクセル） */
  height?: string | number
  /** アニメーション有効化 */
  animate?: boolean
  /** 追加クラス */
  className?: string
}

export interface SkeletonTextProps {
  /** 行数 */
  lines?: number
  /** 各行の幅（配列で個別指定可能） */
  widths?: (string | number)[]
  /** 行間（Tailwindクラス） */
  gap?: string
  /** 行高さ（ピクセル） */
  lineHeight?: number
  /** アニメーション有効化 */
  animate?: boolean
  /** 追加クラス */
  className?: string
}

export interface SkeletonListProps {
  /** 項目数 */
  count?: number
  /** 各項目の高さ（ピクセル） */
  itemHeight?: number
  /** アイコンを含めるか */
  showIcon?: boolean
  /** 行のインデント（FileExplorer風） */
  indent?: boolean
  /** アニメーション有効化 */
  animate?: boolean
  /** 追加クラス */
  className?: string
}

export interface SkeletonEditorProps {
  /** ツールバーを含めるか */
  showToolbar?: boolean
  /** 行番号を表示するか */
  showLineNumbers?: boolean
  /** 表示行数 */
  lines?: number
  /** アニメーション有効化 */
  animate?: boolean
  /** 追加クラス */
  className?: string
}
