package handlers

import (
	"path/filepath"

	"iori-editor/internal/services"
	"iori-editor/internal/session"
)

const (
	// ServerWorktreeSubdir はサーバーモードでのworktree保存先サブディレクトリ
	ServerWorktreeSubdir = "server"
)

// APIHandler handles REST API requests
type APIHandler struct {
	worktreeService *services.WorktreeService
	gitService      *services.GitService
	fileService     *services.FileService
	sessionManager  *session.Manager
	repoPath        string
	baseBranch      string
}

// NewAPIHandler creates a new API handler
func NewAPIHandler(
	worktreeSvc *services.WorktreeService,
	gitSvc *services.GitService,
	fileSvc *services.FileService,
	sessionMgr *session.Manager,
	repoPath string,
	baseBranch string,
) *APIHandler {
	return &APIHandler{
		worktreeService: worktreeSvc,
		gitService:      gitSvc,
		fileService:     fileSvc,
		sessionManager:  sessionMgr,
		repoPath:        repoPath,
		baseBranch:      baseBranch,
	}
}

// getServerWorktreesDir returns the worktrees directory path for server mode
// Returns: parentDir/repoName.worktrees/server
func (h *APIHandler) getServerWorktreesDir() string {
	repoName := filepath.Base(h.repoPath)
	parentDir := filepath.Dir(h.repoPath)
	return filepath.Join(parentDir, repoName+".worktrees", ServerWorktreeSubdir)
}

// getAIStatus returns the AI status for a worktree path
func (h *APIHandler) getAIStatus(worktreePath string) string {
	if h.sessionManager == nil {
		return "none"
	}
	return h.sessionManager.GetAIStatusForWorkDir(worktreePath)
}

// getServerWorktreeConfig returns the configuration for server-mode worktree operations
func (h *APIHandler) getServerWorktreeConfig() services.ServerWorktreeConfig {
	return services.ServerWorktreeConfig{
		RepoPath:        h.repoPath,
		BaseBranch:      h.baseBranch,
		WorktreesSubdir: ServerWorktreeSubdir,
	}
}
