package handlers

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/gorilla/websocket"
	"iori-editor/internal/server/broadcast"
	"iori-editor/internal/session"
)

// readPump pumps messages from the WebSocket connection to the terminal
func (h *WebSocketHandler) readPump(client *broadcast.Client, sess *session.Session, terminalType string) {
	defer func() {
		sess.DecrementConnections()
		h.hub.Unregister(client)
		client.Close()
	}()

	client.Conn.SetReadLimit(maxMessageSize)
	if err := client.Conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
		slog.Warn("Failed to set read deadline, closing connection", "error", err, "clientId", client.ID)
		return
	}
	client.Conn.SetPongHandler(func(string) error {
		if err := client.Conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
			slog.Warn("Failed to set read deadline in pong handler", "error", err, "clientId", client.ID)
			return err
		}
		return nil
	})

	termType := session.TerminalType(terminalType)

	for {
		_, message, err := client.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNormalClosure) {
				slog.Error("WebSocket read error", "error", err)
			} else {
				slog.Debug("WebSocket closed", "error", err)
			}
			break
		}

		// Parse message
		var msg broadcast.Message
		if err := json.Unmarshal(message, &msg); err != nil {
			slog.Warn("Message parse error", "error", err, "sessionId", client.SessionID)
			h.hub.BroadcastError(client.SessionID, terminalType, getUserFriendlyError("invalid_message_format"))
			continue
		}

		// Handle message based on type
		h.handleMessage(client, sess, termType, client.SessionID, terminalType, &msg)
	}
}

// handleMessage dispatches a parsed message to the appropriate handler
func (h *WebSocketHandler) handleMessage(client *broadcast.Client, sess *session.Session, termType session.TerminalType, sessionID, terminalType string, msg *broadcast.Message) {
	switch msg.Type {
	case broadcast.MessageTypeInput:
		h.handleInput(sess, termType, sessionID, terminalType, msg.Data)
	case broadcast.MessageTypeResize:
		h.handleResize(sess, termType, sessionID, terminalType, msg.Data)
	case broadcast.MessageTypeHistoryStreamRequest:
		h.handleHistoryStreamRequest(client, msg.Data)
	}
}

// handleInput handles terminal input from client
func (h *WebSocketHandler) handleInput(sess *session.Session, termType session.TerminalType, sessionID, terminalType string, data json.RawMessage) {
	var input string
	if err := json.Unmarshal(data, &input); err != nil {
		slog.Warn("Input parse error", "error", err, "sessionId", sessionID)
		h.hub.BroadcastError(sessionID, terminalType, getUserFriendlyError("invalid_input_data"))
		return
	}

	// Write to terminal
	if _, err := sess.WriteToTerminal(termType, []byte(input)); err != nil {
		slog.Error("Terminal write error", "error", err, "sessionId", sessionID)
		h.hub.BroadcastError(sessionID, terminalType, getUserFriendlyError("terminal_write_error"))
	}
}

// handleResize handles terminal resize from client
func (h *WebSocketHandler) handleResize(sess *session.Session, termType session.TerminalType, sessionID, terminalType string, data json.RawMessage) {
	var resize broadcast.ResizeData
	if err := json.Unmarshal(data, &resize); err != nil {
		slog.Warn("Resize parse error", "error", err, "sessionId", sessionID)
		h.hub.BroadcastError(sessionID, terminalType, getUserFriendlyError("invalid_resize_data"))
		return
	}

	// Resize terminal
	if err := sess.ResizeTerminal(termType, resize.Cols, resize.Rows); err != nil {
		slog.Error("Terminal resize error", "error", err, "sessionId", sessionID)
		h.hub.BroadcastError(sessionID, terminalType, getUserFriendlyError("terminal_resize_error"))
	}
}

// handleHistoryStreamRequest handles history streaming request from client
func (h *WebSocketHandler) handleHistoryStreamRequest(client *broadcast.Client, data json.RawMessage) {
	if h.historyStreamManager == nil {
		slog.Warn("History stream manager not configured", "clientId", client.ID)
		h.hub.BroadcastError(client.SessionID, client.TerminalType.String(), "History streaming not available")
		return
	}

	var req HistoryStreamRequest
	if err := json.Unmarshal(data, &req); err != nil {
		slog.Warn("History stream request parse error", "error", err, "clientId", client.ID)
		h.hub.BroadcastError(client.SessionID, client.TerminalType.String(), getUserFriendlyError("invalid_history_request"))
		return
	}

	// Use the handler's context for streaming
	ctx := h.ctx
	if ctx == nil {
		ctx = context.Background()
	}

	if !h.historyStreamManager.StartStreaming(ctx, client, &req) {
		slog.Debug("History streaming already active or failed to start", "clientId", client.ID)
	}
}

// writePump pumps messages from the hub to the WebSocket connection
func (h *WebSocketHandler) writePump(client *broadcast.Client) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		client.Close()
	}()

	for {
		select {
		case message, ok := <-client.Send:
			if err := client.Conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				slog.Warn("Failed to set write deadline",
					"error", err,
					"clientId", client.ID,
					"sessionId", client.SessionID,
				)
				return
			}
			if !ok {
				// Hub closed the channel
				if err := client.WriteMessage(websocket.CloseMessage, []byte{}); err != nil {
					slog.Debug("Failed to send close message", "error", err)
				}
				return
			}

			if err := client.WriteMessage(websocket.TextMessage, message); err != nil {
				slog.Warn("Failed to write message to WebSocket client",
					"error", err,
					"clientId", client.ID,
					"sessionId", client.SessionID,
				)
				return
			}

		case <-ticker.C:
			if err := client.Conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				slog.Warn("Failed to set write deadline for ping",
					"error", err,
					"clientId", client.ID,
					"sessionId", client.SessionID,
				)
				return
			}
			if err := client.WriteMessage(websocket.PingMessage, nil); err != nil {
				slog.Debug("WebSocket ping failed, closing connection",
					"error", err,
					"clientId", client.ID,
					"sessionId", client.SessionID,
				)
				return
			}
		}
	}
}
