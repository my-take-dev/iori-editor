package handlers

import (
	"context"
	"io"
	"log/slog"
	"sync"
	"time"

	"iori-editor/internal/server/broadcast"
	"iori-editor/internal/session"
	"iori-editor/internal/terminal"
)

const (
	outputBufferMaxSize    = 8192                  // Output buffer max size
	outputFlushInterval    = 16 * time.Millisecond // Output flush interval
	terminalReadBufferSize = 4096                  // Terminal read buffer size
)

// StreamManager handles terminal output streaming
type StreamManager struct {
	outputStreams map[string]chan struct{} // sessionID-termType -> stop channel
	mu            sync.Mutex
	hub           *broadcast.Hub
}

// NewStreamManager creates a new StreamManager
func NewStreamManager(hub *broadcast.Hub) *StreamManager {
	return &StreamManager{
		outputStreams: make(map[string]chan struct{}),
		hub:           hub,
	}
}

// StartStreaming starts streaming terminal output for a session/terminal
// Returns true if streaming was started, false if already streaming
func (m *StreamManager) StartStreaming(ctx context.Context, sess *session.Session, sessionID, terminalType string) bool {
	streamKey := sessionID + "-" + terminalType

	m.mu.Lock()
	if _, exists := m.outputStreams[streamKey]; exists {
		// Already streaming
		m.mu.Unlock()
		return false
	}

	stopChan := make(chan struct{})
	m.outputStreams[streamKey] = stopChan
	m.mu.Unlock()

	termType := session.TerminalType(terminalType)
	term := sess.GetTerminal(termType)
	if term == nil {
		slog.Warn("Terminal not available", "terminalType", terminalType, "sessionId", sessionID)
		// Clean up the stream key before returning to prevent map leak
		m.mu.Lock()
		delete(m.outputStreams, streamKey)
		m.mu.Unlock()
		m.hub.BroadcastError(sessionID, terminalType, getUserFriendlyError("terminal_not_available"))
		return false
	}

	go m.streamLoop(ctx, term, sess, sessionID, terminalType, stopChan)
	return true
}

// StopStreaming stops streaming for a specific session/terminal
func (m *StreamManager) StopStreaming(sessionID, terminalType string) {
	streamKey := sessionID + "-" + terminalType

	m.mu.Lock()
	defer m.mu.Unlock()

	if stopChan, exists := m.outputStreams[streamKey]; exists {
		close(stopChan)
		delete(m.outputStreams, streamKey)
	}
}

// StopAll stops all output streaming goroutines
func (m *StreamManager) StopAll() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for streamKey, stopChan := range m.outputStreams {
		close(stopChan)
		slog.Debug("Stopped output stream", "streamKey", streamKey)
	}
	m.outputStreams = make(map[string]chan struct{})
}

// streamLoop is the main streaming loop
func (m *StreamManager) streamLoop(ctx context.Context, term *terminal.Terminal, sess *session.Session, sessionID, terminalType string, stopChan chan struct{}) {
	// Helper to clean up the stream entry from the map
	cleanupStream := func() {
		streamKey := sessionID + "-" + terminalType
		m.mu.Lock()
		delete(m.outputStreams, streamKey)
		m.mu.Unlock()
	}
	// Ensure cleanup is always called on all exit paths
	defer cleanupStream()

	// Use an output buffer for batching (similar to terminal service)
	outputBuffer, err := terminal.NewOutputBuffer(outputBufferMaxSize, outputFlushInterval, func(data []byte) {
		// Broadcast to WebSocket clients
		m.hub.BroadcastOutput(sessionID, terminalType, data)
		// Also write to history buffer for AI terminal
		if terminalType == "ai" && sess != nil {
			sess.WriteToAIHistory(data)
		}
	})
	if err != nil {
		slog.Error("Failed to create output buffer", "error", err)
		m.hub.BroadcastError(sessionID, terminalType, getUserFriendlyError("terminal_buffer_error"))
		return
	}
	outputBuffer.Start()
	defer outputBuffer.Stop()

	// Create a channel for read results
	resultChan := make(chan readResult, 1)

	// Done channel to signal read goroutine should exit
	readDone := make(chan struct{})
	defer close(readDone)

	// Start a single read goroutine that continuously reads from terminal
	go m.startReadGoroutine(term, resultChan, readDone, sessionID, terminalType)

	// Main loop: wait for read results, stop signal, or context cancellation
	for {
		select {
		case <-ctx.Done():
			slog.Debug("Context cancelled, stopping output streaming",
				"sessionId", sessionID, "terminalType", terminalType)
			return
		case <-stopChan:
			slog.Debug("Stopping output streaming", "sessionId", sessionID, "terminalType", terminalType)
			return
		case result := <-resultChan:
			if result.err != nil {
				if result.err != io.EOF {
					slog.Error("Terminal read error", "error", result.err)
					m.hub.BroadcastError(sessionID, terminalType, getUserFriendlyError("terminal_disconnected"))
				}
				return
			}
			if len(result.data) > 0 {
				outputBuffer.Write(result.data)
			}
		}
	}
}

// startReadGoroutine starts the goroutine that reads from terminal
func (m *StreamManager) startReadGoroutine(term *terminal.Terminal, resultChan chan<- readResult, readDone <-chan struct{}, sessionID, terminalType string) {
	buf := make([]byte, terminalReadBufferSize)
	for {
		// Check if we should exit before blocking on read
		select {
		case <-readDone:
			slog.Debug("Read goroutine exiting (signaled)",
				"sessionId", sessionID, "terminalType", terminalType)
			return
		default:
		}

		n, err := term.Read(buf)
		if err != nil {
			slog.Debug("Terminal read error during streaming",
				"error", err, "sessionId", sessionID, "terminalType", terminalType)
			select {
			case resultChan <- readResult{data: nil, err: err}:
			case <-readDone:
			}
			return
		}
		if n > 0 {
			// Make a copy of the data to avoid race conditions
			data := make([]byte, n)
			copy(data, buf[:n])
			select {
			case resultChan <- readResult{data: data, err: nil}:
			case <-readDone:
				slog.Debug("Read goroutine exiting (readDone while sending)",
					"sessionId", sessionID, "terminalType", terminalType)
				return
			}
		}
	}
}
