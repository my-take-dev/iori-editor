package broadcast

import (
	"context"
	"log/slog"
	"sync"
)

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	// Registered clients by session, terminal type, and client ID (supports multiple clients)
	clients map[string]map[string]map[string]*Client // sessionID -> terminalType -> clientID -> client

	// Register requests
	register chan *Client

	// Unregister requests
	unregister chan *Client

	// Inbound messages from clients
	broadcast chan *BroadcastMessage

	mu sync.RWMutex
}

// NewHub creates a new Hub
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]map[string]map[string]*Client),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan *BroadcastMessage, 256),
	}
}

// Run starts the hub with context for graceful shutdown
func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			slog.Info("Hub shutting down")
			h.closeAllClients()
			return

		case client := <-h.register:
			h.registerClient(client)

		case client := <-h.unregister:
			h.unregisterClient(client)

		case message := <-h.broadcast:
			h.broadcastMessage(message)
		}
	}
}

// closeAllClients closes all registered clients
func (h *Hub) closeAllClients() {
	h.mu.Lock()
	defer h.mu.Unlock()

	for sessionID, sessionClients := range h.clients {
		for termType, termClients := range sessionClients {
			for clientID, client := range termClients {
				client.CloseSend()
				delete(termClients, clientID)
			}
			delete(sessionClients, termType)
		}
		delete(h.clients, sessionID)
	}
}

// registerClient adds a client to the hub
func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	termType := client.TerminalType.String()

	// Initialize session map if needed
	if _, ok := h.clients[client.SessionID]; !ok {
		h.clients[client.SessionID] = make(map[string]map[string]*Client)
	}

	// Initialize terminal type map if needed
	if _, ok := h.clients[client.SessionID][termType]; !ok {
		h.clients[client.SessionID][termType] = make(map[string]*Client)
	}

	// Add client (supports multiple clients per session/terminal)
	h.clients[client.SessionID][termType][client.ID] = client

	slog.Info("Client registered",
		"clientId", client.ID,
		"sessionId", client.SessionID,
		"terminalType", termType,
		"totalClientsForTerminal", len(h.clients[client.SessionID][termType]),
	)
}

// unregisterClient removes a client from the hub
func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	termType := client.TerminalType.String()
	if sessionClients, ok := h.clients[client.SessionID]; ok {
		if termClients, ok := sessionClients[termType]; ok {
			if _, ok := termClients[client.ID]; ok {
				delete(termClients, client.ID)
				client.CloseSend()

				// Clean up empty maps
				if len(termClients) == 0 {
					delete(sessionClients, termType)
				}
				if len(sessionClients) == 0 {
					delete(h.clients, client.SessionID)
				}
			}
		}
	}
}

// Register registers a client
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister unregisters a client
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

// GetClients returns all clients for a session and terminal type
func (h *Hub) GetClients(sessionID, terminalType string) []*Client {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if sessionClients, ok := h.clients[sessionID]; ok {
		if termClients, ok := sessionClients[terminalType]; ok {
			clients := make([]*Client, 0, len(termClients))
			for _, client := range termClients {
				clients = append(clients, client)
			}
			return clients
		}
	}
	return nil
}

// HasClient checks if any client exists for session/terminal
func (h *Hub) HasClient(sessionID, terminalType string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if sessionClients, ok := h.clients[sessionID]; ok {
		if termClients, ok := sessionClients[terminalType]; ok {
			return len(termClients) > 0
		}
	}
	return false
}
