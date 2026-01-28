package handlers

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"iori-editor/internal/server/broadcast"
	"iori-editor/internal/session"
)

// parseConnectionParams extracts and validates connection parameters from URL path
// URL format: /ws/terminal/{sessionId}/{terminalType}
func parseConnectionParams(r *http.Request) (*ConnectionParams, error) {
	path := strings.TrimPrefix(r.URL.Path, "/ws/terminal/")
	parts := strings.Split(path, "/")

	if len(parts) != 2 {
		return nil, ErrWSInvalidPath
	}

	params := &ConnectionParams{
		SessionID:    parts[0],
		TerminalType: parts[1],
	}

	if err := params.Validate(); err != nil {
		return nil, err
	}

	return params, nil
}

// validateAuth checks if the request is authenticated
func (h *WebSocketHandler) validateAuth(r *http.Request) error {
	if h.authValidator == nil {
		slog.Error("WebSocket handler has no auth validator configured - rejecting connection for security")
		return ErrWSAuthNotConfigured
	}
	if !h.authValidator(r) {
		return ErrWSUnauthorized
	}
	return nil
}

// upgradeConnection upgrades HTTP connection to WebSocket
func (h *WebSocketHandler) upgradeConnection(w http.ResponseWriter, r *http.Request, sessionID string) (*websocket.Conn, error) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("WebSocket upgrade error", "error", err, "sessionId", sessionID, "remoteAddr", r.RemoteAddr)
		return nil, err
	}
	return conn, nil
}

// createAndRegisterClient creates a new WebSocket client and registers it with the hub
func (h *WebSocketHandler) createAndRegisterClient(conn *websocket.Conn, params *ConnectionParams) *broadcast.Client {
	client := &broadcast.Client{
		ID:           uuid.New().String(),
		Hub:          h.hub,
		Conn:         conn,
		Send:         make(chan []byte, 256),
		SessionID:    params.SessionID,
		TerminalType: broadcast.TerminalType(params.TerminalType),
	}

	h.hub.Register(client)
	return client
}

// initializeClientConnection performs post-connection setup (history, streaming, pumps)
func (h *WebSocketHandler) initializeClientConnection(client *broadcast.Client, sess *session.Session, params *ConnectionParams) {
	// Increment connection count for session (decremented in readPump defer)
	sess.IncrementConnections()

	// Send history to newly connected client (for AI terminal only)
	if params.TerminalType == "ai" {
		h.sendHistoryToClient(client, sess)
	}

	// Start output streaming for this terminal if not already running
	h.streamManager.StartStreaming(h.ctx, sess, params.SessionID, params.TerminalType)

	// Start goroutines for reading and writing
	go h.writePump(client)
	go h.readPump(client, sess, params.TerminalType)

	// Send initial status
	h.hub.BroadcastStatus(params.SessionID, params.TerminalType, "connected")
}

// sendHistoryToClient sends the terminal history to a newly connected client
func (h *WebSocketHandler) sendHistoryToClient(client *broadcast.Client, sess *session.Session) {
	history := sess.GetAIHistory()
	if history == nil || history.IsEmpty() {
		return
	}

	historyData := history.GetHistory()
	if len(historyData) == 0 {
		return
	}

	// Send history as a special message type
	h.hub.BroadcastHistoryToClient(client, historyData)
}

// handleWSError handles WebSocket-related errors
func handleWSError(w http.ResponseWriter, r *http.Request, err error) {
	if apiErr, ok := err.(*APIError); ok {
		http.Error(w, apiErr.Msg, apiErr.Code)
		return
	}
	// SECURITY: Never expose internal error details to users
	slog.Error("WebSocket error", "error", err, "remoteAddr", r.RemoteAddr)
	http.Error(w, "Internal server error", http.StatusInternalServerError)
}
