import type { FileNode } from '../components/FileExplorer/types'

/**
 * Represents a flattened node for virtualized rendering
 */
export interface FlatNode {
  id: string
  name: string
  path: string
  isDir: boolean
  depth: number
  isExpanded: boolean
  hasChildren: boolean
  isLoading?: boolean
  parentPath: string | null
}

/**
 * Flattens a tree structure into a list based on expanded state.
 * Only includes visible nodes (expanded parents).
 */
export function flattenTree(
  nodes: FileNode[],
  expandedPaths: Set<string>,
  loadingPaths: Set<string> = new Set(),
  depth: number = 0,
  parentPath: string | null = null
): FlatNode[] {
  const result: FlatNode[] = []

  for (const node of nodes) {
    const isExpanded = expandedPaths.has(node.path)
    // Use hasChildren from node if available (lazy loading), otherwise check children array
    const hasChildren = node.isDir && (node.hasChildren || (node.children?.length ?? 0) > 0)
    const isLoading = loadingPaths.has(node.path)

    result.push({
      id: node.path,
      name: node.name,
      path: node.path,
      isDir: node.isDir,
      depth,
      isExpanded,
      hasChildren,
      isLoading,
      parentPath,
    })

    // Add children if directory is expanded and has children loaded
    if (node.isDir && isExpanded && node.children) {
      result.push(...flattenTree(node.children, expandedPaths, loadingPaths, depth + 1, node.path))
    }
  }

  return result
}

/**
 * Gets all ancestor paths for a given path.
 * Used to expand all parent directories when navigating to a file.
 */
export function getAncestorPaths(path: string): string[] {
  // Handle both forward and back slashes (Windows compatibility)
  const normalizedPath = path.replace(/\\/g, '/')
  const parts = normalizedPath.split('/')
  const ancestors: string[] = []

  for (let i = 1; i < parts.length; i++) {
    ancestors.push(parts.slice(0, i).join('/'))
  }

  return ancestors
}

/**
 * Merges children nodes into a tree at the specified path.
 * Returns a new tree with the children merged.
 */
export function mergeChildrenIntoTree(
  tree: FileNode[],
  targetPath: string,
  children: FileNode[]
): FileNode[] {
  return tree.map((node) => {
    if (node.path === targetPath) {
      // Found the target node, merge children
      return {
        ...node,
        children,
        hasChildren: children.length > 0,
      }
    }

    if (node.isDir && node.children && targetPath.startsWith(node.path + '/')) {
      // Target is deeper in this subtree, recurse
      return {
        ...node,
        children: mergeChildrenIntoTree(node.children, targetPath, children),
      }
    }

    // Node doesn't contain target, return as-is
    return node
  })
}

/**
 * Gets the parent path of a given path.
 * Returns null for root-level paths.
 */
export function getParentPath(path: string): string | null {
  const normalizedPath = path.replace(/\\/g, '/')
  const lastSlash = normalizedPath.lastIndexOf('/')
  if (lastSlash <= 0) {
    return null
  }
  return normalizedPath.substring(0, lastSlash)
}
