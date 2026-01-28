package session

import (
	"fmt"

	"iori-editor/internal/git"
)

// GetGitChanges returns the list of changed files
func (s *Session) GetGitChanges() ([]git.FileChange, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.gitRepo == nil {
		return nil, fmt.Errorf("not a git repository")
	}

	return s.gitRepo.GetChanges()
}

// GetFileDiff returns the diff for a specific file
func (s *Session) GetFileDiff(path string) (original, modified string, err error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.gitRepo == nil {
		return "", "", fmt.Errorf("not a git repository")
	}

	return s.gitRepo.GetFileDiff(path)
}

// StageFile stages a file (Accept)
func (s *Session) StageFile(path string) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.gitRepo == nil {
		return fmt.Errorf("not a git repository")
	}

	return s.gitRepo.StageFile(path)
}

// UnstageFile unstages a file (removes from staging but keeps changes)
func (s *Session) UnstageFile(path string) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.gitRepo == nil {
		return fmt.Errorf("not a git repository")
	}

	return s.gitRepo.UnstageFile(path)
}

// RestoreFile restores a file (Reject)
func (s *Session) RestoreFile(path string) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.gitRepo == nil {
		return fmt.Errorf("not a git repository")
	}

	return s.gitRepo.RestoreFile(path)
}

// StageFiles stages multiple files at once (batch Accept)
func (s *Session) StageFiles(paths []string) (git.BatchResult, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.gitRepo == nil {
		return git.BatchResult{}, fmt.Errorf("not a git repository")
	}

	return s.gitRepo.StageFiles(paths)
}

// UnstageFiles unstages multiple files at once (batch unstage)
func (s *Session) UnstageFiles(paths []string) (git.BatchResult, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.gitRepo == nil {
		return git.BatchResult{}, fmt.Errorf("not a git repository")
	}

	return s.gitRepo.UnstageFiles(paths)
}

// RestoreFiles restores multiple files at once (batch Reject)
func (s *Session) RestoreFiles(paths []string) (git.BatchResult, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.gitRepo == nil {
		return git.BatchResult{}, fmt.Errorf("not a git repository")
	}

	return s.gitRepo.RestoreFiles(paths)
}

// Commit creates a commit with the staged changes
func (s *Session) Commit(message string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.gitRepo == nil {
		return "", fmt.Errorf("not a git repository")
	}

	return s.gitRepo.Commit(message)
}

// Push pushes commits to remote
func (s *Session) Push() error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.gitRepo == nil {
		return fmt.Errorf("not a git repository")
	}

	return s.gitRepo.Push()
}

// PushWithUpstream pushes and sets upstream for current branch
func (s *Session) PushWithUpstream() error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.gitRepo == nil {
		return fmt.Errorf("not a git repository")
	}

	return s.gitRepo.PushWithUpstream()
}

// Pull pulls changes from remote
func (s *Session) Pull() error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.gitRepo == nil {
		return fmt.Errorf("not a git repository")
	}

	return s.gitRepo.Pull()
}

// Fetch fetches changes from remote
func (s *Session) Fetch() error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.gitRepo == nil {
		return fmt.Errorf("not a git repository")
	}

	return s.gitRepo.Fetch()
}

// HasRemote checks if the repository has a remote configured
func (s *Session) HasRemote() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.gitRepo == nil {
		return false
	}

	return s.gitRepo.HasRemote()
}

// GetAheadBehind returns how many commits ahead/behind the current branch is
func (s *Session) GetAheadBehind() (ahead int, behind int, err error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.gitRepo == nil {
		return 0, 0, fmt.Errorf("not a git repository")
	}

	return s.gitRepo.GetAheadBehind()
}

// CreateBranch creates a new branch and switches to it
func (s *Session) CreateBranch(name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.gitRepo == nil {
		return fmt.Errorf("not a git repository")
	}

	if err := s.gitRepo.CreateBranch(name); err != nil {
		return err
	}

	// Update the branch name in session
	s.Branch = name
	return nil
}

// DisableGit disables git integration for this session
func (s *Session) DisableGit() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.gitRepo = nil
	s.IsGitRepo = false
	s.Branch = ""
}

// GetGitRepo returns the git repository for this session
func (s *Session) GetGitRepo() *git.Repository {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.gitRepo
}
