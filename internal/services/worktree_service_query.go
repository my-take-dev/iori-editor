package services

import (
	"fmt"

	"iori-editor/internal/git"
	"iori-editor/internal/logger"
	"iori-editor/internal/session"
)

// GetExistingWorktrees returns existing worktrees for a session
func (s *WorktreeService) GetExistingWorktrees(sessionID string) ([]WorktreeInfo, error) {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return nil, err
	}

	repo := sess.GetGitRepo()
	if repo == nil {
		return nil, fmt.Errorf("not a git repository")
	}

	// Clean up zombie worktrees before listing
	if err := repo.PruneWorktrees(); err != nil {
		logger.Warn("Failed to prune worktrees", err)
	}

	worktrees, err := repo.ListWorktreesWithInfo()
	if err != nil {
		return nil, err
	}

	result := make([]WorktreeInfo, len(worktrees))
	for i, wt := range worktrees {
		// Check if this worktree is already opened as a session
		isOpened := s.sessionManager.FindSessionByWorkDir(wt.Path) != nil
		result[i] = WorktreeInfo{
			Path:       wt.Path,
			Branch:     wt.Branch,
			IsMain:     wt.IsMain,
			IsDetached: wt.IsDetached,
			IsOpened:   isOpened,
		}
	}

	return result, nil
}

// CheckWorktreeHasChanges checks if a worktree session has uncommitted changes
func (s *WorktreeService) CheckWorktreeHasChanges(sessionID string) (bool, error) {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return false, err
	}

	return git.HasUncommittedChangesInPath(sess.WorkDir)
}

// GetWorktreeSessions returns the worktree sessions for a parent session
func (s *WorktreeService) GetWorktreeSessions(parentSessionID string) ([]session.SessionInfo, error) {
	sess, err := s.sessionManager.GetSession(parentSessionID)
	if err != nil {
		return nil, err
	}

	worktreeIDs := sess.GetWorktreeSessions()
	result := make([]session.SessionInfo, 0, len(worktreeIDs))

	for _, wtID := range worktreeIDs {
		wtSess, err := s.sessionManager.GetSession(wtID)
		if err != nil {
			continue
		}
		result = append(result, wtSess.Info())
	}

	return result, nil
}
