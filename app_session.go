package main

import (
	"iori-editor/internal/session"
)

// CreateSession creates a new session with dual terminals
func (a *App) CreateSession(name string, workDir string) (session.SessionInfo, error) {
	return a.sessionService.CreateSession(name, workDir)
}

// CreateSessionWithGitOption creates a new session with specified git option
func (a *App) CreateSessionWithGitOption(name string, workDir string, gitOption string, branchName string) (session.SessionInfo, error) {
	return a.sessionService.CreateSessionWithGitOption(name, workDir, gitOption, branchName)
}

// GetSessions returns all sessions
func (a *App) GetSessions() []session.SessionInfo {
	return a.sessionService.GetSessions()
}

// SetActiveSession sets the active session
func (a *App) SetActiveSession(sessionID string) error {
	return a.sessionService.SetActiveSession(sessionID)
}

// DeleteSession deletes a session
func (a *App) DeleteSession(sessionID string) error {
	return a.sessionService.DeleteSession(sessionID)
}
