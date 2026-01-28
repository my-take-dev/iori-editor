package history

import (
	"fmt"
	"path/filepath"
	"sync"
	"time"

	"iori-editor/internal/logger"
)

const (
	// FlushInterval is the interval for periodic flushing of history buffers
	FlushInterval = 30 * time.Second
)

// Manager manages terminal history storage and retrieval
type Manager struct {
	storage        Storage
	activeSessions map[string]*ActiveSession
	mu             sync.RWMutex
	flushTicker    *time.Ticker
	done           chan struct{}
}

// NewManager creates a new history manager with default FileStorage
func NewManager(baseDir string) (*Manager, error) {
	historyDir := filepath.Join(baseDir, "history")
	storage := NewFileStorage(historyDir)
	return NewManagerWithStorage(storage)
}

// NewManagerWithStorage creates a new history manager with custom storage (for testing)
func NewManagerWithStorage(storage Storage) (*Manager, error) {
	if err := storage.EnsureDirectory(); err != nil {
		return nil, err
	}

	m := &Manager{
		storage:        storage,
		activeSessions: make(map[string]*ActiveSession),
		done:           make(chan struct{}),
	}

	m.flushTicker = time.NewTicker(FlushInterval)
	go func() {
		defer func() {
			if r := recover(); r != nil {
				logger.Error("periodicFlush panicked", fmt.Errorf("%v", r))
			}
		}()
		m.periodicFlush()
	}()

	return m, nil
}

// StartSession begins recording history for a session
func (m *Manager) StartSession(sessionID, sessionName, workDir string) error {
	if sessionID == "" {
		return fmt.Errorf("sessionID cannot be empty")
	}
	if workDir == "" {
		return fmt.Errorf("workDir cannot be empty")
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.activeSessions[sessionID]; exists {
		return nil
	}

	startedAt := time.Now()
	basename := GenerateBasename(sessionID, startedAt)
	metaFilePath := BuildMetaPath(m.storage.GetBasePath(), basename)
	dataFilePath := BuildDataPath(m.storage.GetBasePath(), basename)

	dataFile, err := m.storage.OpenDataFile(dataFilePath)
	if err != nil {
		return fmt.Errorf("failed to create data file: %w", err)
	}

	metadata := &HistoryMetadataFile{
		SessionID:   sessionID,
		SessionName: sessionName,
		StartedAt:   startedAt,
		WorkDir:     workDir,
		EntryCount:  0,
	}

	if err := m.storage.WriteMetadata(metaFilePath, metadata); err != nil {
		dataFile.Close()
		return fmt.Errorf("failed to write metadata file: %w", err)
	}

	m.activeSessions[sessionID] = NewActiveSession(metadata, metaFilePath, dataFilePath, dataFile, m.storage)
	return nil
}

// AppendEntry adds an entry to the session's history buffer
func (m *Manager) AppendEntry(sessionID string, terminalType TerminalType, data []byte) {
	m.mu.RLock()
	session, exists := m.activeSessions[sessionID]
	m.mu.RUnlock()

	if !exists {
		logger.Warn(fmt.Sprintf("AppendEntry called for unknown session %s - data discarded", sessionID), nil)
		return
	}

	session.Lock()
	defer session.Unlock()

	session.AddEntry(terminalType, data)

	if session.ShouldFlush() {
		session.FlushEntries()
	}
}

// EndSession finalizes and saves the history for a session
func (m *Manager) EndSession(sessionID string) error {
	m.mu.Lock()
	session, exists := m.activeSessions[sessionID]
	if !exists {
		m.mu.Unlock()
		return nil
	}
	delete(m.activeSessions, sessionID)
	m.mu.Unlock()

	session.Lock()
	defer session.Unlock()

	if err := session.FlushEntries(); err != nil {
		logger.Error(fmt.Sprintf("failed to flush entries on end session %s - data may be lost", sessionID), err)
	}

	session.Metadata.EndedAt = time.Now()
	if err := session.DataFile.Sync(); err != nil {
		logger.Error(fmt.Sprintf("failed to sync data file for session %s", sessionID), err)
	}
	if err := session.DataFile.Close(); err != nil {
		logger.Error(fmt.Sprintf("failed to close data file for session %s", sessionID), err)
	}

	return m.storage.WriteMetadata(session.MetaFilePath, session.Metadata)
}

// GetActiveSessionFilename returns the expected filename for an active session
func (m *Manager) GetActiveSessionFilename(sessionID string) string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	session, exists := m.activeSessions[sessionID]
	if !exists {
		return ""
	}

	return GenerateFilename(sessionID, session.Metadata.StartedAt)
}

// IsActiveSession checks if a filename belongs to an active session
func (m *Manager) IsActiveSession(filename string) (bool, string) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for sessionID, session := range m.activeSessions {
		expectedFilename := GenerateFilename(sessionID, session.Metadata.StartedAt)
		if filename == expectedFilename {
			return true, sessionID
		}
	}

	return false, ""
}

// FlushActiveSessionForFile flushes buffered entries if the filename belongs to an active session.
func (m *Manager) FlushActiveSessionForFile(filename string, currentSessionID string) error {
	sessionID := m.resolveActiveSessionID(filename, currentSessionID)
	if sessionID == "" {
		return nil
	}

	return m.FlushSession(sessionID)
}

func (m *Manager) resolveActiveSessionID(filename string, currentSessionID string) string {
	if currentSessionID != "" {
		m.mu.RLock()
		session, exists := m.activeSessions[currentSessionID]
		m.mu.RUnlock()

		if exists {
			expectedFilename := GenerateFilename(currentSessionID, session.Metadata.StartedAt)
			if filename == expectedFilename {
				return currentSessionID
			}
		}
	}

	if isActive, sessionID := m.IsActiveSession(filename); isActive {
		return sessionID
	}

	return ""
}

// GetStorage returns the storage instance for direct access
func (m *Manager) GetStorage() Storage {
	return m.storage
}

// Close stops the manager and saves all histories
func (m *Manager) Close() error {
	close(m.done)
	m.flushTicker.Stop()

	m.mu.Lock()
	sessionIDs := make([]string, 0, len(m.activeSessions))
	for sessionID := range m.activeSessions {
		sessionIDs = append(sessionIDs, sessionID)
	}
	m.mu.Unlock()

	var firstErr error
	for _, sessionID := range sessionIDs {
		if err := m.EndSession(sessionID); err != nil {
			logger.Error(fmt.Sprintf("failed to end session %s during close", sessionID), err)
			if firstErr == nil {
				firstErr = err
			}
		}
	}

	return firstErr
}
