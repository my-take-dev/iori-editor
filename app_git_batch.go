package main

import (
	"iori-editor/internal/services"
)

// BatchOperationResult is re-exported for Wails binding
type BatchOperationResult = services.BatchOperationResult

// BatchFailedItem is re-exported for Wails binding
type BatchFailedItem = services.BatchFailedItem

// AcceptChanges stages multiple files at once (batch git add)
func (a *App) AcceptChanges(sessionID string, paths []string) (BatchOperationResult, error) {
	return a.gitService.AcceptChanges(sessionID, paths)
}

// UnstageChanges unstages multiple files at once (batch git restore --staged)
func (a *App) UnstageChanges(sessionID string, paths []string) (BatchOperationResult, error) {
	return a.gitService.UnstageChanges(sessionID, paths)
}

// RejectChanges restores multiple files to HEAD state at once (batch git restore)
func (a *App) RejectChanges(sessionID string, paths []string) (BatchOperationResult, error) {
	return a.gitService.RejectChanges(sessionID, paths)
}
