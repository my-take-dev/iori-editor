package git

import (
	"fmt"
	"log/slog"
	"strings"
)

// GetCurrentBranch returns the current branch name
// Note: Falls back to go-git library if system git command fails, which may have different behavior
func (r *Repository) GetCurrentBranch() (string, error) {
	// Use system git command for accurate branch name
	output, err := r.runGitCommand("rev-parse", "--abbrev-ref", "HEAD")
	if err != nil {
		// Fallback to go-git - log for debugging but don't treat as an error
		// since go-git usually provides the same result
		slog.Debug("System git command failed, using go-git fallback",
			"error", err,
			"path", r.path,
			"note", "this is normal if git is not in PATH")
		head, goGitErr := r.repo.Head()
		if goGitErr != nil {
			return "", fmt.Errorf("failed to get current branch (git: %v, go-git: %w)", err, goGitErr)
		}
		return head.Name().Short(), nil
	}
	return output, nil
}

// GetBranches returns all branches (local and remote)
// Returns error if both local and remote branch fetches fail
func (r *Repository) GetBranches() ([]BranchInfo, error) {
	var branches []BranchInfo
	seenBranches := make(map[string]bool)

	// Get current branch
	currentBranch, err := r.GetCurrentBranch()
	if err != nil {
		// Log the error but continue - this may happen in detached HEAD state
		slog.Debug("GetBranches: failed to get current branch", "error", err)
		currentBranch = ""
	}

	// Get local branches using system git
	localOutput, localErr := r.runGitCommand("branch", "--format=%(refname:short)")
	if localErr != nil {
		slog.Debug("GetBranches: failed to get local branches", "error", localErr)
	} else if localOutput != "" {
		for _, name := range strings.Split(localOutput, "\n") {
			name = strings.TrimSpace(name)
			if name != "" && !seenBranches[name] {
				seenBranches[name] = true
				branches = append(branches, BranchInfo{
					Name:      name,
					IsCurrent: name == currentBranch,
					IsRemote:  false,
				})
			}
		}
	}

	// Get remote branches using system git
	remoteOutput, remoteErr := r.runGitCommand("branch", "-r", "--format=%(refname:short)")
	if remoteErr != nil {
		slog.Debug("GetBranches: failed to get remote branches", "error", remoteErr)
	} else if remoteOutput != "" {
		for _, name := range strings.Split(remoteOutput, "\n") {
			name = strings.TrimSpace(name)
			if name == "" || strings.Contains(name, "HEAD") {
				continue
			}
			// Remove "origin/" prefix for display, but track as remote
			shortName := name
			if strings.HasPrefix(name, "origin/") {
				shortName = strings.TrimPrefix(name, "origin/")
			}
			// Skip if we already have this as a local branch
			if seenBranches[shortName] {
				continue
			}
			seenBranches[shortName] = true
			branches = append(branches, BranchInfo{
				Name:      shortName,
				IsCurrent: false,
				IsRemote:  true,
			})
		}
	}

	// Return error if both local and remote fetches failed
	if localErr != nil && remoteErr != nil {
		return branches, fmt.Errorf("get branches: failed to fetch local (%v) and remote (%v) branches", localErr, remoteErr)
	}

	return branches, nil
}

// GetBranchesExcludingWorktrees returns remote branches for worktree creation.
// Since worktree creation always creates a new branch from a base,
// we only need remote branches - no need to exclude checked-out branches.
func (r *Repository) GetBranchesExcludingWorktrees() ([]BranchInfo, error) {
	var branches []BranchInfo

	// Get remote branches only
	remoteOutput, err := r.runGitCommand("branch", "-r", "--format=%(refname:short)")
	if err != nil {
		return nil, fmt.Errorf("failed to get remote branches: %w", err)
	}

	if remoteOutput != "" {
		for _, name := range strings.Split(remoteOutput, "\n") {
			name = strings.TrimSpace(name)
			if name == "" || strings.Contains(name, "HEAD") {
				continue
			}
			// Remove "origin/" prefix for display
			shortName := name
			if strings.HasPrefix(name, "origin/") {
				shortName = strings.TrimPrefix(name, "origin/")
			}
			branches = append(branches, BranchInfo{
				Name:      shortName,
				IsCurrent: false,
				IsRemote:  true,
			})
		}
	}

	return branches, nil
}

// CreateBranch creates a new branch from the current HEAD and switches to it
func (r *Repository) CreateBranch(name string) error {
	if err := ValidateBranchName(name); err != nil {
		return fmt.Errorf("invalid branch name: %w", err)
	}
	// Use system git command for better compatibility
	_, err := r.runGitCommand("checkout", "-b", name, "--")
	if err != nil {
		return fmt.Errorf("failed to create branch %s: %w", name, err)
	}
	return nil
}

// CreateBranchFrom creates a new branch from a specified base branch and switches to it
func (r *Repository) CreateBranchFrom(name string, baseBranch string) error {
	if err := ValidateBranchName(name); err != nil {
		return fmt.Errorf("invalid branch name: %w", err)
	}
	if err := ValidateBranchName(baseBranch); err != nil {
		return fmt.Errorf("invalid base branch name: %w", err)
	}
	// Use system git command: git checkout -b <new-branch> <base-branch>
	_, err := r.runGitCommand("checkout", "-b", name, baseBranch, "--")
	if err != nil {
		return fmt.Errorf("failed to create branch %s from %s: %w", name, baseBranch, err)
	}
	return nil
}

// CheckoutBranch switches to an existing branch
func (r *Repository) CheckoutBranch(name string) error {
	if err := ValidateBranchName(name); err != nil {
		return fmt.Errorf("invalid branch name: %w", err)
	}
	_, err := r.runGitCommand("checkout", name, "--")
	if err != nil {
		return fmt.Errorf("failed to checkout branch %s: %w", name, err)
	}
	return nil
}

// DeleteBranch deletes a local branch
// Use force=true to delete branches that have not been merged
func (r *Repository) DeleteBranch(name string, force bool) error {
	if err := ValidateBranchName(name); err != nil {
		return fmt.Errorf("invalid branch name: %w", err)
	}

	flag := "-d"
	if force {
		flag = "-D"
	}

	_, err := r.runGitCommand("branch", flag, name)
	if err != nil {
		return fmt.Errorf("failed to delete branch %s: %w", name, err)
	}
	return nil
}

// DeleteBranchInPath deletes a branch in a specific repository path
func DeleteBranchInPath(repoPath, branchName string, force bool) error {
	repo, err := Open(repoPath)
	if err != nil {
		return fmt.Errorf("failed to open repository: %w", err)
	}
	return repo.DeleteBranch(branchName, force)
}
