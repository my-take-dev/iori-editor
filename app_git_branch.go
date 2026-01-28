package main

import (
	"iori-editor/internal/services"
)

// BranchInfo is re-exported for Wails binding
type BranchInfo = services.BranchInfo

// PullResult is re-exported for Wails binding
type PullResult = services.PullResult

// GetBranchesForPath returns the list of branches for a directory path
func (a *App) GetBranchesForPath(path string) ([]BranchInfo, error) {
	return a.gitService.GetBranchesForPath(path)
}

// GetBranchesForWorktreeCreate returns branches excluding those already checked out in worktrees
func (a *App) GetBranchesForWorktreeCreate(path string) ([]BranchInfo, error) {
	return a.gitService.GetBranchesForWorktreeCreate(path)
}

// CheckoutBranchForPath checks out a branch in a directory (before session creation)
func (a *App) CheckoutBranchForPath(path string, branchName string) error {
	return a.gitService.CheckoutBranchForPath(path, branchName)
}

// CreateBranchForPath creates a new branch from a base branch in a directory (before session creation)
func (a *App) CreateBranchForPath(path string, newBranchName string, baseBranchName string) error {
	return a.gitService.CreateBranchForPath(path, newBranchName, baseBranchName)
}

// UpdateBranchForPath updates (pulls) a branch before creating a new branch from it
func (a *App) UpdateBranchForPath(path string, branchName string, isRemote bool) PullResult {
	return a.gitService.UpdateBranchForPath(path, branchName, isRemote)
}
