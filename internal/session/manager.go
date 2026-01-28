package session

import (
	"fmt"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	"github.com/google/uuid"
)

// Manager manages multiple sessions
type Manager struct {
	sessions      map[string]*Session
	activeSession string
	mu            sync.RWMutex
}

// NewManager creates a new session manager
func NewManager() *Manager {
	return &Manager{
		sessions: make(map[string]*Session),
	}
}

// CreateSession creates a new session (defaults to desktop client type)
func (m *Manager) CreateSession(name, workDir string) (*Session, error) {
	return m.CreateSessionWithClientType(name, workDir, ClientTypeDesktop)
}

// CreateSessionWithClientType creates a new session with the specified client type
func (m *Manager) CreateSessionWithClientType(name, workDir string, clientType ClientType) (*Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	id := uuid.New().String()
	session := New(id, name, workDir)
	session.ClientType = clientType
	m.sessions[id] = session

	return session, nil
}

// GetSession returns a session by ID
func (m *Manager) GetSession(id string) (*Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	session, ok := m.sessions[id]
	if !ok {
		return nil, fmt.Errorf("session not found: %s", id)
	}
	return session, nil
}

// GetActiveSession returns the currently active session
func (m *Manager) GetActiveSession() *Session {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.activeSession == "" {
		return nil
	}
	return m.sessions[m.activeSession]
}

// SetActiveSession sets the active session
func (m *Manager) SetActiveSession(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.sessions[id]; !ok {
		return fmt.Errorf("session not found: %s", id)
	}
	m.activeSession = id
	return nil
}

// ListSessions returns info for all sessions
func (m *Manager) ListSessions() []SessionInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()

	infos := make([]SessionInfo, 0, len(m.sessions))
	for _, s := range m.sessions {
		info := s.Info()
		info.IsActive = (s.ID == m.activeSession)
		infos = append(infos, info)
	}
	return infos
}

// DeleteSession deletes a session
func (m *Manager) DeleteSession(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	session, ok := m.sessions[id]
	if !ok {
		return fmt.Errorf("session not found: %s", id)
	}

	session.Close()
	delete(m.sessions, id)

	if m.activeSession == id {
		m.activeSession = ""
	}

	return nil
}

// CloseAll closes all sessions
func (m *Manager) CloseAll() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, s := range m.sessions {
		s.Close()
	}
	m.sessions = make(map[string]*Session)
	m.activeSession = ""
}

// normalizePath normalizes a path for comparison
// Converts to absolute path and handles case-insensitivity on Windows
func normalizePath(p string) string {
	abs, err := filepath.Abs(p)
	if err != nil {
		abs = filepath.Clean(p)
	}
	// Windows: case-insensitive comparison
	if runtime.GOOS == "windows" {
		return strings.ToLower(abs)
	}
	return abs
}

// FindSessionByWorkDir finds a session by its work directory path
func (m *Manager) FindSessionByWorkDir(workDir string) *Session {
	m.mu.RLock()
	defer m.mu.RUnlock()

	normalizedWorkDir := normalizePath(workDir)

	for _, s := range m.sessions {
		if normalizePath(s.WorkDir) == normalizedWorkDir {
			return s
		}
	}
	return nil
}

// SessionHasConnections checks if the session for the given work directory has active WebSocket connections
func (m *Manager) SessionHasConnections(workDir string) bool {
	sess := m.FindSessionByWorkDir(workDir)
	if sess == nil {
		return false
	}
	return sess.HasConnections()
}

// GetAIStatusForWorkDir returns the AI terminal status for a specific work directory
// Returns: "none" if no session or terminal, "idle" if terminal exists, "running" if active
func (m *Manager) GetAIStatusForWorkDir(workDir string) string {
	session := m.FindSessionByWorkDir(workDir)
	if session == nil {
		return "none"
	}
	return session.GetAITerminalStatus()
}
