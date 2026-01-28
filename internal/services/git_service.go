package services

import (
	"context"
	"sync"

	"iori-editor/internal/session"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// GitService handles all git-related operations
type GitService struct {
	// ctx is the Wails application lifecycle context.
	// This is NOT a per-request context; it's set once during app startup
	// and used for emitting events to the frontend via runtime.EventsEmit().
	ctx            context.Context
	ctxMu          sync.RWMutex
	sessionManager *session.Manager
}

// NewGitService creates a new GitService instance
func NewGitService(sessionManager *session.Manager) *GitService {
	return &GitService{
		sessionManager: sessionManager,
	}
}

// SetContext sets the Wails context for event emission.
// This is called once during app startup by Wails.
func (s *GitService) SetContext(ctx context.Context) {
	s.ctxMu.Lock()
	defer s.ctxMu.Unlock()
	s.ctx = ctx
}

// getContext returns the Wails context in a thread-safe manner
func (s *GitService) getContext() context.Context {
	s.ctxMu.RLock()
	defer s.ctxMu.RUnlock()
	return s.ctx
}

// emitLog emits a log event to the frontend
func (s *GitService) emitLog(level string, message string, details string) {
	runtime.EventsEmit(s.getContext(), "system:log", map[string]interface{}{
		"level":   level,
		"message": message,
		"details": details,
	})
}

// withSession executes a function with the session, handling session retrieval
func (s *GitService) withSession(sessionID string, fn func(*session.Session) error) error {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return err
	}
	return fn(sess)
}

// withSessionLog executes a function with the session, handling session retrieval and logging
func (s *GitService) withSessionLog(sessionID, action string, fn func(*session.Session) error) error {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		s.emitLog("error", action+"失敗", err.Error())
		return err
	}

	s.emitLog("info", action+"中...", "")
	if err := fn(sess); err != nil {
		s.emitLog("error", action+"失敗", err.Error())
		return err
	}
	s.emitLog("success", action+"完了", "")
	return nil
}
