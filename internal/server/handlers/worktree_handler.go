package handlers

import (
	"log/slog"
	"net/http"
	"strings"

	"iori-editor/internal/services"
	"iori-editor/internal/validation"
)

// WorktreeResponse represents a worktree in the API response
type WorktreeResponse struct {
	Branch                 string   `json:"branch"`
	Path                   string   `json:"path"`
	IsMain                 bool     `json:"isMain"`
	IsDetached             bool     `json:"isDetached"`
	CommitHash             string   `json:"commitHash,omitempty"`
	CommitTime             string   `json:"commitTime,omitempty"`
	Ahead                  int      `json:"ahead"`
	Behind                 int      `json:"behind"`
	Dirty                  bool     `json:"dirty"`
	AIStatus               string   `json:"aiStatus"`
	AheadBehindUnavailable bool     `json:"aheadBehindUnavailable,omitempty"`
	DirtyStateUnavailable  bool     `json:"dirtyStateUnavailable,omitempty"`
	CommitInfoUnavailable  bool     `json:"commitInfoUnavailable,omitempty"`
	Warnings               []string `json:"warnings,omitempty"`
}

// CreateWorktreeRequest represents a worktree creation request
type CreateWorktreeRequest struct {
	BaseBranch string `json:"baseBranch"` // Base branch for new worktree (used with CreateNew=true)
	CustomName string `json:"customName"` // Custom name for the branch (used with CreateNew=true)
	Branch     string `json:"branch"`     // Existing branch name (used with CreateNew=false)
	CreateNew  bool   `json:"createNew"`
}

// Validate implements Validatable interface for CreateWorktreeRequest
func (r *CreateWorktreeRequest) Validate() error {
	if !r.CreateNew {
		if r.Branch == "" {
			return ErrBranchRequired
		}
		if err := validation.ValidateBranchNameWithError(r.Branch); err != nil {
			return ErrInvalidBranchName
		}
	}
	return nil
}

// WorktreeSessionResponse represents the response for worktree session API
type WorktreeSessionResponse struct {
	SessionID      string `json:"sessionId"`
	Branch         string `json:"branch"`
	Path           string `json:"path"`
	TerminalStatus string `json:"terminalStatus"`
}

// HandleListWorktrees handles GET /api/worktrees
func (h *APIHandler) HandleListWorktrees(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	config := h.getServerWorktreeConfig()
	result, err := h.worktreeService.ListWorktreesForServer(config, h.getAIStatus)
	if err != nil {
		slog.Error("Failed to list worktrees", "error", err)
		jsonError(w, "Failed to list worktrees", http.StatusInternalServerError)
		return
	}

	// Convert to response format
	response := make([]WorktreeResponse, 0, len(result.Worktrees))
	for _, wt := range result.Worktrees {
		response = append(response, WorktreeResponse{
			Branch:                 wt.Branch,
			Path:                   wt.Path,
			IsMain:                 wt.IsMain,
			IsDetached:             wt.IsDetached,
			CommitHash:             wt.CommitHash,
			CommitTime:             wt.CommitTime,
			Ahead:                  wt.Ahead,
			Behind:                 wt.Behind,
			Dirty:                  wt.Dirty,
			AIStatus:               wt.AIStatus,
			AheadBehindUnavailable: wt.AheadBehindUnavailable,
			DirtyStateUnavailable:  wt.DirtyStateUnavailable,
			CommitInfoUnavailable:  wt.CommitInfoUnavailable,
			Warnings:               wt.Warnings,
		})
	}

	responseMap := map[string]interface{}{
		"worktrees": response,
	}
	if result.PruneWarning != "" {
		responseMap["warning"] = result.PruneWarning
	}
	jsonResponse(w, responseMap)
}

// HandleCreateWorktree handles POST /api/worktrees
func (h *APIHandler) HandleCreateWorktree(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CreateWorktreeRequest
	if err := DecodeAndValidate(r, &req); err != nil {
		HandleAPIError(w, err)
		return
	}

	config := h.getServerWorktreeConfig()
	params := services.CreateWorktreeParams{
		BaseBranch: req.BaseBranch,
		CustomName: req.CustomName,
		Branch:     req.Branch,
		CreateNew:  req.CreateNew,
	}

	result, err := h.worktreeService.CreateWorktreeForServer(config, params)
	if err != nil {
		slog.Error("Failed to create worktree", "error", err)
		apiErr := WrapServiceError(err, "ワークツリーの作成に失敗しました")
		writeErrorResponse(w, apiErr)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"branch":  result.Branch,
		"path":    result.Path,
	}
	if result.PullWarning != "" {
		response["warning"] = result.PullWarning
	}
	jsonResponseWithStatus(w, http.StatusCreated, response)
}

