/**
 * Path utility functions for cross-platform path comparison and manipulation.
 * Handles Windows/Unix path separator differences and case-insensitive comparison.
 *
 * NOTE: All comparisons are case-insensitive, which is appropriate for Windows
 * but may cause false positives on case-sensitive Unix filesystems.
 */

export interface NormalizePathOptions {
  /** Remove trailing slash from path. Default: true */
  removeTrailingSlash?: boolean
}

/**
 * Normalize a file system path for cross-platform comparison.
 * - Converts backslashes to forward slashes (Windows compatibility)
 * - Converts to lowercase (enables case-insensitive matching)
 * - Optionally removes trailing slash (preserves root path '/')
 *
 * @param path - The path to normalize
 * @param options - Normalization options
 * @returns Normalized path string, or empty string if path is empty/falsy
 */
export function normalizePath(
  path: string,
  options: NormalizePathOptions = {}
): string {
  const { removeTrailingSlash = true } = options

  if (!path) {
    return ''
  }

  let normalized = path.replace(/\\/g, '/').toLowerCase()

  if (removeTrailingSlash && normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1)
  }

  return normalized
}

/**
 * Compare two paths for equality (case-insensitive, separator-agnostic).
 * Trailing slashes are ignored, so "/foo/" equals "/foo".
 *
 * @param path1 - First path to compare
 * @param path2 - Second path to compare
 * @returns true if paths are equivalent
 */
export function arePathsEqual(path1: string, path2: string): boolean {
  return normalizePath(path1) === normalizePath(path2)
}

/**
 * Check if a path exists in a list of paths (normalized comparison).
 * Comparison is case-insensitive and ignores trailing slashes.
 *
 * @param path - The path to check
 * @param pathList - List of paths to search in
 * @returns true if path is found in the list
 */
export function isPathInList(path: string, pathList: string[]): boolean {
  const normalizedPath = normalizePath(path)
  return pathList.some((p) => normalizePath(p) === normalizedPath)
}

/**
 * Filter items by excluding those whose paths are in the given list.
 * Useful for filtering out already-opened worktrees, sessions, etc.
 *
 * @param items - Array of items to filter
 * @param excludePaths - List of paths to exclude
 * @param getPath - Function to extract path from item
 * @returns Filtered array of items
 */
export function filterPathsNotInList<T>(
  items: T[],
  excludePaths: string[],
  getPath: (item: T) => string
): T[] {
  const normalizedExcludePaths = excludePaths.map((p) => normalizePath(p))
  return items.filter(
    (item) => !normalizedExcludePaths.includes(normalizePath(getPath(item)))
  )
}
