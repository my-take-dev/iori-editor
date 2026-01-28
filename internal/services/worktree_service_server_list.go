package services

import (
	"fmt"
	"log/slog"
	"path/filepath"
	"strings"

	"iori-editor/internal/git"
)

// ListWorktreesForServer lists worktrees filtered to server directory with full metadata.
// getAIStatus is a callback function to get AI status for each worktree path.
func (s *WorktreeService) ListWorktreesForServer(config ServerWorktreeConfig, getAIStatus func(string) string) (ListWorktreesResult, error) {
	result := ListWorktreesResult{
		Worktrees: make([]WorktreeDetail, 0),
	}

	repo, err := git.Open(config.RepoPath)
	if err != nil {
		return result, fmt.Errorf("failed to open repository: %w", err)
	}

	// Trigger asynchronous prune if enough time has passed
	// This is non-blocking to improve response time
	s.TriggerPruneIfNeeded(config.RepoPath)

	worktrees, err := repo.ListWorktreesWithInfo()
	if err != nil {
		return result, fmt.Errorf("failed to get worktrees: %w", err)
	}

	// Get server worktrees directory
	serverDir, err := s.ResolveServerWorktreesDir(config)
	if err != nil {
		return result, err
	}

	// Filter and enrich worktrees
	for _, wt := range worktrees {
		// Skip worktrees outside server directory
		absWtPath, err := filepath.Abs(wt.Path)
		if err != nil {
			slog.Warn("Failed to resolve worktree path, skipping", "path", wt.Path, "error", err)
			continue
		}
		if !strings.HasPrefix(absWtPath, serverDir+string(filepath.Separator)) {
			slog.Debug("Worktree outside server directory, skipping", "path", wt.Path, "serverDir", serverDir)
			continue
		}

		detail := s.enrichWorktreeDetail(wt, getAIStatus)
		result.Worktrees = append(result.Worktrees, detail)
	}

	return result, nil
}

// enrichWorktreeDetail adds metadata (dirty state, ahead/behind, commit info) to a worktree.
func (s *WorktreeService) enrichWorktreeDetail(wt git.WorktreeInfo, getAIStatus func(string) string) WorktreeDetail {
	detail := WorktreeDetail{
		Branch:     wt.Branch,
		Path:       wt.Path,
		IsMain:     wt.IsMain,
		IsDetached: wt.IsDetached,
		Warnings:   []string{},
	}

	// Get AI status if callback provided
	if getAIStatus != nil {
		detail.AIStatus = getAIStatus(wt.Path)
	}

	// Get dirty state
	if dirty, err := git.HasUncommittedChangesInPath(wt.Path); err == nil {
		detail.Dirty = dirty
	} else {
		slog.Warn("Failed to check dirty state", "path", wt.Path, "error", err)
		detail.DirtyStateUnavailable = true
		detail.Warnings = append(detail.Warnings, "dirty state unavailable: "+err.Error())
	}

	// Get ahead/behind
	if ahead, behind, err := git.GetAheadBehindInPath(wt.Path); err == nil {
		detail.Ahead = ahead
		detail.Behind = behind
	} else {
		slog.Warn("Failed to get ahead/behind", "path", wt.Path, "error", err)
		detail.AheadBehindUnavailable = true
		detail.Warnings = append(detail.Warnings, "ahead/behind unavailable: "+err.Error())
	}

	// Get commit info
	if commitInfo, err := git.GetLatestCommitInfoInPath(wt.Path); err == nil {
		detail.CommitHash = commitInfo.ShortHash
		detail.CommitTime = commitInfo.Time
	} else {
		slog.Warn("Failed to get commit info", "path", wt.Path, "error", err)
		detail.CommitInfoUnavailable = true
		detail.Warnings = append(detail.Warnings, "commit info unavailable: "+err.Error())
	}

	// Clear empty warnings to avoid unnecessary JSON output
	if len(detail.Warnings) == 0 {
		detail.Warnings = nil
	}

	return detail
}
