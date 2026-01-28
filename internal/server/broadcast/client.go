package broadcast

import (
	"log/slog"
	"sync"

	"github.com/gorilla/websocket"
)

// Client represents a WebSocket client
type Client struct {
	ID            string
	Hub           *Hub
	Conn          *websocket.Conn
	Send          chan []byte
	SessionID     string
	TerminalType  TerminalType // Using typed enum for validation
	mu            sync.Mutex
	closeSendOnce sync.Once // Ensures Send channel is closed only once
}

// WriteMessage safely writes a message to the client
func (c *Client) WriteMessage(messageType int, data []byte) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.Conn.WriteMessage(messageType, data)
}

// CloseSend safely closes the Send channel exactly once
func (c *Client) CloseSend() {
	c.closeSendOnce.Do(func() {
		close(c.Send)
	})
}

// Close closes the client connection
func (c *Client) Close() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if err := c.Conn.Close(); err != nil {
		slog.Debug("Failed to close WebSocket connection", "clientId", c.ID, "sessionId", c.SessionID, "error", err)
	}
}
