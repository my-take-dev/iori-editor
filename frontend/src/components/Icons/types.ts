/**
 * Icon types and size mappings
 */

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface IconProps {
  size?: IconSize
  className?: string
}

export const sizeMap: Record<IconSize, string> = {
  xs: 'w-2.5 h-2.5', // 10px
  sm: 'w-3 h-3',     // 12px
  md: 'w-4 h-4',     // 16px (default)
  lg: 'w-5 h-5',     // 20px
  xl: 'w-6 h-6',     // 24px
}

export function getSizeClass(size: IconSize = 'md'): string {
  return sizeMap[size]
}
