package handlers

import (
	"context"
	"log/slog"
	"net/http"

	"iori-editor/internal/server/broadcast"
	"iori-editor/internal/session"
)

// WebSocketHandler handles WebSocket connections for terminal
type WebSocketHandler struct {
	hub                  *broadcast.Hub
	sessionManager       *session.Manager
	streamManager        *StreamManager
	historyStreamManager *HistoryStreamManager
	authValidator        AuthValidator   // Optional authentication validator
	ctx                  context.Context // Server context for graceful shutdown
	cancel               context.CancelFunc
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(hub *broadcast.Hub, sessionManager *session.Manager) *WebSocketHandler {
	return &WebSocketHandler{
		hub:            hub,
		sessionManager: sessionManager,
		streamManager:  NewStreamManager(hub),
	}
}

// SetHistoryStreamManager sets the history stream manager
func (h *WebSocketHandler) SetHistoryStreamManager(manager *HistoryStreamManager) {
	h.historyStreamManager = manager
}

// GetHistoryStreamManager returns the history stream manager
func (h *WebSocketHandler) GetHistoryStreamManager() *HistoryStreamManager {
	return h.historyStreamManager
}

// SetAuthValidator sets the authentication validator function
func (h *WebSocketHandler) SetAuthValidator(validator AuthValidator) {
	h.authValidator = validator
}

// SetContext sets the context for graceful shutdown
func (h *WebSocketHandler) SetContext(ctx context.Context) {
	h.ctx, h.cancel = context.WithCancel(ctx)
}

// HandleTerminalWS handles WebSocket connection for terminal
// URL: /ws/terminal/{sessionId}/{terminalType}
func (h *WebSocketHandler) HandleTerminalWS(w http.ResponseWriter, r *http.Request) {
	// Step 1: Validate authentication
	if err := h.validateAuth(r); err != nil {
		handleWSError(w, r, err)
		return
	}

	// Step 2: Parse and validate connection parameters
	params, err := parseConnectionParams(r)
	if err != nil {
		if apiErr, ok := err.(*APIError); ok {
			// Log additional details for session ID format errors
			if apiErr == ErrWSInvalidSessionID {
				slog.Warn("Invalid session ID format in WebSocket request",
					"path", r.URL.Path,
					"remoteAddr", r.RemoteAddr,
				)
			}
		}
		handleWSError(w, r, err)
		return
	}

	// Step 3: Verify session exists
	sess, err := h.sessionManager.GetSession(params.SessionID)
	if err != nil {
		slog.Warn("Session not found for WebSocket connection",
			"sessionId", params.SessionID,
			"error", err,
		)
		handleWSError(w, r, ErrWSSessionNotFound)
		return
	}

	// Step 4: Upgrade to WebSocket
	conn, err := h.upgradeConnection(w, r, params.SessionID)
	if err != nil {
		return // Error already logged in upgradeConnection
	}

	// Step 5: Create and register client
	client := h.createAndRegisterClient(conn, params)

	// Step 6: Initialize connection (history, streaming, pumps)
	h.initializeClientConnection(client, sess, params)
}

// StopOutputStreaming stops streaming for a session/terminal
func (h *WebSocketHandler) StopOutputStreaming(sessionID, terminalType string) {
	h.streamManager.StopStreaming(sessionID, terminalType)
}

// StopAllStreams stops all output streaming goroutines
// Called during server shutdown to prevent goroutine leaks
func (h *WebSocketHandler) StopAllStreams() {
	h.streamManager.StopAll()

	// Cancel context to signal all goroutines
	if h.cancel != nil {
		h.cancel()
	}
}
