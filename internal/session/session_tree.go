package session

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"iori-editor/internal/util"
)

// FileNode represents a file or directory in the tree
type FileNode struct {
	Name        string      `json:"name"`
	Path        string      `json:"path"`
	IsDir       bool        `json:"isDir"`
	HasChildren bool        `json:"hasChildren,omitempty"`
	Children    []*FileNode `json:"children,omitempty"`
}

// maxTreeDepth is the maximum depth for recursive directory traversal
const maxTreeDepth = 30

// defaultSkipDirs defines directories to skip during tree traversal
var defaultSkipDirs = map[string]bool{
	".git":         true,
	"node_modules": true,
	".idea":        true,
	".vscode":      true,
	"__pycache__":  true,
	".next":        true,
	"dist":         true,
	"build":        true,
}

// GetFileTree returns the file tree for the session's work directory
// Only returns root level nodes (depth=1) for lazy loading
func (s *Session) GetFileTree() ([]*FileNode, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Check cache first
	cacheKey := ""
	if cached, ok := s.treeCache.Get(cacheKey); ok {
		return cached, nil
	}

	nodes, err := s.buildFileTree(s.WorkDir, "", 0, 2)
	if err != nil {
		return nil, err
	}

	// Store in cache
	s.treeCache.Set(cacheKey, nodes)
	return nodes, nil
}

// GetDirectoryChildren returns the children of a specific directory (for lazy loading)
// path is relative to the session's work directory
func (s *Session) GetDirectoryChildren(relativePath string) ([]*FileNode, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Check cache first
	if cached, ok := s.treeCache.Get(relativePath); ok {
		return cached, nil
	}

	// Security: ensure path is within work directory
	fullPath, err := util.SecureJoin(s.WorkDir, relativePath)
	if err != nil {
		return nil, fmt.Errorf("invalid path: %w", err)
	}

	// Check if directory exists
	info, err := os.Stat(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("directory not found: %s", relativePath)
		}
		return nil, fmt.Errorf("failed to stat directory: %w", err)
	}

	if !info.IsDir() {
		return nil, fmt.Errorf("path is not a directory: %s", relativePath)
	}

	// Build tree for this directory only (depth=1 from this path)
	nodes, err := s.buildFileTree(fullPath, relativePath, 0, 1)
	if err != nil {
		return nil, err
	}

	// Store in cache
	s.treeCache.Set(relativePath, nodes)
	return nodes, nil
}

// buildFileTree recursively builds the file tree
// targetDepth controls how deep to recurse (0 = unlimited, 1 = current level only, etc.)
func (s *Session) buildFileTree(dir string, relativePath string, depth int, targetDepth int) ([]*FileNode, error) {
	// Depth limit to prevent stack overflow
	if depth > maxTreeDepth {
		slog.Warn("directory tree truncated: max depth exceeded",
			"path", relativePath,
			"maxDepth", maxTreeDepth)
		return nil, nil
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %w", err)
	}

	var nodes []*FileNode

	for _, entry := range entries {
		name := entry.Name()

		// Skip symlinks to prevent infinite loops
		if entry.Type()&os.ModeSymlink != 0 {
			slog.Debug("skipping symlink in file tree",
				"path", filepath.Join(relativePath, name))
			continue
		}

		// Skip hidden files and excluded directories
		if strings.HasPrefix(name, ".") && name != ".claude" {
			continue
		}
		if entry.IsDir() && defaultSkipDirs[name] {
			continue
		}

		nodePath := name
		if relativePath != "" {
			nodePath = relativePath + "/" + name
		}

		node := &FileNode{
			Name:  name,
			Path:  nodePath,
			IsDir: entry.IsDir(),
		}

		if entry.IsDir() {
			childDir := filepath.Join(dir, name)

			// Only recurse if we haven't reached target depth (0 = unlimited)
			if targetDepth == 0 || depth < targetDepth {
				children, err := s.buildFileTree(childDir, nodePath, depth+1, targetDepth)
				if err != nil {
					slog.Warn("failed to read subdirectory",
						"path", nodePath,
						"error", err)
					// On error, mark as expandable and let lazy loading confirm.
					node.HasChildren = true
				} else {
					node.Children = children
					// Determine HasChildren from the actual children (avoid double I/O)
					node.HasChildren = len(children) > 0
				}
			} else {
				// At target depth, avoid extra I/O; mark as expandable for lazy loading.
				node.HasChildren = true
			}
		}

		nodes = append(nodes, node)
	}

	// Sort: directories first, then files, alphabetically
	sortFileNodes(nodes)

	return nodes, nil
}

// sortFileNodes sorts nodes: directories first, then files, alphabetically
// Uses sort.Slice for O(N log N) performance instead of O(N²) bubble sort
func sortFileNodes(nodes []*FileNode) {
	sort.Slice(nodes, func(i, j int) bool {
		// ディレクトリを先に
		if nodes[i].IsDir != nodes[j].IsDir {
			return nodes[i].IsDir
		}
		// 名前でアルファベット順（大文字小文字無視）
		return strings.ToLower(nodes[i].Name) < strings.ToLower(nodes[j].Name)
	})
}
