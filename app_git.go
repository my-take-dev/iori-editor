package main

import (
	"iori-editor/internal/git"
	"iori-editor/internal/services"
)

// GitSyncInfo is re-exported for Wails binding
type GitSyncInfo = services.GitSyncInfo

// GetChanges returns the list of changed files for a session
func (a *App) GetChanges(sessionID string) ([]git.FileChange, error) {
	return a.gitService.GetChanges(sessionID)
}

// GetFileDiff returns the diff content for a specific file
func (a *App) GetFileDiff(sessionID string, path string) (map[string]string, error) {
	return a.gitService.GetFileDiff(sessionID, path)
}

// AcceptChange stages a file (git add)
func (a *App) AcceptChange(sessionID string, path string) error {
	return a.gitService.AcceptChange(sessionID, path)
}

// UnstageChange unstages a file (git reset HEAD -- file)
func (a *App) UnstageChange(sessionID string, path string) error {
	return a.gitService.UnstageChange(sessionID, path)
}

// RejectChange restores a file to HEAD state (git restore)
func (a *App) RejectChange(sessionID string, path string) error {
	return a.gitService.RejectChange(sessionID, path)
}

// CommitChanges creates a commit with the staged changes
func (a *App) CommitChanges(sessionID string, message string) (string, error) {
	return a.gitService.CommitChanges(sessionID, message)
}

// PushChanges pushes commits to remote
func (a *App) PushChanges(sessionID string) error {
	return a.gitService.PushChanges(sessionID)
}

// PullChanges pulls changes from remote
func (a *App) PullChanges(sessionID string) error {
	return a.gitService.PullChanges(sessionID)
}

// FetchChanges fetches changes from remote
func (a *App) FetchChanges(sessionID string) error {
	return a.gitService.FetchChanges(sessionID)
}

// GetGitSyncInfo returns git sync status (ahead/behind commits)
func (a *App) GetGitSyncInfo(sessionID string) (GitSyncInfo, error) {
	return a.gitService.GetGitSyncInfo(sessionID)
}

// CloneRepository clones a git repository to the specified destination
func (a *App) CloneRepository(url string, destPath string) (string, error) {
	return a.gitService.CloneRepository(url, destPath)
}
