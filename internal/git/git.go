package git

import (
	"bytes"
	"fmt"
	"log/slog"
	"os/exec"
	"strings"
	"time"

	"github.com/go-git/go-git/v5"
)

// Open opens an existing git repository
func Open(path string) (*Repository, error) {
	start := time.Now()
	repo, err := git.PlainOpen(path)
	slog.Info("[Perf] git.PlainOpen",
		"duration_ms", time.Since(start).Milliseconds(),
		"path", path,
		"error", err)
	if err != nil {
		return nil, fmt.Errorf("failed to open repository: %w", err)
	}

	return &Repository{
		path: path,
		repo: repo,
	}, nil
}

// IsGitRepository checks if the path is a git repository
func IsGitRepository(path string) bool {
	start := time.Now()
	_, err := git.PlainOpen(path)
	slog.Debug("[Perf] IsGitRepository check",
		"duration_ms", time.Since(start).Milliseconds(),
		"path", path,
		"isGitRepo", err == nil)
	return err == nil
}

// GetPath returns the repository path
func (r *Repository) GetPath() string {
	return r.path
}

// Commit creates a new commit with the staged changes
// Uses system git command to leverage user's configured identity
func (r *Repository) Commit(message string) (string, error) {
	// Use system git (uses user's configured name/email)
	_, err := r.runGitCommand("commit", "-m", message)
	if err != nil {
		// Return error with helpful message about git config
		return "", fmt.Errorf("git commit failed: %w (hint: ensure git config user.name and user.email are set)", err)
	}

	// Get the commit hash from HEAD
	head, err := r.repo.Head()
	if err != nil {
		// Commit succeeded but we can't retrieve the hash - log but don't fail
		slog.Warn("Commit succeeded but failed to get commit hash", "error", err)
		return "", nil
	}
	return head.Hash().String(), nil
}

// Clone clones a repository to the specified path
// Returns the path to the cloned repository
func Clone(url string, destPath string) (string, error) {
	// Validate URL to prevent argument injection
	if err := ValidateGitURL(url); err != nil {
		return "", fmt.Errorf("invalid URL: %w", err)
	}
	// Validate destPath doesn't start with '-' to prevent option injection
	if strings.HasPrefix(destPath, "-") {
		return "", fmt.Errorf("destination path cannot start with '-': %s", destPath)
	}

	// Use system git command for cloning (better authentication support)
	cmd := exec.Command("git", "clone", "--", url, destPath)
	hideWindow(cmd) // Hide console window on Windows

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	err := cmd.Run()
	if err != nil {
		errMsg := stderr.String()
		if errMsg == "" {
			errMsg = err.Error()
		}
		return "", fmt.Errorf("git clone failed: %s", strings.TrimSpace(errMsg))
	}

	return destPath, nil
}
