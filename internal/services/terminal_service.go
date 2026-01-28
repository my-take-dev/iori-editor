package services

import (
	"context"
	"fmt"
	"io"
	"sync"
	"time"

	"iori-editor/internal/history"
	"iori-editor/internal/logger"
	"iori-editor/internal/session"
	"iori-editor/internal/terminal"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	outputBufferMaxSize    = 8192                  // Output buffer max size
	outputFlushInterval    = 16 * time.Millisecond // Output flush interval
	terminalReadBufferSize = 4096                  // Terminal read buffer size
)

// TerminalService handles all terminal-related operations
type TerminalService struct {
	// ctx is the Wails application lifecycle context.
	// This is NOT a per-request context; it's set once during app startup
	// and used for emitting events to the frontend via runtime.EventsEmit().
	ctx            context.Context
	ctxMu          sync.RWMutex
	sessionManager *session.Manager
	historyManager *history.Manager
}

// NewTerminalService creates a new TerminalService instance
func NewTerminalService(sessionManager *session.Manager, historyManager *history.Manager) *TerminalService {
	return &TerminalService{
		sessionManager: sessionManager,
		historyManager: historyManager,
	}
}

// SetContext sets the Wails context for event emission.
// This is called once during app startup by Wails.
func (s *TerminalService) SetContext(ctx context.Context) {
	s.ctxMu.Lock()
	defer s.ctxMu.Unlock()
	s.ctx = ctx
}

// getContext returns the Wails context in a thread-safe manner
func (s *TerminalService) getContext() context.Context {
	s.ctxMu.RLock()
	defer s.ctxMu.RUnlock()
	return s.ctx
}

// WriteToTerminal writes data to a terminal in a session
func (s *TerminalService) WriteToTerminal(sessionID string, terminalType string, data string) error {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return err
	}

	termType := session.TerminalType(terminalType)
	if _, err = sess.WriteToTerminal(termType, []byte(data)); err != nil {
		return err
	}

	if s.historyManager != nil && data != "" {
		s.historyManager.AppendEntry(sessionID, history.TerminalType(termType), []byte(data))
	}

	return nil
}

// ResizeTerminal resizes a terminal in a session
func (s *TerminalService) ResizeTerminal(sessionID string, terminalType string, cols int, rows int) error {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return err
	}

	termType := session.TerminalType(terminalType)
	return sess.ResizeTerminal(termType, cols, rows)
}

// StreamTerminalOutput reads from terminal and emits events to frontend
// Uses OutputBuffer to reduce event frequency (batches output at ~60fps)
func (s *TerminalService) StreamTerminalOutput(sessionID string, termType session.TerminalType) {
	defer func() {
		if r := recover(); r != nil {
			logger.Panic(r)
		}
	}()

	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		logger.Error(fmt.Sprintf("StreamTerminalOutput: failed to get session %s", sessionID), err)
		return
	}

	term := sess.GetTerminal(termType)
	if term == nil {
		logger.Error(fmt.Sprintf("StreamTerminalOutput: terminal %s is nil for session %s", termType, sessionID), nil)
		return
	}

	outputBuffer, err := terminal.NewOutputBuffer(outputBufferMaxSize, outputFlushInterval, func(data []byte) {
		runtime.EventsEmit(s.getContext(), "terminal:output", map[string]interface{}{
			"sessionId":    sessionID,
			"terminalType": string(termType),
			"data":         string(data),
		})

		sess.WriteToTerminalHistory(termType, data)

		if s.historyManager != nil {
			s.historyManager.AppendEntry(sessionID, history.TerminalType(termType), data)
		}
	})
	if err != nil {
		logger.Error(fmt.Sprintf("StreamTerminalOutput: failed to create output buffer for session %s", sessionID), err)
		return
	}
	outputBuffer.Start()
	defer outputBuffer.Stop()

	buf := make([]byte, terminalReadBufferSize)
	for {
		n, err := term.Read(buf)
		if err != nil {
			if err != io.EOF {
				logger.Error(fmt.Sprintf("StreamTerminalOutput: read error for session %s, terminal %s", sessionID, termType), err)
			}
			return
		}
		if n > 0 {
			outputBuffer.Write(buf[:n])
		}
	}
}

// GetTerminalHistory returns the terminal history for a session/terminal type.
// Returns an empty string when no history is available.
func (s *TerminalService) GetTerminalHistory(sessionID string, terminalType string) (string, error) {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return "", err
	}

	termType := session.TerminalType(terminalType)
	switch termType {
	case session.TerminalTypeAI, session.TerminalTypeUser:
	default:
		return "", fmt.Errorf("unknown terminal type: %s", terminalType)
	}

	history := sess.GetTerminalHistory(termType)
	if history == nil || history.IsEmpty() {
		return "", nil
	}

	return string(history.GetHistory()), nil
}
