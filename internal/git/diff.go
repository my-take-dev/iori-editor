package git

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-git/go-git/v5/plumbing/object"
)

// binaryExtensions contains file extensions that should be treated as binary
var binaryExtensions = map[string]bool{
	".exe": true, ".dll": true, ".so": true, ".dylib": true, ".a": true, ".o": true,
	".png": true, ".jpg": true, ".jpeg": true, ".gif": true, ".bmp": true, ".ico": true, ".webp": true, ".svg": true,
	".mp3": true, ".mp4": true, ".wav": true, ".avi": true, ".mov": true, ".webm": true, ".flv": true,
	".zip": true, ".tar": true, ".gz": true, ".bz2": true, ".xz": true, ".7z": true, ".rar": true,
	".pdf": true, ".doc": true, ".docx": true, ".xls": true, ".xlsx": true, ".ppt": true, ".pptx": true,
	".woff": true, ".woff2": true, ".ttf": true, ".otf": true, ".eot": true,
	".db": true, ".sqlite": true, ".bin": true, ".dat": true,
	".pyc": true, ".pyo": true, ".class": true,
}

// isBinaryFile checks if a file is binary based on its extension
func isBinaryFile(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	return binaryExtensions[ext]
}

// getDiffStatsWithTree gets diff stats using pre-fetched tree
// tree can be nil for initial commits (repository with no HEAD)
func (r *Repository) getDiffStatsWithTree(path string, tree *object.Tree) (added, removed int) {
	var originalContent string

	if tree != nil {
		file, err := tree.File(path)
		if err == nil {
			contents, contentsErr := file.Contents()
			if contentsErr != nil {
				slog.Debug("getDiffStatsWithTree: failed to read file contents", "path", path, "error", contentsErr)
			} else {
				originalContent = contents
			}
		}
	}

	fullPath := filepath.Join(r.path, path)
	currentContent, err := os.ReadFile(fullPath)
	if err != nil {
		return 0, strings.Count(originalContent, "\n")
	}

	originalLines := strings.Count(originalContent, "\n")
	currentLines := strings.Count(string(currentContent), "\n")

	if currentLines > originalLines {
		added = currentLines - originalLines
	} else {
		removed = originalLines - currentLines
	}

	return added, removed
}

// getDiffStats gets the number of lines added and removed
// This is a backward-compatible wrapper that fetches tree internally
func (r *Repository) getDiffStats(path string) (added, removed int) {
	head, err := r.repo.Head()
	if err != nil {
		slog.Debug("getDiffStats: failed to get HEAD", "path", path, "error", err)
		return 0, 0
	}

	commit, err := r.repo.CommitObject(head.Hash())
	if err != nil {
		slog.Debug("getDiffStats: failed to get commit object", "path", path, "error", err)
		return 0, 0
	}

	tree, err := commit.Tree()
	if err != nil {
		slog.Debug("getDiffStats: failed to get tree", "path", path, "error", err)
		return 0, 0
	}

	return r.getDiffStatsWithTree(path, tree)
}

// GetFileDiff returns the original and modified content of a file
func (r *Repository) GetFileDiff(path string) (original, modified string, err error) {
	// Skip binary files to improve performance
	if isBinaryFile(path) {
		return "[Binary file - diff not available]", "[Binary file - diff not available]", nil
	}

	// Use system git command to get file content from HEAD (works with worktrees)
	output, gitErr := r.runGitCommand("show", "HEAD:"+path)
	if gitErr == nil {
		original = output
	} else if !strings.Contains(gitErr.Error(), "does not exist") && !strings.Contains(gitErr.Error(), "bad revision") {
		// Log unexpected errors (not "new file" or "no HEAD" cases)
		slog.Debug("GetFileDiff: unexpected error getting original content", "path", path, "error", gitErr)
	}
	// If git show fails, original stays empty (new file or no HEAD)

	// Get current file content
	fullPath := filepath.Join(r.path, path)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			return original, "", nil // File was deleted
		}
		return "", "", fmt.Errorf("failed to read file: %w", err)
	}

	return original, string(content), nil
}
