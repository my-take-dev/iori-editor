package main

import (
	"iori-editor/internal/services"
	"iori-editor/internal/session"
)

// WorktreeInfo is re-exported for Wails binding
type WorktreeInfo = services.WorktreeInfo

// CreateWorktreeSession creates a new worktree session from a parent session
func (a *App) CreateWorktreeSession(parentSessionID string, baseBranch string, customName string) (session.SessionInfo, error) {
	return a.worktreeService.CreateWorktreeSession(parentSessionID, baseBranch, customName)
}

// GetExistingWorktrees returns existing worktrees for a session
func (a *App) GetExistingWorktrees(sessionID string) ([]WorktreeInfo, error) {
	return a.worktreeService.GetExistingWorktrees(sessionID)
}

// AttachExistingWorktree attaches an existing worktree as a new session
func (a *App) AttachExistingWorktree(parentSessionID string, worktreePath string) (session.SessionInfo, error) {
	return a.worktreeService.AttachExistingWorktree(parentSessionID, worktreePath)
}

// DeleteWorktreeSession deletes a worktree session and removes the worktree folder
func (a *App) DeleteWorktreeSession(sessionID string, force bool) error {
	return a.worktreeService.DeleteWorktreeSession(sessionID, force)
}

// CloseWorktreeSession closes a worktree session without removing the worktree folder
func (a *App) CloseWorktreeSession(sessionID string) error {
	return a.worktreeService.CloseWorktreeSession(sessionID)
}

// CheckWorktreeHasChanges checks if a worktree session has uncommitted changes
func (a *App) CheckWorktreeHasChanges(sessionID string) (bool, error) {
	return a.worktreeService.CheckWorktreeHasChanges(sessionID)
}

// GetWorktreeSessions returns the worktree sessions for a parent session
func (a *App) GetWorktreeSessions(parentSessionID string) ([]session.SessionInfo, error) {
	return a.worktreeService.GetWorktreeSessions(parentSessionID)
}
