package broadcast

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
)

// Broadcast broadcasts a message to a specific session/terminal
func (h *Hub) Broadcast(sessionID, terminalType string, data []byte) {
	h.broadcast <- &BroadcastMessage{
		SessionID:    sessionID,
		TerminalType: TerminalType(terminalType),
		Data:         data,
	}
}

// broadcastMessage sends a message to all clients for a session/terminal
func (h *Hub) broadcastMessage(message *BroadcastMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	termType := message.TerminalType.String()
	if sessionClients, ok := h.clients[message.SessionID]; ok {
		if termClients, ok := sessionClients[termType]; ok {
			for clientID, client := range termClients {
				select {
				case client.Send <- message.Data:
				default:
					// Client send buffer is full, log warning and skip
					slog.Warn("Client send buffer full, dropping message",
						"sessionId", message.SessionID,
						"terminalType", termType,
						"clientId", clientID,
					)
				}
			}
		}
	}
}

// BroadcastOutput sends terminal output to connected client
func (h *Hub) BroadcastOutput(sessionID, terminalType string, output []byte) {
	msg := Message{
		Type: MessageTypeOutput,
		Data: json.RawMessage(`"` + escapeJSON(string(output)) + `"`),
	}

	data, err := json.Marshal(msg)
	if err != nil {
		slog.Error("Failed to marshal broadcast output message", "error", err)
		// Send a safe fallback error message that can't fail to marshal
		h.Broadcast(sessionID, terminalType, []byte(`{"type":"error","data":"internal encoding error"}`))
		return
	}

	h.Broadcast(sessionID, terminalType, data)
}

// BroadcastStatus sends status update to connected client
func (h *Hub) BroadcastStatus(sessionID, terminalType, status string) {
	msg := Message{
		Type: MessageTypeStatus,
		Data: json.RawMessage(`"` + escapeJSON(status) + `"`),
	}

	data, err := json.Marshal(msg)
	if err != nil {
		slog.Error("Failed to marshal broadcast status message", "error", err)
		// Send a safe fallback error message that can't fail to marshal
		h.Broadcast(sessionID, terminalType, []byte(`{"type":"error","data":"internal encoding error"}`))
		return
	}

	h.Broadcast(sessionID, terminalType, data)
}

// BroadcastError sends error message to connected client
func (h *Hub) BroadcastError(sessionID, terminalType, errorMsg string) {
	msg := Message{
		Type: MessageTypeError,
		Data: json.RawMessage(`"` + escapeJSON(errorMsg) + `"`),
	}

	data, err := json.Marshal(msg)
	if err != nil {
		slog.Error("Failed to marshal broadcast error message", "error", err)
		// Send a safe fallback error message that can't fail to marshal
		h.Broadcast(sessionID, terminalType, []byte(`{"type":"error","data":"internal encoding error"}`))
		return
	}

	h.Broadcast(sessionID, terminalType, data)
}

// BroadcastHistoryToClient sends terminal history to a specific client (not broadcast to all)
func (h *Hub) BroadcastHistoryToClient(client *Client, history []byte) {
	msg := Message{
		Type: MessageTypeHistory,
		Data: json.RawMessage(`"` + escapeJSON(string(history)) + `"`),
	}

	data, err := json.Marshal(msg)
	if err != nil {
		slog.Error("Failed to marshal history message", "error", err)
		// Send a safe fallback error message that can't fail to marshal
		select {
		case client.Send <- []byte(`{"type":"error","data":"internal encoding error"}`):
		default:
			slog.Warn("Client send buffer full, could not send error", "clientId", client.ID)
		}
		return
	}

	// Send directly to the specific client (non-blocking)
	select {
	case client.Send <- data:
		slog.Debug("Sent history to client", "clientId", client.ID, "historySize", len(history))
	default:
		slog.Warn("Client send buffer full, could not send history", "clientId", client.ID)
	}
}

// BroadcastHistoryChunk sends a chunk of history data to a specific client
func (h *Hub) BroadcastHistoryChunk(client *Client, payload *HistoryChunkPayload) error {
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	msg := Message{
		Type: MessageTypeHistoryChunk,
		Data: payloadJSON,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	select {
	case client.Send <- data:
		return nil
	default:
		return fmt.Errorf("client send buffer full")
	}
}

// BroadcastHistoryEnd signals the end of history streaming to a specific client
func (h *Hub) BroadcastHistoryEnd(client *Client, payload *HistoryEndPayload) error {
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	msg := Message{
		Type: MessageTypeHistoryEnd,
		Data: payloadJSON,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	select {
	case client.Send <- data:
		return nil
	default:
		return fmt.Errorf("client send buffer full")
	}
}

// escapeJSON escapes special characters for JSON string using strings.Builder for efficiency
func escapeJSON(s string) string {
	var b strings.Builder
	b.Grow(len(s) + 10) // Pre-allocate with some extra space for escape sequences

	for _, r := range s {
		switch r {
		case '"':
			b.WriteString(`\"`)
		case '\\':
			b.WriteString(`\\`)
		case '\n':
			b.WriteString(`\n`)
		case '\r':
			b.WriteString(`\r`)
		case '\t':
			b.WriteString(`\t`)
		case '\b':
			b.WriteString(`\b`)
		case '\f':
			b.WriteString(`\f`)
		default:
			if r < 32 {
				// Encode other control characters as \uXXXX
				b.WriteString(fmt.Sprintf(`\u%04x`, r))
			} else {
				b.WriteRune(r)
			}
		}
	}
	return b.String()
}
