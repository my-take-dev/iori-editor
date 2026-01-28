package services

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"iori-editor/internal/session"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// PartialFileContent represents partial file content with truncation info
type PartialFileContent struct {
	Content     string `json:"content"`
	IsTruncated bool   `json:"isTruncated"`
}

// FileService handles all file-related operations
type FileService struct {
	// ctx is the Wails application lifecycle context.
	// This is NOT a per-request context; it's set once during app startup
	// and used for emitting events to the frontend via runtime.EventsEmit().
	ctx            context.Context
	ctxMu          sync.RWMutex
	sessionManager *session.Manager
}

// NewFileService creates a new FileService instance
func NewFileService(sessionManager *session.Manager) *FileService {
	return &FileService{
		sessionManager: sessionManager,
	}
}

// SetContext sets the Wails context for event emission.
// This is called once during app startup by Wails.
func (s *FileService) SetContext(ctx context.Context) {
	s.ctxMu.Lock()
	defer s.ctxMu.Unlock()
	s.ctx = ctx
}

// getContext returns the Wails context in a thread-safe manner
func (s *FileService) getContext() context.Context {
	s.ctxMu.RLock()
	defer s.ctxMu.RUnlock()
	return s.ctx
}

// emitLog emits a log event to the frontend
func (s *FileService) emitLog(level string, message string, details string) {
	runtime.EventsEmit(s.getContext(), "system:log", map[string]interface{}{
		"level":   level,
		"message": message,
		"details": details,
	})
}

// ReadFile reads a file's content
func (s *FileService) ReadFile(sessionID string, relativePath string) (string, error) {
	start := time.Now()
	defer func() {
		slog.Debug("[Perf] Backend.ReadFile", "path", relativePath, "duration", time.Since(start))
	}()

	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return "", err
	}

	return sess.ReadFile(relativePath)
}

// GetFileInfo returns file metadata without reading content
func (s *FileService) GetFileInfo(sessionID string, relativePath string) (session.FileMetadata, error) {
	start := time.Now()
	defer func() {
		slog.Debug("[Perf] Backend.GetFileInfo", "path", relativePath, "duration", time.Since(start))
	}()

	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return session.FileMetadata{}, err
	}

	return sess.GetFileInfo(relativePath)
}

// ReadFilePartial reads only the first maxBytes of a file (for large file preview)
func (s *FileService) ReadFilePartial(sessionID string, relativePath string, maxBytes int64) (PartialFileContent, error) {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return PartialFileContent{}, err
	}

	content, isTruncated, err := sess.ReadFilePartial(relativePath, maxBytes)
	if err != nil {
		return PartialFileContent{}, err
	}

	return PartialFileContent{
		Content:     content,
		IsTruncated: isTruncated,
	}, nil
}

// WriteFile writes content to a file
func (s *FileService) WriteFile(sessionID string, relativePath string, content string) error {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return err
	}

	return sess.WriteFile(relativePath, content)
}

// RenameFile renames a file in the session
func (s *FileService) RenameFile(sessionID string, oldPath string, newPath string) error {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return err
	}

	err = sess.RenameFile(oldPath, newPath)
	if err != nil {
		s.emitLog("error", "名前変更失敗", oldPath+": "+err.Error())
		return err
	}
	s.emitLog("info", "名前変更", oldPath+" -> "+newPath)
	return nil
}

// DeleteFile deletes a file in the session
func (s *FileService) DeleteFile(sessionID string, relativePath string) error {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return err
	}

	err = sess.DeleteFile(relativePath)
	if err != nil {
		s.emitLog("error", "削除失敗", relativePath+": "+err.Error())
		return err
	}
	s.emitLog("warning", "削除", relativePath)
	return nil
}

// GetFileTree returns the file tree for a session
func (s *FileService) GetFileTree(sessionID string) ([]*session.FileNode, error) {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return nil, err
	}

	return sess.GetFileTree()
}

// GetDirectoryChildren returns the children of a specific directory for lazy loading
func (s *FileService) GetDirectoryChildren(sessionID string, path string) ([]*session.FileNode, error) {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return nil, err
	}

	return sess.GetDirectoryChildren(path)
}
