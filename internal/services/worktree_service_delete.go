package services

import (
	"fmt"
	"os"

	"iori-editor/internal/git"
	"iori-editor/internal/logger"
)

// DeleteWorktreeSession deletes a worktree session and removes the worktree folder
func (s *WorktreeService) DeleteWorktreeSession(sessionID string, force bool) error {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return err
	}

	if !sess.IsWorktree {
		return fmt.Errorf("session is not a worktree session")
	}

	if s.historyManager != nil {
		s.historyManager.EndSession(sessionID)
	}

	if !force {
		hasChanges, err := git.HasUncommittedChangesInPath(sess.WorkDir)
		if err != nil {
			return fmt.Errorf("failed to check changes: %w", err)
		}
		if hasChanges {
			return fmt.Errorf("uncommitted changes exist")
		}
	}

	sess.Close()

	if sess.ParentSessionID != "" {
		parentSess, err := s.sessionManager.GetSession(sess.ParentSessionID)
		if err != nil {
			logger.Error("Parent session not found for worktree cleanup", err)
			s.emitLog("warning", "親セッションが見つかりません", "手動でのクリーンアップが必要な場合があります: "+sess.WorkDir)
		} else {
			parentSess.RemoveWorktreeSession(sessionID)

			parentRepo := parentSess.GetGitRepo()
			if parentRepo != nil {
				if err := s.removeWorktreeWithFallback(parentRepo, sess.WorkDir, force); err != nil {
					return err
				}
			}
		}
	}

	err = s.sessionManager.DeleteSession(sessionID)
	if err != nil {
		return err
	}

	s.emitLog("success", "Worktree削除完了", sess.Name)
	return nil
}

// CloseWorktreeSession closes a worktree session without removing the worktree folder
func (s *WorktreeService) CloseWorktreeSession(sessionID string) error {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return err
	}

	if !sess.IsWorktree {
		return fmt.Errorf("session is not a worktree session")
	}

	if sess.ParentSessionID != "" {
		if parentSess, err := s.sessionManager.GetSession(sess.ParentSessionID); err == nil {
			parentSess.RemoveWorktreeSession(sessionID)

			if parentRepo := parentSess.GetGitRepo(); parentRepo != nil {
				if pruneErr := parentRepo.PruneWorktrees(); pruneErr != nil {
					logger.Error("Failed to prune worktrees", pruneErr)
				}
			}
		}
	}

	err = s.sessionManager.DeleteSession(sessionID)

	if s.historyManager != nil {
		s.historyManager.EndSession(sessionID)
	}

	return err
}

// removeWorktreeWithFallback attempts to remove worktree via git, falls back to direct removal
func (s *WorktreeService) removeWorktreeWithFallback(repo *git.Repository, worktreePath string, force bool) error {
	s.emitLog("info", "Worktree削除中...", worktreePath)

	var removeErr error
	if force {
		removeErr = repo.RemoveWorktreeForced(worktreePath)
	} else {
		removeErr = repo.RemoveWorktree(worktreePath)
	}

	if removeErr != nil {
		logger.Error("Failed to remove git worktree", removeErr)
		s.emitLog("warning", "Git worktree削除失敗、直接削除を試行します", removeErr.Error())

		if rmErr := os.RemoveAll(worktreePath); rmErr != nil {
			logger.Error("Failed to remove worktree directory", rmErr)
			return fmt.Errorf("worktree cleanup failed: git=%w, rm=%v", removeErr, rmErr)
		}

		if pruneErr := repo.PruneWorktrees(); pruneErr != nil {
			logger.Error("Failed to prune worktrees", pruneErr)
		}
	}

	return nil
}
