package services

import (
	"fmt"
	"strings"

	"iori-editor/internal/git"
)

// GetBranchesForPath returns the list of branches for a directory path
func (s *GitService) GetBranchesForPath(path string) ([]BranchInfo, error) {
	if !git.IsGitRepository(path) {
		return nil, fmt.Errorf("not a git repository")
	}

	repo, err := git.Open(path)
	if err != nil {
		return nil, fmt.Errorf("failed to open repository: %w", err)
	}

	branches, err := repo.GetBranches()
	if err != nil {
		return nil, fmt.Errorf("failed to get branches: %w", err)
	}

	return toBranchInfoList(branches), nil
}

// GetBranchesForWorktreeCreate returns branches excluding those already checked out in worktrees
func (s *GitService) GetBranchesForWorktreeCreate(path string) ([]BranchInfo, error) {
	if !git.IsGitRepository(path) {
		return nil, fmt.Errorf("not a git repository")
	}

	repo, err := git.Open(path)
	if err != nil {
		return nil, fmt.Errorf("failed to open repository: %w", err)
	}

	branches, err := repo.GetBranchesExcludingWorktrees()
	if err != nil {
		return nil, fmt.Errorf("failed to get branches: %w", err)
	}

	return toBranchInfoList(branches), nil
}

// toBranchInfoList converts git.BranchInfo slice to services.BranchInfo slice
func toBranchInfoList(branches []git.BranchInfo) []BranchInfo {
	result := make([]BranchInfo, len(branches))
	for i, b := range branches {
		result[i] = BranchInfo{
			Name:      b.Name,
			IsCurrent: b.IsCurrent,
			IsRemote:  b.IsRemote,
		}
	}
	return result
}

// CheckoutBranchForPath checks out a branch in a directory (before session creation)
func (s *GitService) CheckoutBranchForPath(path string, branchName string) error {
	if !git.IsGitRepository(path) {
		return fmt.Errorf("not a git repository")
	}

	repo, err := git.Open(path)
	if err != nil {
		s.emitLog("error", "ブランチ切り替え失敗", err.Error())
		return fmt.Errorf("failed to open repository: %w", err)
	}

	s.emitLog("info", "ブランチ切り替え中...", branchName)
	if err := repo.CheckoutBranch(branchName); err != nil {
		s.emitLog("error", "ブランチ切り替え失敗", branchName+": "+err.Error())
		return err
	}
	s.emitLog("success", "ブランチ切り替え完了", branchName)
	return nil
}

// CreateBranchForPath creates a new branch from a base branch in a directory
func (s *GitService) CreateBranchForPath(path string, newBranchName string, baseBranchName string) error {
	if !git.IsGitRepository(path) {
		return fmt.Errorf("not a git repository")
	}

	repo, err := git.Open(path)
	if err != nil {
		s.emitLog("error", "ブランチ作成失敗", err.Error())
		return fmt.Errorf("failed to open repository: %w", err)
	}

	s.emitLog("info", "ブランチ作成中...", newBranchName+" (from "+baseBranchName+")")
	if err := repo.CreateBranchFrom(newBranchName, baseBranchName); err != nil {
		s.emitLog("error", "ブランチ作成失敗", newBranchName+": "+err.Error())
		return err
	}
	s.emitLog("success", "ブランチ作成完了", newBranchName)
	return nil
}

// UpdateBranchForPath updates (pulls) a branch before creating a new branch from it
func (s *GitService) UpdateBranchForPath(path string, branchName string, isRemote bool) PullResult {
	if !git.IsGitRepository(path) {
		return PullResult{Success: false, ErrorMsg: "Gitリポジトリではありません"}
	}

	repo, err := git.Open(path)
	if err != nil {
		return PullResult{Success: false, ErrorMsg: "リポジトリを開けませんでした: " + err.Error()}
	}

	if isRemote {
		s.emitLog("info", "フェッチ中...", branchName)
	} else {
		s.emitLog("info", "プル中...", branchName)
	}

	if err := repo.PullBranch(branchName, isRemote); err != nil {
		return s.handlePullError(err, branchName)
	}

	if isRemote {
		s.emitLog("success", "フェッチ完了", branchName)
	} else {
		s.emitLog("success", "プル完了", branchName)
	}
	return PullResult{Success: true}
}

// handlePullError handles errors from pull operations and returns appropriate PullResult
func (s *GitService) handlePullError(err error, branchName string) PullResult {
	errMsg := err.Error()

	switch {
	case strings.Contains(errMsg, "CONFLICT") || strings.Contains(errMsg, "Automatic merge failed"):
		s.emitLog("error", "マージコンフリクト", branchName)
		return PullResult{Success: false, ErrorMsg: "マージコンフリクトが発生しました。手動で解決するか、最新化せずに作成してください。"}

	case strings.Contains(errMsg, "Could not resolve host") || strings.Contains(errMsg, "unable to access"):
		s.emitLog("error", "ネットワークエラー", branchName)
		return PullResult{Success: false, ErrorMsg: "リモートに接続できませんでした。ネットワーク接続を確認してください。"}

	case strings.Contains(errMsg, "Authentication failed") || strings.Contains(errMsg, "Permission denied"):
		s.emitLog("error", "認証エラー", branchName)
		return PullResult{Success: false, ErrorMsg: "認証に失敗しました。Git認証情報を確認してください。"}

	default:
		s.emitLog("error", "更新失敗", branchName+": "+errMsg)
		return PullResult{Success: false, ErrorMsg: errMsg}
	}
}
