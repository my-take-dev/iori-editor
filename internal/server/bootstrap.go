package server

import (
	"fmt"
	"log/slog"
	"strings"

	"iori-editor/internal/git"
)

// PullBaseBranch pulls the base branch to get latest changes before server start.
// Returns a warning message if pull fails, empty string on success.
// Server startup continues regardless of pull result.
func PullBaseBranch(config *Config) string {
	if config.BaseBranch == "" {
		slog.Debug("Skipping base branch pull: no base branch configured")
		return ""
	}

	if config.RepoPath == "" {
		slog.Debug("Skipping base branch pull: no repository path configured")
		return ""
	}

	repo, err := git.Open(config.RepoPath)
	if err != nil {
		slog.Warn("Failed to open repository for base branch pull",
			"repoPath", config.RepoPath,
			"error", err)
		return fmt.Sprintf("リポジトリを開けませんでした: %v", err)
	}

	// Check if remote exists
	if !repo.HasRemote() {
		slog.Info("Skipping base branch pull: no remote configured",
			"repoPath", config.RepoPath,
			"baseBranch", config.BaseBranch)
		return ""
	}

	slog.Info("Pulling base branch before server start",
		"repoPath", config.RepoPath,
		"baseBranch", config.BaseBranch)

	// Determine if the branch is remote (has "origin/" prefix)
	isRemote := strings.HasPrefix(config.BaseBranch, "origin/")

	if err := repo.PullBranch(config.BaseBranch, isRemote); err != nil {
		warning := FormatPullWarning(err, config.BaseBranch)
		slog.Warn("Failed to pull base branch (server will continue)",
			"repoPath", config.RepoPath,
			"baseBranch", config.BaseBranch,
			"isRemote", isRemote,
			"error", err)
		return warning
	}

	slog.Info("Base branch pull completed",
		"repoPath", config.RepoPath,
		"baseBranch", config.BaseBranch)
	return ""
}

// FormatPullWarning formats a user-friendly warning message for pull errors
func FormatPullWarning(err error, branchName string) string {
	errMsg := err.Error()

	switch {
	case strings.Contains(errMsg, "CONFLICT") || strings.Contains(errMsg, "Automatic merge failed"):
		return fmt.Sprintf("ベースブランチ '%s' でマージコンフリクトが発生しました", branchName)

	case strings.Contains(errMsg, "Could not resolve host") || strings.Contains(errMsg, "unable to access"):
		return fmt.Sprintf("ベースブランチ '%s' の最新化に失敗しました: ネットワークに接続できません", branchName)

	case strings.Contains(errMsg, "Authentication failed") || strings.Contains(errMsg, "Permission denied"):
		return fmt.Sprintf("ベースブランチ '%s' の最新化に失敗しました: 認証エラー", branchName)

	default:
		return fmt.Sprintf("ベースブランチ '%s' の最新化に失敗しました: %v", branchName, err)
	}
}
