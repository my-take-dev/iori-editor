package history

import (
	"fmt"

	"iori-editor/internal/logger"
)

// periodicFlush flushes all dirty sessions periodically
func (m *Manager) periodicFlush() {
	for {
		select {
		case <-m.flushTicker.C:
			m.FlushAll()
		case <-m.done:
			return
		}
	}
}

// FlushSession saves the current state of a session to disk
func (m *Manager) FlushSession(sessionID string) error {
	m.mu.RLock()
	session, exists := m.activeSessions[sessionID]
	m.mu.RUnlock()

	if !exists {
		return nil
	}

	session.Lock()
	defer session.Unlock()

	if !session.IsDirty {
		return nil
	}

	if err := session.FlushEntries(); err != nil {
		return err
	}

	if err := session.DataFile.Sync(); err != nil {
		return fmt.Errorf("failed to sync data file: %w", err)
	}

	if err := m.storage.WriteMetadata(session.MetaFilePath, session.Metadata); err != nil {
		return err
	}

	session.IsDirty = false
	return nil
}

// FlushAll saves all dirty sessions to disk
func (m *Manager) FlushAll() {
	m.mu.RLock()
	sessionIDs := make([]string, 0)
	for id, session := range m.activeSessions {
		if session.IsDirty {
			sessionIDs = append(sessionIDs, id)
		}
	}
	m.mu.RUnlock()

	for _, sessionID := range sessionIDs {
		if err := m.FlushSession(sessionID); err != nil {
			logger.Error(fmt.Sprintf("failed to flush history for session %s", sessionID), err)
		}
	}
}
