package session

import (
	"fmt"
	"log/slog"
	"time"

	"iori-editor/internal/terminal"
)

// TerminalType represents the type of terminal
type TerminalType string

const (
	TerminalTypeAI   TerminalType = "ai"
	TerminalTypeUser TerminalType = "user"

	historyBufferLines = 1000                   // History buffer max lines
	aiActivityTimeout  = 500 * time.Millisecond // AI activity timeout threshold
)

// StartTerminal starts a terminal of the specified type
func (s *Session) StartTerminal(termType TerminalType) error {
	start := time.Now()
	defer func() {
		slog.Info("[Perf] StartTerminal completed",
			"type", termType,
			"duration_ms", time.Since(start).Milliseconds())
	}()

	s.mu.Lock()
	defer s.mu.Unlock()

	termID := fmt.Sprintf("%s-%s", s.ID, termType)
	term, err := terminal.New(termID, s.WorkDir)
	if err != nil {
		return fmt.Errorf("failed to start %s terminal: %w", termType, err)
	}

	switch termType {
	case TerminalTypeAI:
		if s.aiTerminal != nil {
			if err := s.aiTerminal.Close(); err != nil {
				slog.Warn("Failed to close existing AI terminal", "sessionId", s.ID, "error", err)
			}
		}
		s.aiTerminal = term
		// Initialize history buffer for AI terminal
		if s.aiHistory == nil {
			s.aiHistory = terminal.NewHistoryBuffer(historyBufferLines)
		} else {
			s.aiHistory.Clear() // Clear history when terminal is restarted
		}
	case TerminalTypeUser:
		if s.userTerminal != nil {
			if err := s.userTerminal.Close(); err != nil {
				slog.Warn("Failed to close existing user terminal", "sessionId", s.ID, "error", err)
			}
		}
		s.userTerminal = term
		if s.userHistory == nil {
			s.userHistory = terminal.NewHistoryBuffer(historyBufferLines)
		} else {
			s.userHistory.Clear()
		}
	default:
		if err := term.Close(); err != nil {
			slog.Warn("Failed to close terminal for unknown type", "termType", termType, "error", err)
		}
		return fmt.Errorf("unknown terminal type: %s", termType)
	}

	s.IsActive = true
	return nil
}

// GetTerminal returns the terminal of the specified type
func (s *Session) GetTerminal(termType TerminalType) *terminal.Terminal {
	s.mu.RLock()
	defer s.mu.RUnlock()

	switch termType {
	case TerminalTypeAI:
		return s.aiTerminal
	case TerminalTypeUser:
		return s.userTerminal
	default:
		return nil
	}
}

// WriteToTerminal writes data to the specified terminal
func (s *Session) WriteToTerminal(termType TerminalType, data []byte) (int, error) {
	term := s.GetTerminal(termType)
	if term == nil {
		return 0, fmt.Errorf("terminal not started: %s", termType)
	}
	return term.Write(data)
}

// ResizeTerminal resizes the specified terminal
func (s *Session) ResizeTerminal(termType TerminalType, cols, rows int) error {
	term := s.GetTerminal(termType)
	if term == nil {
		return fmt.Errorf("terminal not started: %s", termType)
	}
	return term.Resize(cols, rows)
}

// GetAITerminalStatus returns the AI terminal status
// Returns: "none" if no terminal, "idle" if terminal exists but not running, "running" if terminal is active
func (s *Session) GetAITerminalStatus() string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.aiTerminal == nil {
		return "none"
	}

	if s.aiTerminal.IsClosed() {
		return "none"
	}

	// Check if there was recent activity to determine running status
	if time.Since(s.lastAIActivity) < aiActivityTimeout {
		return "running"
	}

	return "idle"
}

// GetAIHistory returns the AI terminal history buffer
func (s *Session) GetAIHistory() *terminal.HistoryBuffer {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.aiHistory
}

// GetTerminalHistory returns the terminal history buffer for the specified type
func (s *Session) GetTerminalHistory(termType TerminalType) *terminal.HistoryBuffer {
	s.mu.RLock()
	defer s.mu.RUnlock()

	switch termType {
	case TerminalTypeAI:
		return s.aiHistory
	case TerminalTypeUser:
		return s.userHistory
	default:
		return nil
	}
}

// WriteToAIHistory writes data to the AI terminal history buffer
func (s *Session) WriteToAIHistory(data []byte) {
	s.WriteToTerminalHistory(TerminalTypeAI, data)
}

// WriteToTerminalHistory writes data to the specified terminal history buffer
func (s *Session) WriteToTerminalHistory(termType TerminalType, data []byte) {
	if len(data) == 0 {
		return
	}

	s.mu.Lock()
	var history *terminal.HistoryBuffer
	switch termType {
	case TerminalTypeAI:
		s.lastAIActivity = time.Now() // Update activity timestamp for running status detection
		if s.aiHistory == nil {
			s.aiHistory = terminal.NewHistoryBuffer(historyBufferLines)
		}
		history = s.aiHistory
	case TerminalTypeUser:
		if s.userHistory == nil {
			s.userHistory = terminal.NewHistoryBuffer(historyBufferLines)
		}
		history = s.userHistory
	default:
		s.mu.Unlock()
		return
	}
	s.mu.Unlock()

	history.Write(data)
}

// EnsureAIHistoryBuffer ensures the AI history buffer is initialized
// This is useful when the session exists but terminal hasn't been started yet
func (s *Session) EnsureAIHistoryBuffer() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.aiHistory == nil {
		s.aiHistory = terminal.NewHistoryBuffer(historyBufferLines)
	}
}