// HandleDeleteWorktree handles DELETE /api/worktrees/{branch}
func (h *APIHandler) HandleDeleteWorktree(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract branch from URL path
	path := strings.TrimPrefix(r.URL.Path, "/api/worktrees/")
	branch := strings.TrimPrefix(path, "/")

	// Validate branch parameter
	if err := ValidateBranchParam(branch); err != nil {
		HandleAPIError(w, err)
		return
	}
	if err := validation.ValidateBranchNameWithError(branch); err != nil {
		HandleAPIError(w, ErrInvalidBranchName)
		return
	}

	config := h.getServerWorktreeConfig()
	params := services.DeleteWorktreeParams{
		Branch:       branch,
		Force:        ParseBoolQueryParam(r, "force", false),
		DeleteBranch: ParseBoolQueryParam(r, "deleteBranch", false),
	}

	result, err := h.worktreeService.DeleteWorktreeForServer(config, params)
	if err != nil {
		slog.Error("Failed to delete worktree", "error", err, "branch", branch)
		apiErr := WrapServiceError(err, "ワークツリーの削除に失敗しました")
		writeErrorResponse(w, apiErr)
		return
	}

	response := map[string]interface{}{
		"success":         true,
		"worktreeRemoved": result.WorktreeRemoved,
		"branch":          result.Branch,
	}
	if params.DeleteBranch {
		response["branchDeleted"] = result.BranchDeleted
		if result.BranchDeleteError != "" {
			response["partialSuccess"] = true
			response["branchDeleteError"] = result.BranchDeleteError
		}
	}
	jsonResponse(w, response)
}

// HandleFetchWorktrees handles GET /api/worktrees/fetch
func (h *APIHandler) HandleFetchWorktrees(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	config := h.getServerWorktreeConfig()
	if err := h.worktreeService.FetchWorktrees(config); err != nil {
		slog.Warn("Fetch failed (possibly offline)", "error", err)
		jsonResponse(w, map[string]interface{}{
			"success": false,
			"message": "フェッチに失敗しました。ネットワーク接続を確認してください。",
			"code":    ErrCodeFetchFailed,
		})
		return
	}

	jsonResponse(w, map[string]interface{}{
		"success": true,
		"message": "Fetch completed successfully",
	})
}

// HandleDeleteSession handles DELETE /api/worktrees/session/{sessionId}
// This closes and deletes a session by its ID.
func (h *APIHandler) HandleDeleteSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract sessionId from URL path: /api/worktrees/session/{sessionId}
	sessionID := strings.TrimPrefix(r.URL.Path, "/api/worktrees/session/")
	if sessionID == "" {
		jsonError(w, "session ID required", http.StatusBadRequest)
		return
	}

	// Delete the session
	if err := h.sessionManager.DeleteSession(sessionID); err != nil {
		slog.Warn("Failed to delete session", "sessionId", sessionID, "error", err)
		jsonError(w, "Session not found", http.StatusNotFound)
		return
	}

	slog.Info("Session deleted via API", "sessionId", sessionID)
	jsonResponse(w, map[string]bool{"success": true})
}

// HandleGetWorktreeSession handles POST /api/worktrees/{branch}/session
// This endpoint finds or creates a session for the specified worktree and ensures the AI terminal is started.
func (h *APIHandler) HandleGetWorktreeSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract branch from URL path: /api/worktrees/{branch}/session
	path := strings.TrimPrefix(r.URL.Path, "/api/worktrees/")
	branch := strings.TrimSuffix(path, "/session")

	// Validate branch parameter
	if err := ValidateBranchParam(branch); err != nil {
		HandleAPIError(w, err)
		return
	}
	if err := validation.ValidateBranchNameWithError(branch); err != nil {
		HandleAPIError(w, ErrInvalidBranchName)
		return
	}

	// Delegate to service layer
	config := h.getServerWorktreeConfig()
	result, err := h.worktreeService.GetOrCreateWorktreeSession(config, branch)
	if err != nil {
		slog.Error("Failed to get or create worktree session", "error", err, "branch", branch)
		apiErr := WrapServiceError(err, "ワークツリーセッションの取得に失敗しました")
		writeErrorResponse(w, apiErr)
		return
	}

	jsonResponse(w, WorktreeSessionResponse{
		SessionID:      result.SessionID,
		Branch:         result.Branch,
		Path:           result.Path,
		TerminalStatus: result.TerminalStatus,
	})
}
