package git

import (
	"fmt"
	"log/slog"
	"strings"

	"github.com/go-git/go-git/v5/plumbing/object"
)

// GetStatus returns git status information
func (r *Repository) GetStatus() (string, error) {
	return r.runGitCommand("status", "--porcelain", "--untracked-files=all")
}

// GetChanges returns all changed files
// Uses system git command with -z for null-terminated output (handles special filenames safely)
func (r *Repository) GetChanges() ([]FileChange, error) {
	// Use git status -z for null-terminated output (handles special filenames)
	// Force listing all untracked files so folders expand into file entries.
	output, err := r.runGitCommandBytes("status", "-z", "--untracked-files=all")
	if err != nil {
		return nil, fmt.Errorf("failed to get status: %w", err)
	}

	var changes []FileChange
	if len(output) == 0 {
		return changes, nil
	}

	// NOTE: Per-file diff stats are intentionally omitted here to keep this fast on large repos.
	entries := parseStatusZOutput(output)
	for _, entry := range entries {
		change, valid := mapStatusToFileChange(entry)
		if !valid {
			continue
		}

		changes = append(changes, change)
	}

	return changes, nil
}

// getHeadTree returns the tree object for HEAD, or nil if unavailable
func (r *Repository) getHeadTree() *object.Tree {
	head, headErr := r.repo.Head()
	if headErr != nil {
		slog.Debug("Cannot get HEAD for diff stats, stats will be unavailable", "error", headErr)
		return nil
	}

	commit, commitErr := r.repo.CommitObject(head.Hash())
	if commitErr != nil {
		slog.Debug("Cannot get commit for diff stats", "error", commitErr)
		return nil
	}

	tree, treeErr := commit.Tree()
	if treeErr != nil {
		slog.Debug("Cannot get tree for diff stats", "error", treeErr)
		return nil
	}

	return tree
}

// HasUncommittedChanges checks if the repository has uncommitted changes
func (r *Repository) HasUncommittedChanges() (bool, error) {
	output, err := r.runGitCommandRaw("status", "--porcelain")
	if err != nil {
		return false, err
	}
	return strings.TrimSpace(output) != "", nil
}

// HasUncommittedChangesInPath checks if a specific worktree path has uncommitted changes
func HasUncommittedChangesInPath(worktreePath string) (bool, error) {
	repo, err := Open(worktreePath)
	if err != nil {
		return false, fmt.Errorf("failed to open repository: %w", err)
	}

	output, err := repo.runGitCommandRaw("status", "--porcelain")
	if err != nil {
		return false, fmt.Errorf("failed to check status: %w", err)
	}

	return strings.TrimSpace(output) != "", nil
}

// GetAheadBehind returns how many commits ahead/behind the current branch is
// Returns (0, 0, nil) when no upstream is configured (expected case)
// Returns error for unexpected failures (disk I/O, repository corruption, etc.)
func (r *Repository) GetAheadBehind() (ahead int, behind int, err error) {
	output, err := r.runGitCommand("rev-list", "--left-right", "--count", "@{u}...HEAD")
	if err != nil {
		// Expected case: no upstream configured - return zeros without error
		if strings.Contains(err.Error(), "no upstream") || strings.Contains(err.Error(), "@{u}") {
			return 0, 0, nil
		}
		// Unexpected error - return it for proper handling by callers
		return 0, 0, fmt.Errorf("failed to get ahead/behind: %w", err)
	}

	var a, b int
	_, parseErr := fmt.Sscanf(output, "%d\t%d", &b, &a)
	if parseErr != nil {
		return 0, 0, fmt.Errorf("failed to parse ahead/behind output %q: %w", output, parseErr)
	}
	return a, b, nil
}

// GetAheadBehindInPath returns how many commits ahead/behind for a specific worktree path
func GetAheadBehindInPath(worktreePath string) (ahead int, behind int, err error) {
	repo, err := Open(worktreePath)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to open repository: %w", err)
	}

	return repo.GetAheadBehind()
}

// CommitInfo contains information about a commit
type CommitInfo struct {
	Hash      string
	ShortHash string
	Time      string // ISO 8601 format
}

// GetLatestCommitInfo returns information about the latest commit in the repository
func (r *Repository) GetLatestCommitInfo() (*CommitInfo, error) {
	// Get all commit info in a single command (optimized from 3 separate commands)
	// Format: full_hash\nshort_hash\ncommit_time
	output, err := r.runGitCommand("log", "-1", "--format=%H%n%h%n%cI")
	if err != nil {
		return nil, fmt.Errorf("failed to get commit info: %w", err)
	}

	lines := strings.Split(strings.TrimSpace(output), "\n")
	if len(lines) < 3 {
		return nil, fmt.Errorf("unexpected git log output format: expected 3 lines, got %d", len(lines))
	}

	return &CommitInfo{
		Hash:      strings.TrimSpace(lines[0]),
		ShortHash: strings.TrimSpace(lines[1]),
		Time:      strings.TrimSpace(lines[2]),
	}, nil
}

// GetLatestCommitInfoInPath returns commit info for a specific worktree path
func GetLatestCommitInfoInPath(worktreePath string) (*CommitInfo, error) {
	repo, err := Open(worktreePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open repository: %w", err)
	}

	return repo.GetLatestCommitInfo()
}
