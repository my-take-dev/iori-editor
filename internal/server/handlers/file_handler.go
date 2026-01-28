package handlers

import (
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// FileTreeItem represents a file or folder in the file tree
type FileTreeItem struct {
	Name     string          `json:"name"`
	Path     string          `json:"path"`
	Type     string          `json:"type"` // "file" or "folder"
	Children []*FileTreeItem `json:"children,omitempty"`
}

// FileTreeResult contains the file tree and any warnings encountered during building
type FileTreeResult struct {
	Items    []*FileTreeItem
	Warnings []string
}

// HandleListFiles handles GET /api/files
func (h *APIHandler) HandleListFiles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get worktree path from query parameter
	worktreePath := r.URL.Query().Get("worktree")
	targetPath := h.repoPath

	if worktreePath != "" {
		// Security: validate worktree path is within allowed directories
		if !h.isValidWorktreePath(worktreePath) {
			jsonError(w, "Invalid worktree path", http.StatusBadRequest)
			return
		}
		targetPath = worktreePath
	}

	// Build file tree with only .md files and their parent directories
	result, err := h.buildFileTree(targetPath, "")
	if err != nil {
		slog.Error("Failed to build file tree", "error", err, "targetPath", targetPath)
		jsonError(w, "Failed to list files", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"files": result.Items,
	}
	// Include warnings if any directories could not be read
	if len(result.Warnings) > 0 {
		response["warnings"] = result.Warnings
	}

	jsonResponse(w, response)
}

// buildFileTree recursively builds a file tree containing only .md files and directories
func (h *APIHandler) buildFileTree(basePath, relativePath string) (*FileTreeResult, error) {
	currentPath := basePath
	if relativePath != "" {
		currentPath = filepath.Join(basePath, relativePath)
	}

	entries, err := os.ReadDir(currentPath)
	if err != nil {
		return nil, err
	}

	result := &FileTreeResult{
		Items:    []*FileTreeItem{},
		Warnings: []string{},
	}

	// Skip hidden and common non-essential directories
	skipDirs := map[string]bool{
		".git":         true,
		"node_modules": true,
		".vscode":      true,
		".idea":        true,
		"vendor":       true,
		"dist":         true,
		"build":        true,
		".claude":      true,
	}

	for _, entry := range entries {
		name := entry.Name()

		// Skip hidden files/dirs (starting with .)
		if strings.HasPrefix(name, ".") && name != "." && name != ".." {
			continue
		}

		entryRelPath := name
		if relativePath != "" {
			entryRelPath = filepath.Join(relativePath, name)
		}

		if entry.IsDir() {
			// Skip certain directories
			if skipDirs[name] {
				continue
			}

			// Recursively get children
			childResult, err := h.buildFileTree(basePath, entryRelPath)
			if err != nil {
				slog.Warn("Failed to read directory", "path", entryRelPath, "error", err)
				result.Warnings = append(result.Warnings, "Failed to read directory: "+entryRelPath)
				continue
			}

			// Merge child warnings
			result.Warnings = append(result.Warnings, childResult.Warnings...)

			// Include all directories (regardless of .md files)
			result.Items = append(result.Items, &FileTreeItem{
				Name:     name,
				Path:     filepath.ToSlash(entryRelPath),
				Type:     "folder",
				Children: childResult.Items,
			})
		} else if strings.HasSuffix(strings.ToLower(name), ".md") {
			// Include .md files
			result.Items = append(result.Items, &FileTreeItem{
				Name: name,
				Path: filepath.ToSlash(entryRelPath),
				Type: "file",
			})
		}
	}

	return result, nil
}

// HandleGetFile handles GET /api/files/{path}
func (h *APIHandler) HandleGetFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get worktree path from query parameter
	worktreePath := r.URL.Query().Get("worktree")
	basePath := h.repoPath

	if worktreePath != "" {
		// Security: validate worktree path is within allowed directories
		if !h.isValidWorktreePath(worktreePath) {
			jsonError(w, "Invalid worktree path", http.StatusBadRequest)
			return
		}
		basePath = worktreePath
	}

	// Extract path from URL (remove query string first)
	urlPath := r.URL.Path
	path := strings.TrimPrefix(urlPath, "/api/files/")

	// Security check: prevent path traversal
	cleanPath := filepath.Clean(path)

	// Resolve to absolute path within basePath
	fullPath := filepath.Join(basePath, cleanPath)
	absFullPath, err := filepath.Abs(fullPath)
	if err != nil {
		slog.Error("Failed to resolve file path", "error", err, "path", fullPath)
		jsonError(w, "Invalid path", http.StatusBadRequest)
		return
	}

	absBasePath, err := filepath.Abs(basePath)
	if err != nil {
		slog.Error("Failed to resolve base path", "error", err, "path", basePath)
		jsonError(w, "Internal error", http.StatusInternalServerError)
		return
	}

	// Ensure the resolved path is within basePath (path traversal prevention)
	if !strings.HasPrefix(absFullPath, absBasePath+string(filepath.Separator)) && absFullPath != absBasePath {
		jsonError(w, "Invalid path", http.StatusBadRequest)
		return
	}

	// Only allow .md files
	if !strings.HasSuffix(strings.ToLower(cleanPath), ".md") {
		jsonError(w, "Only markdown files are accessible", http.StatusForbidden)
		return
	}

	// Read file content
	content, err := os.ReadFile(absFullPath)
	if err != nil {
		if os.IsNotExist(err) {
			jsonError(w, "File not found", http.StatusNotFound)
			return
		}
		slog.Error("Failed to read file", "error", err, "path", absFullPath)
		jsonError(w, "Failed to read file", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]interface{}{
		"path":    cleanPath,
		"name":    filepath.Base(cleanPath),
		"content": string(content),
	})
}

// isValidWorktreePath checks if the given path is a valid worktree path
// Returns true if the path is within the worktrees directory or is the main repo path
func (h *APIHandler) isValidWorktreePath(path string) bool {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return false
	}

	// Allow main repo path
	absRepoPath, err := filepath.Abs(h.repoPath)
	if err != nil {
		return false
	}
	if absPath == absRepoPath {
		return true
	}

	// Allow paths within worktrees directory
	worktreesDir := h.getServerWorktreesDir()
	absWorktreesDir, err := filepath.Abs(worktreesDir)
	if err != nil {
		return false
	}

	// Check if path is within worktrees directory
	if strings.HasPrefix(absPath, absWorktreesDir+string(filepath.Separator)) {
		return true
	}

	return false
}
