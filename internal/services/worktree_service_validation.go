package services

import (
	"fmt"
	"path/filepath"
	"strings"

	"iori-editor/internal/git"
)

// ResolveServerWorktreesDir returns the absolute path to the server worktrees directory.
// The path format is: parentDir/repoName.worktrees/{subdir}
func (s *WorktreeService) ResolveServerWorktreesDir(config ServerWorktreeConfig) (string, error) {
	repoName := filepath.Base(config.RepoPath)
	parentDir := filepath.Dir(config.RepoPath)
	worktreesDir := filepath.Join(parentDir, repoName+".worktrees", config.WorktreesSubdir)

	absDir, err := filepath.Abs(worktreesDir)
	if err != nil {
		return "", fmt.Errorf("failed to resolve worktrees directory: %w", err)
	}
	return absDir, nil
}

// ValidatePathWithinServerDir checks if a target path is within the server worktrees directory.
// This prevents path traversal attacks.
// Returns the absolute target path if valid, or an error if path traversal is detected.
func (s *WorktreeService) ValidatePathWithinServerDir(targetPath, serverDir string) (string, error) {
	absTargetPath, err := filepath.Abs(targetPath)
	if err != nil {
		return "", fmt.Errorf("failed to resolve target path: %w", err)
	}

	absServerDir, err := filepath.Abs(serverDir)
	if err != nil {
		return "", fmt.Errorf("failed to resolve server directory: %w", err)
	}

	// Ensure the target path is within the server directory
	if !strings.HasPrefix(absTargetPath, absServerDir+string(filepath.Separator)) {
		return "", fmt.Errorf("%w: target path is outside server directory", ErrPathTraversal)
	}

	return absTargetPath, nil
}

// FindWorktreeByBranch finds a worktree by branch name from a list of worktrees.
// Returns nil if no matching worktree is found.
func (s *WorktreeService) FindWorktreeByBranch(worktrees []git.WorktreeInfo, branch string) *git.WorktreeInfo {
	for i := range worktrees {
		if worktrees[i].Branch == branch {
			return &worktrees[i]
		}
	}
	return nil
}

// GetWorktreeByBranch retrieves a worktree by branch name and validates it's within the server directory.
// Returns the worktree info if found and valid.
func (s *WorktreeService) GetWorktreeByBranch(config ServerWorktreeConfig, branch string) (*git.WorktreeInfo, error) {
	repo, err := git.Open(config.RepoPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open repository: %w", err)
	}

	worktrees, err := repo.ListWorktreesWithInfo()
	if err != nil {
		return nil, fmt.Errorf("failed to list worktrees: %w", err)
	}

	wt := s.FindWorktreeByBranch(worktrees, branch)
	if wt == nil {
		return nil, fmt.Errorf("%w: %s", ErrWorktreeNotFound, branch)
	}

	// Validate path is within server directory
	serverDir, err := s.ResolveServerWorktreesDir(config)
	if err != nil {
		return nil, err
	}

	_, err = s.ValidatePathWithinServerDir(wt.Path, serverDir)
	if err != nil {
		return nil, fmt.Errorf("worktree path validation failed: %w", err)
	}

	return wt, nil
}
