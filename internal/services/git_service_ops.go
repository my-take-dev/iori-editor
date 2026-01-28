package services

import (
	"iori-editor/internal/git"
	"iori-editor/internal/session"
)

// GetChanges returns the list of changed files for a session
func (s *GitService) GetChanges(sessionID string) ([]git.FileChange, error) {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return nil, err
	}
	return sess.GetGitChanges()
}

// GetFileDiff returns the diff content for a specific file
func (s *GitService) GetFileDiff(sessionID string, path string) (map[string]string, error) {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return nil, err
	}

	original, modified, err := sess.GetFileDiff(path)
	if err != nil {
		return nil, err
	}

	return map[string]string{
		"original": original,
		"modified": modified,
	}, nil
}

// AcceptChange stages a file (git add)
func (s *GitService) AcceptChange(sessionID string, path string) error {
	return s.withSession(sessionID, func(sess *session.Session) error {
		if err := sess.StageFile(path); err != nil {
			s.emitLog("error", "ステージング失敗", path+": "+err.Error())
			return err
		}
		s.emitLog("info", "ステージング", path)
		return nil
	})
}

// UnstageChange unstages a file (git reset HEAD -- file)
func (s *GitService) UnstageChange(sessionID string, path string) error {
	return s.withSession(sessionID, func(sess *session.Session) error {
		if err := sess.UnstageFile(path); err != nil {
			s.emitLog("error", "ステージ解除失敗", path+": "+err.Error())
			return err
		}
		s.emitLog("info", "ステージ解除", path)
		return nil
	})
}

// RejectChange restores a file to HEAD state (git restore)
func (s *GitService) RejectChange(sessionID string, path string) error {
	return s.withSession(sessionID, func(sess *session.Session) error {
		if err := sess.RestoreFile(path); err != nil {
			s.emitLog("error", "変更の破棄失敗", path+": "+err.Error())
			return err
		}
		s.emitLog("warning", "変更を破棄", path)
		return nil
	})
}

// CommitChanges creates a commit with the staged changes
func (s *GitService) CommitChanges(sessionID string, message string) (string, error) {
	var commitHash string
	err := s.withSession(sessionID, func(sess *session.Session) error {
		s.emitLog("info", "コミット中...", message)
		hash, err := sess.Commit(message)
		if err != nil {
			s.emitLog("error", "コミット失敗", err.Error())
			return err
		}
		commitHash = hash
		s.emitLog("success", "コミット完了", commitHash)
		return nil
	})
	if err != nil {
		return "", err
	}
	return commitHash, nil
}

// PushChanges pushes commits to remote
func (s *GitService) PushChanges(sessionID string) error {
	return s.withSession(sessionID, func(sess *session.Session) error {
		s.emitLog("info", "プッシュ中...", "")
		err := sess.Push()
		if err != nil && sess.HasRemote() {
			err = sess.PushWithUpstream()
		}
		if err != nil {
			s.emitLog("error", "プッシュ失敗", err.Error())
			return err
		}
		s.emitLog("success", "プッシュ完了", "")
		return nil
	})
}

// PullChanges pulls changes from remote
func (s *GitService) PullChanges(sessionID string) error {
	return s.withSessionLog(sessionID, "プル", func(sess *session.Session) error {
		return sess.Pull()
	})
}

// FetchChanges fetches changes from remote
func (s *GitService) FetchChanges(sessionID string) error {
	return s.withSessionLog(sessionID, "フェッチ", func(sess *session.Session) error {
		return sess.Fetch()
	})
}

// GetGitSyncInfo returns git sync status (ahead/behind commits)
func (s *GitService) GetGitSyncInfo(sessionID string) (GitSyncInfo, error) {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return GitSyncInfo{}, err
	}

	hasRemote := sess.HasRemote()
	ahead, behind, _ := sess.GetAheadBehind()

	return GitSyncInfo{
		HasRemote: hasRemote,
		Ahead:     ahead,
		Behind:    behind,
	}, nil
}

// CloneRepository clones a git repository to the specified destination
func (s *GitService) CloneRepository(url string, destPath string) (string, error) {
	s.emitLog("info", "クローン中...", url)

	clonedPath, err := git.Clone(url, destPath)
	if err != nil {
		s.emitLog("error", "クローン失敗", err.Error())
		return "", err
	}

	s.emitLog("success", "クローン完了", clonedPath)
	return clonedPath, nil
}
