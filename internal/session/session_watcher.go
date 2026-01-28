package session

import (
	"fmt"
	"log/slog"
	"path/filepath"
	"strings"
	"time"

	"iori-editor/internal/watcher"
)

// FileEventHandler is called when file changes are detected (batch processing)
type FileEventHandler func(sessionID string, events []watcher.FileEvent)

// SetFileEventHandler sets the handler for file change events
func (s *Session) SetFileEventHandler(handler FileEventHandler) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.fileEventHandler = handler
}

// StartFileWatcher starts watching for file changes
func (s *Session) StartFileWatcher() error {
	s.mu.Lock()
	if s.fileWatcher != nil {
		s.mu.Unlock()
		return nil // Already started
	}
	workDir := s.WorkDir
	sessionID := s.ID
	treeCache := s.treeCache
	s.mu.Unlock()

	w, err := watcher.New(workDir, func(events []watcher.FileEvent) {
		// Invalidate tree cache for affected directories
		for _, event := range events {
			// Get relative path from work directory
			relPath := event.Path
			if strings.HasPrefix(relPath, workDir) {
				relPath = strings.TrimPrefix(relPath, workDir)
				relPath = strings.TrimPrefix(relPath, "/")
				relPath = strings.TrimPrefix(relPath, "\\")
			}
			// Invalidate the parent directory cache
			parentDir := filepath.Dir(relPath)
			if parentDir == "." {
				parentDir = ""
			}
			treeCache.Invalidate(parentDir)
		}

		s.mu.RLock()
		handler := s.fileEventHandler
		s.mu.RUnlock()

		if handler != nil {
			handler(sessionID, events)
		}
	})
	if err != nil {
		return fmt.Errorf("StartFileWatcher: failed to create file watcher: %w", err)
	}

	if err := w.Start(); err != nil {
		return fmt.Errorf("StartFileWatcher: failed to start file watcher: %w", err)
	}

	s.mu.Lock()
	s.fileWatcher = w
	s.mu.Unlock()

	// Monitor watcher initialization in background
	go func() {
		if err := w.WaitReady(30 * time.Second); err != nil {
			slog.Warn("session: file watcher initialization issue",
				"sessionID", sessionID,
				"error", err)
		} else {
			slog.Debug("session: file watcher ready",
				"sessionID", sessionID,
				"workDir", workDir)
		}
	}()

	return nil
}

// StopFileWatcher stops the file watcher
func (s *Session) StopFileWatcher() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.fileWatcher != nil {
		s.fileWatcher.Stop()
		s.fileWatcher = nil
	}
}
