package handlers

import (
	"fmt"
	"log/slog"
	"net/http"
	"strings"
)

// HandleListBranches handles GET /api/branches
func (h *APIHandler) HandleListBranches(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	branches, err := h.gitService.GetBranchesForPath(h.repoPath)
	if err != nil {
		slog.Error("Failed to get branches", "error", err)
		jsonError(w, "Failed to get branches", http.StatusInternalServerError)
		return
	}

	// Extract branch names
	branchNames := make([]string, 0, len(branches))
	for _, b := range branches {
		branchNames = append(branchNames, b.Name)
	}

	jsonResponse(w, map[string]interface{}{
		"branches": branchNames,
	})
}

// CommitAndPushRequest represents a commit and push request
type CommitAndPushRequest struct {
	SessionID string `json:"sessionId"`
	Message   string `json:"message"`
}

// Validate implements Validatable interface
func (r *CommitAndPushRequest) Validate() error {
	if r.SessionID == "" {
		return fmt.Errorf("sessionId is required")
	}
	if r.Message == "" {
		return fmt.Errorf("message is required")
	}
	return nil
}

// HandleCommitAndPush handles POST /api/worktrees/{branch}/commit-push
func (h *APIHandler) HandleCommitAndPush(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract branch from URL path (used for response metadata, actual branch is determined by session)
	path := strings.TrimPrefix(r.URL.Path, "/api/worktrees/")
	branch := strings.TrimSuffix(path, "/commit-push")

	// Validate branch
	if err := ValidateBranchParam(branch); err != nil {
		HandleAPIError(w, err)
		return
	}

	var req CommitAndPushRequest
	if err := DecodeAndValidate(r, &req); err != nil {
		HandleAPIError(w, err)
		return
	}

	// Get changes to check if there are any
	changes, err := h.gitService.GetChanges(req.SessionID)
	if err != nil {
		slog.Error("Failed to get changes", "error", err)
		jsonError(w, "変更の取得に失敗しました", http.StatusInternalServerError)
		return
	}

	if len(changes) == 0 {
		jsonError(w, "コミットする変更がありません", http.StatusBadRequest)
		return
	}

	// Stage all files
	stagedCount := 0
	failedFiles := []string{}
	for _, change := range changes {
		if err := h.gitService.AcceptChange(req.SessionID, change.Path); err != nil {
			slog.Warn("Failed to stage file", "path", change.Path, "error", err)
			failedFiles = append(failedFiles, change.Path)
			// Continue with other files
		} else {
			stagedCount++
		}
	}

	if stagedCount == 0 {
		jsonError(w, "全てのファイルのステージングに失敗しました", http.StatusInternalServerError)
		return
	}

	// Commit
	commitHash, err := h.gitService.CommitChanges(req.SessionID, req.Message)
	if err != nil {
		slog.Error("Failed to commit", "error", err)
		jsonError(w, "コミットに失敗しました: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Push
	if err := h.gitService.PushChanges(req.SessionID); err != nil {
		slog.Error("Failed to push", "error", err)
		// Commit succeeded but push failed - return partial success with HTTP 207 Multi-Status
		jsonResponseWithStatus(w, http.StatusMultiStatus, map[string]interface{}{
			"success":        false,
			"commitHash":     commitHash,
			"error":          "プッシュに失敗しました: " + err.Error(),
			"partialSuccess": true,
		})
		return
	}

	response := map[string]interface{}{
		"success":    true,
		"commitHash": commitHash,
		"branch":     branch,
	}
	if len(failedFiles) > 0 {
		response["failedFiles"] = failedFiles
		response["warning"] = fmt.Sprintf("%d件のファイルをステージングできませんでした", len(failedFiles))
	}
	jsonResponse(w, response)
}
