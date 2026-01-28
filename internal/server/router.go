package server

import (
	"embed"
	"log/slog"
	"net/http"
	"strings"
)

//go:embed assets/*
var serverAssets embed.FS

// GetServerAssets returns the embedded server assets
func GetServerAssets() embed.FS {
	return serverAssets
}

// RegisterAllRoutes registers all HTTP routes
func (s *Server) RegisterAllRoutes(mux *http.ServeMux) {
	// Health check
	mux.HandleFunc("/api/health", s.handleHealth)

	// Auth endpoints
	mux.HandleFunc("/login", s.viewHandler.HandleLoginPage)
	mux.HandleFunc("/api/auth/login", s.authHandler.HandleLogin)
	mux.HandleFunc("/api/auth/logout", s.authHandler.HandleLogout)

	// WebSocket endpoints
	mux.HandleFunc("/ws/terminal/", s.wsHandler.HandleTerminalWS)

	// REST API endpoints
	mux.HandleFunc("/api/worktrees/fetch", s.apiHandler.HandleFetchWorktrees)
	mux.HandleFunc("/api/worktrees/", s.handleWorktreeAPI) // Handles both list and delete
	mux.HandleFunc("/api/worktrees", s.handleWorktreeAPI)  // Handles create
	mux.HandleFunc("/api/branches", s.apiHandler.HandleListBranches)
	mux.HandleFunc("/api/files/", s.apiHandler.HandleGetFile)
	mux.HandleFunc("/api/files", s.apiHandler.HandleListFiles)

	// Static assets
	mux.HandleFunc("/static/", s.staticHandler.HandleStatic)
	mux.HandleFunc("/vendor/", s.staticHandler.HandleVendor)

	// Main page
	mux.HandleFunc("/", s.viewHandler.HandleIndex)
}

// handleWorktreeAPI routes worktree requests based on method
func (s *Server) handleWorktreeAPI(w http.ResponseWriter, r *http.Request) {
	slog.Info("handleWorktreeAPI called", "method", r.Method, "path", r.URL.Path)

	// Check for session delete: DELETE /api/worktrees/session/{sessionId}
	if strings.HasPrefix(r.URL.Path, "/api/worktrees/session/") && r.Method == "DELETE" {
		s.apiHandler.HandleDeleteSession(w, r)
		return
	}

	// Check if this is a session request: /api/worktrees/{branch}/session
	if strings.HasSuffix(r.URL.Path, "/session") {
		slog.Info("Routing to HandleGetWorktreeSession")
		s.apiHandler.HandleGetWorktreeSession(w, r)
		return
	}

	// Check if this is a commit-push request: /api/worktrees/{branch}/commit-push
	if strings.HasSuffix(r.URL.Path, "/commit-push") {
		slog.Info("Routing to HandleCommitAndPush")
		s.apiHandler.HandleCommitAndPush(w, r)
		return
	}

	switch r.Method {
	case "GET":
		s.apiHandler.HandleListWorktrees(w, r)
	case "POST":
		s.apiHandler.HandleCreateWorktree(w, r)
	case "DELETE":
		s.apiHandler.HandleDeleteWorktree(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleHealth returns server health status
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write([]byte(`{"status":"ok"}`)); err != nil {
		slog.Warn("Failed to write health response", "error", err)
	}
}
