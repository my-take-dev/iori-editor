package services

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"iori-editor/internal/git"
	"iori-editor/internal/session"
	"iori-editor/internal/validation"
)

// CreateWorktreeForServer creates a worktree in server mode.
func (s *WorktreeService) CreateWorktreeForServer(config ServerWorktreeConfig, params CreateWorktreeParams) (CreateWorktreeResult, error) {
	result := CreateWorktreeResult{}

	// Determine branch name
	var branchName string
	if params.CreateNew {
		baseBranch := params.BaseBranch
		if baseBranch == "" {
			baseBranch = config.BaseBranch
			if baseBranch == "" {
				baseBranch = "main"
			}
		}
		branchName = validation.GenerateBranchName(baseBranch, params.CustomName)
	} else {
		if params.Branch == "" {
			return result, fmt.Errorf("%w: branch name is required for existing branch checkout", ErrBranchRequired)
		}
		branchName = params.Branch
	}

	// Validate branch name
	if !validation.IsValidBranchName(branchName) {
		return result, fmt.Errorf("%w: must contain only alphanumeric characters, dots, underscores, hyphens, and slashes", ErrInvalidBranchName)
	}

	// Get server worktrees directory
	serverDir, err := s.ResolveServerWorktreesDir(config)
	if err != nil {
		return result, err
	}

	// Calculate worktree path
	worktreePath := filepath.Join(serverDir, branchName)

	// Security check: prevent path traversal
	absWorktreePath, err := s.ValidatePathWithinServerDir(worktreePath, serverDir)
	if err != nil {
		return result, fmt.Errorf("invalid branch name: %w", err)
	}

	// Ensure worktrees directory exists
	if err := os.MkdirAll(serverDir, 0755); err != nil {
		return result, fmt.Errorf("failed to create worktrees directory: %w", err)
	}

	// Open repository
	repo, err := git.Open(config.RepoPath)
	if err != nil {
		return result, formatRepoError("open repository", err)
	}

	if params.CreateNew {
		// Create new branch from base branch
		baseBranch := params.BaseBranch
		if baseBranch == "" {
			baseBranch = config.BaseBranch
			if baseBranch == "" {
				baseBranch = "main"
			}
		}

		// Pull base branch to get latest changes
		isRemote := strings.HasPrefix(baseBranch, "origin/")
		if err := repo.PullBranch(baseBranch, isRemote); err != nil {
			slog.Warn("Failed to update base branch before worktree creation",
				"repoPath", config.RepoPath,
				"baseBranch", baseBranch,
				"branchName", branchName,
				"isRemote", isRemote,
				"error", err)
			result.PullWarning = fmt.Sprintf("ベースブランチの最新化に失敗しました: %v", err)
		}

		if err := repo.CreateWorktree(absWorktreePath, branchName, baseBranch); err != nil {
			return result, fmt.Errorf("failed to create worktree: %w", err)
		}
	} else {
		// Checkout existing branch
		if err := repo.CreateWorktreeFromBranch(absWorktreePath, branchName); err != nil {
			return result, fmt.Errorf("failed to checkout worktree: %w", err)
		}
	}

	result.Branch = branchName
	result.Path = absWorktreePath
	slog.Info("Worktree created", "branch", branchName, "path", absWorktreePath)

	return result, nil
}

