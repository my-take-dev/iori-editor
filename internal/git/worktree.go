package git

import (
	"fmt"
	"strings"
)

// CreateWorktree creates a new worktree with a new branch from the specified base branch
func (r *Repository) CreateWorktree(worktreePath string, branchName string, baseBranch string) error {
	if err := ValidateBranchName(branchName); err != nil {
		return fmt.Errorf("invalid branch name: %w", err)
	}
	// Use system git command: git worktree add -b <new-branch> -- <path> <commit-ish>
	_, err := r.runGitCommand("worktree", "add", "-b", branchName, "--", worktreePath, baseBranch)
	if err != nil {
		return err
	}
	return nil
}

// CreateWorktreeFromBranch creates a worktree from an existing branch (without creating a new branch)
func (r *Repository) CreateWorktreeFromBranch(worktreePath, existingBranch string) error {
	if err := ValidateBranchName(existingBranch); err != nil {
		return fmt.Errorf("invalid branch name: %w", err)
	}
	_, err := r.runGitCommand("worktree", "add", "--", worktreePath, existingBranch)
	if err != nil {
		return err
	}
	return nil
}

// RemoveWorktree removes a worktree
func (r *Repository) RemoveWorktree(worktreePath string) error {
	_, err := r.runGitCommand("worktree", "remove", "--", worktreePath)
	if err != nil {
		return err
	}
	return nil
}

// RemoveWorktreeForced removes a worktree even with uncommitted changes
func (r *Repository) RemoveWorktreeForced(worktreePath string) error {
	_, err := r.runGitCommand("worktree", "remove", "--force", "--", worktreePath)
	if err != nil {
		return err
	}
	return nil
}

// ListWorktrees returns a list of worktrees
func (r *Repository) ListWorktrees() ([]string, error) {
	output, err := r.runGitCommand("worktree", "list", "--porcelain")
	if err != nil {
		return nil, err
	}

	var worktrees []string
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "worktree ") {
			worktrees = append(worktrees, strings.TrimPrefix(line, "worktree "))
		}
	}
	return worktrees, nil
}

// ListWorktreesWithInfo returns detailed information about all worktrees
func (r *Repository) ListWorktreesWithInfo() ([]WorktreeInfo, error) {
	output, err := r.runGitCommand("worktree", "list", "--porcelain")
	if err != nil {
		return nil, err
	}

	var worktrees []WorktreeInfo
	lines := strings.Split(output, "\n")

	var current WorktreeInfo
	isFirst := true
	for _, line := range lines {
		switch {
		case strings.HasPrefix(line, "worktree "):
			if !isFirst && current.Path != "" {
				worktrees = append(worktrees, current)
			}
			current = WorktreeInfo{
				Path:   strings.TrimPrefix(line, "worktree "),
				IsMain: isFirst,
			}
			isFirst = false
		case strings.HasPrefix(line, "branch refs/heads/"):
			current.Branch = strings.TrimPrefix(line, "branch refs/heads/")
		case line == "detached":
			current.IsDetached = true
		case line == "bare":
			// Skip bare worktrees
			current.Path = ""
		}
	}
	// Add the last worktree
	if current.Path != "" {
		worktrees = append(worktrees, current)
	}

	return worktrees, nil
}

// PruneWorktrees removes stale worktree entries (broken links)
func (r *Repository) PruneWorktrees() error {
	_, err := r.runGitCommand("worktree", "prune")
	return err
}
