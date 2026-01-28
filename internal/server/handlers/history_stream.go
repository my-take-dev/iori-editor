package handlers

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"iori-editor/internal/history"
	"iori-editor/internal/server/broadcast"
)

const (
	// HistoryStreamChunkSize is the number of entries to send in each chunk
	HistoryStreamChunkSize = 100
)

// HistoryStreamManager handles history streaming to WebSocket clients
type HistoryStreamManager struct {
	activeStreams map[string]context.CancelFunc // clientID -> cancel function
	mu            sync.Mutex
	hub           *broadcast.Hub
	storage       history.Storage
}

// NewHistoryStreamManager creates a new HistoryStreamManager
func NewHistoryStreamManager(hub *broadcast.Hub, storage history.Storage) *HistoryStreamManager {
	return &HistoryStreamManager{
		activeStreams: make(map[string]context.CancelFunc),
		hub:           hub,
		storage:       storage,
	}
}

// HistoryStreamRequest represents a request to stream history
type HistoryStreamRequest struct {
	Filename         string `json:"filename"`
	Offset           int    `json:"offset"`
	CurrentSessionID string `json:"currentSessionId"`
}

// StartStreaming starts streaming history data to a client
// Returns true if streaming was started, false if already streaming or on error
func (m *HistoryStreamManager) StartStreaming(ctx context.Context, client *broadcast.Client, req *HistoryStreamRequest) bool {
	m.mu.Lock()
	if _, exists := m.activeStreams[client.ID]; exists {
		m.mu.Unlock()
		slog.Debug("History streaming already active for client", "clientId", client.ID)
		return false
	}

	streamCtx, cancel := context.WithCancel(ctx)
	m.activeStreams[client.ID] = cancel
	m.mu.Unlock()

	go m.streamLoop(streamCtx, client, req)
	return true
}

// StopStreaming stops streaming for a specific client
func (m *HistoryStreamManager) StopStreaming(clientID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if cancel, exists := m.activeStreams[clientID]; exists {
		cancel()
		delete(m.activeStreams, clientID)
		slog.Debug("Stopped history streaming", "clientId", clientID)
	}
}

// StopAll stops all history streaming goroutines
func (m *HistoryStreamManager) StopAll() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for clientID, cancel := range m.activeStreams {
		cancel()
		slog.Debug("Stopped history stream", "clientId", clientID)
	}
	m.activeStreams = make(map[string]context.CancelFunc)
}

// streamLoop is the main streaming loop
func (m *HistoryStreamManager) streamLoop(ctx context.Context, client *broadcast.Client, req *HistoryStreamRequest) {
	defer func() {
		m.mu.Lock()
		delete(m.activeStreams, client.ID)
		m.mu.Unlock()
	}()

	// Validate filename
	if err := history.ValidateFilename(req.Filename); err != nil {
		slog.Error("Invalid filename for history streaming", "error", err, "filename", req.Filename)
		m.hub.BroadcastError(client.SessionID, client.TerminalType.String(), "Invalid history filename")
		return
	}

	if !strings.HasSuffix(req.Filename, ".meta.json") {
		slog.Error("Unsupported file format for history streaming", "filename", req.Filename)
		m.hub.BroadcastError(client.SessionID, client.TerminalType.String(), "Unsupported history file format")
		return
	}

	basename := strings.TrimSuffix(req.Filename, ".meta.json")
	dataPath := filepath.Join(m.storage.GetBasePath(), basename+".ndjson")

	// Get file size
	fileInfo, err := os.Stat(dataPath)
	if err != nil {
		if os.IsNotExist(err) {
			// Send empty end message
			if sendErr := m.hub.BroadcastHistoryEnd(client, &broadcast.HistoryEndPayload{
				TotalEntries: 0,
				FileSize:     0,
			}); sendErr != nil {
				slog.Warn("Failed to send history end", "error", sendErr, "clientId", client.ID)
			}
			return
		}
		slog.Error("Failed to stat history data file", "error", err, "path", dataPath)
		m.hub.BroadcastError(client.SessionID, client.TerminalType.String(), "Failed to read history file")
		return
	}
	fileSize := fileInfo.Size()

	offset := req.Offset
	totalEntries := 0

	for {
		select {
		case <-ctx.Done():
			slog.Debug("History streaming cancelled", "clientId", client.ID)
			return
		default:
		}

		// Collect entries for this chunk
		var chunkData strings.Builder
		chunkEntryCount := 0
		startIndex := offset

		hasMore, err := m.storage.StreamEntriesRange(dataPath, offset, HistoryStreamChunkSize, func(entry history.TerminalHistoryEntry) error {
			select {
			case <-ctx.Done():
				return ctx.Err()
			default:
			}
			chunkData.WriteString(entry.Data)
			chunkEntryCount++
			return nil
		})

		if err != nil {
			if err == context.Canceled {
				return
			}
			slog.Error("Failed to stream history entries", "error", err, "clientId", client.ID)
			m.hub.BroadcastError(client.SessionID, client.TerminalType.String(), "Failed to read history data")
			return
		}

		// Send chunk if we have data
		if chunkEntryCount > 0 {
			endIndex := offset + chunkEntryCount
			payload := &broadcast.HistoryChunkPayload{
				Data:       chunkData.String(),
				StartIndex: startIndex,
				EndIndex:   endIndex,
				HasMore:    hasMore,
			}

			if sendErr := m.hub.BroadcastHistoryChunk(client, payload); sendErr != nil {
				slog.Warn("Failed to send history chunk", "error", sendErr, "clientId", client.ID)
				return
			}

			offset = endIndex
			totalEntries += chunkEntryCount
		}

		// If no more data, send end message and exit
		if !hasMore {
			if sendErr := m.hub.BroadcastHistoryEnd(client, &broadcast.HistoryEndPayload{
				TotalEntries: totalEntries,
				FileSize:     fileSize,
			}); sendErr != nil {
				slog.Warn("Failed to send history end", "error", sendErr, "clientId", client.ID)
			}
			return
		}
	}
}