// DeleteWorktreeForServer deletes a worktree in server mode.
func (s *WorktreeService) DeleteWorktreeForServer(config ServerWorktreeConfig, params DeleteWorktreeParams) (DeleteWorktreeResult, error) {
	result := DeleteWorktreeResult{
		Branch: params.Branch,
	}

	// Validate branch name
	if !validation.IsValidBranchName(params.Branch) {
		return result, fmt.Errorf("%w: must contain only alphanumeric characters, dots, underscores, hyphens, and slashes", ErrInvalidBranchName)
	}

	// Get worktree by branch
	wt, err := s.GetWorktreeByBranch(config, params.Branch)
	if err != nil {
		return result, err
	}

	// Check if main worktree
	if wt.IsMain {
		return result, ErrCannotDeleteMain
	}

	// Open repository
	repo, err := git.Open(config.RepoPath)
	if err != nil {
		return result, formatRepoError("open repository", err)
	}

	// Remove worktree
	if params.Force {
		if err := repo.RemoveWorktreeForced(wt.Path); err != nil {
			return result, fmt.Errorf("failed to force remove worktree: %w", err)
		}
	} else {
		if err := repo.RemoveWorktree(wt.Path); err != nil {
			// Check if it's because of uncommitted changes
			if strings.Contains(err.Error(), "uncommitted") || strings.Contains(err.Error(), "modified") {
				return result, fmt.Errorf("%w: use force=true to delete anyway", ErrUncommittedChanges)
			}
			return result, fmt.Errorf("failed to remove worktree: %w", err)
		}
	}

	result.WorktreeRemoved = true
	slog.Info("Worktree deleted", "branch", params.Branch, "path", wt.Path)

	// Optionally delete the branch
	if params.DeleteBranch {
		if err := git.DeleteBranchInPath(config.RepoPath, params.Branch, params.Force); err != nil {
			slog.Warn("Failed to delete branch", "branch", params.Branch, "error", err)
			result.BranchDeleteError = err.Error()
			result.PartialSuccess = true
		} else {
			result.BranchDeleted = true
			slog.Info("Branch deleted", "branch", params.Branch)
		}
	}

	return result, nil
}

// FetchWorktrees fetches from remote for the repository.
func (s *WorktreeService) FetchWorktrees(config ServerWorktreeConfig) error {
	repo, err := git.Open(config.RepoPath)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrRepositoryNotFound, err)
	}

	if err := repo.Fetch(); err != nil {
		return fmt.Errorf("%w: %v", ErrFetchFailed, err)
	}

	slog.Info("Fetch completed", "repoPath", config.RepoPath)
	return nil
}

// GetOrCreateWorktreeSession gets or creates a session for a worktree.
// It handles worktree validation, session lookup/creation, AI terminal startup,
// and history buffer initialization.
func (s *WorktreeService) GetOrCreateWorktreeSession(config ServerWorktreeConfig, branch string) (*WorktreeSessionResult, error) {
	// 1. Get worktree by branch (with validation)
	wt, err := s.GetWorktreeByBranch(config, branch)
	if err != nil {
		return nil, err
	}

	// 2. Resolve absolute path
	absPath, err := filepath.Abs(wt.Path)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve worktree path: %w", err)
	}

	// 3. Find or create session
	sess := s.sessionManager.FindSessionByWorkDir(absPath)
	if sess != nil {
		// Check if session is opened by desktop client
		if sess.ClientType == session.ClientTypeDesktop {
			return nil, &WorktreeAlreadyOpenedError{ClientType: "アプリケーション"}
		}
		// Browser sessions can be reused
		slog.Info("Reusing existing browser session for worktree", "sessionId", sess.ID, "branch", branch)
	} else {
		slog.Info("Creating new session for worktree", "branch", branch, "path", absPath)
		sess, err = s.sessionManager.CreateSessionWithClientType(branch, absPath, session.ClientTypeBrowser)
		if err != nil {
			return nil, fmt.Errorf("failed to create session: %w", err)
		}
	}

	// 4. Ensure AI terminal is started
	if sess.GetAITerminalStatus() == "none" {
		slog.Info("Starting AI terminal for worktree session", "sessionId", sess.ID, "branch", branch)
		if err := sess.StartTerminal(session.TerminalTypeAI); err != nil {
			return nil, fmt.Errorf("failed to start AI terminal: %w", err)
		}
	}

	// 5. Ensure history buffer is initialized
	sess.EnsureAIHistoryBuffer()

	return &WorktreeSessionResult{
		SessionID:      sess.ID,
		Branch:         branch,
		Path:           absPath,
		TerminalStatus: sess.GetAITerminalStatus(),
	}, nil
}

// formatRepoError formats repository-related errors consistently
func formatRepoError(action string, err error) error {
	return fmt.Errorf("failed to %s: %w", action, err)
}
