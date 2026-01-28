package services

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"sync"
	"time"

	"iori-editor/internal/history"
	"iori-editor/internal/logger"
	"iori-editor/internal/session"
	"iori-editor/internal/watcher"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// GitOption represents the git option for session creation
type GitOption string

const (
	GitOptionCurrent   GitOption = "current"
	GitOptionExisting  GitOption = "existing"
	GitOptionNewBranch GitOption = "newbranch"
	GitOptionWorktree  GitOption = "worktree"
	GitOptionNone      GitOption = "none"
)

// SessionService handles all session-related operations
type SessionService struct {
	// ctx is the Wails application lifecycle context.
	// This is NOT a per-request context; it's set once during app startup
	// and used for emitting events to the frontend via runtime.EventsEmit().
	ctx             context.Context
	ctxMu           sync.RWMutex
	sessionManager  *session.Manager
	historyManager  *history.Manager
	terminalService *TerminalService
	worktreeCloser  WorktreeCloser
}

// NewSessionService creates a new SessionService instance
func NewSessionService(sessionManager *session.Manager, historyManager *history.Manager, terminalService *TerminalService, worktreeCloser WorktreeCloser) *SessionService {
	return &SessionService{
		sessionManager:  sessionManager,
		historyManager:  historyManager,
		terminalService: terminalService,
		worktreeCloser:  worktreeCloser,
	}
}

// SetContext sets the Wails context for event emission.
// This is called once during app startup by Wails.
func (s *SessionService) SetContext(ctx context.Context) {
	s.ctxMu.Lock()
	defer s.ctxMu.Unlock()
	s.ctx = ctx
}

// getContext returns the Wails context in a thread-safe manner
func (s *SessionService) getContext() context.Context {
	s.ctxMu.RLock()
	defer s.ctxMu.RUnlock()
	return s.ctx
}

// emitLog emits a log event to the frontend
func (s *SessionService) emitLog(level string, message string, details string) {
	runtime.EventsEmit(s.getContext(), "system:log", map[string]interface{}{
		"level":   level,
		"message": message,
		"details": details,
	})
}

// setupFileEventHandler sets up the file event handler for a session
func (s *SessionService) setupFileEventHandler(sess *session.Session) {
	sess.SetFileEventHandler(func(sessionID string, events []watcher.FileEvent) {
		if len(events) == 0 {
			return
		}
		eventList := make([]map[string]interface{}, len(events))
		for i, event := range events {
			eventList[i] = map[string]interface{}{
				"path":      event.Path,
				"eventType": string(event.EventType),
				"isDir":     event.IsDir,
			}
		}
		runtime.EventsEmit(s.getContext(), "file:changed", map[string]interface{}{
			"sessionId": sessionID,
			"events":    eventList,
		})
	})
}

// startFileWatcherAsync starts file watcher asynchronously
func (s *SessionService) startFileWatcherAsync(sess *session.Session) {
	go func() {
		defer func() {
			if r := recover(); r != nil {
				logger.Panic(r)
			}
		}()
		if err := sess.StartFileWatcher(); err != nil {
			logger.Error("Failed to start file watcher", err)
		}
	}()
}

// initializeSessionTerminals starts terminals and streaming for a session
func (s *SessionService) initializeSessionTerminals(sess *session.Session) error {
	if err := sess.StartTerminal(session.TerminalTypeAI); err != nil {
		logger.Critical("Failed to start AI terminal", err)
		return fmt.Errorf("failed to start AI terminal: %w", err)
	}
	if err := sess.StartTerminal(session.TerminalTypeUser); err != nil {
		logger.Critical("Failed to start User terminal", err)
		return fmt.Errorf("failed to start User terminal: %w", err)
	}

	go s.terminalService.StreamTerminalOutput(sess.ID, session.TerminalTypeAI)
	go s.terminalService.StreamTerminalOutput(sess.ID, session.TerminalTypeUser)

	if s.historyManager != nil {
		s.historyManager.StartSession(sess.ID, sess.Name, sess.WorkDir)
	}

	return nil
}

// CreateSession creates a new session with dual terminals
func (s *SessionService) CreateSession(name string, workDir string) (session.SessionInfo, error) {
	return s.CreateSessionWithGitOption(name, workDir, string(GitOptionCurrent), "")
}

// CreateSessionWithGitOption creates a new session with specified git option
func (s *SessionService) CreateSessionWithGitOption(name string, workDir string, gitOption string, branchName string) (session.SessionInfo, error) {
	totalStart := time.Now()
	defer func() {
		slog.Info("[Perf] CreateSessionWithGitOption completed",
			"duration_ms", time.Since(totalStart).Milliseconds(),
			"name", name,
			"workDir", workDir)
	}()

	if workDir == "" {
		var err error
		workDir, err = os.Getwd()
		if err != nil {
			return session.SessionInfo{}, fmt.Errorf("failed to get working directory: %w", err)
		}
	}

	createSessionStart := time.Now()
	sess, err := s.sessionManager.CreateSession(name, workDir)
	slog.Info("[Perf] sessionManager.CreateSession",
		"duration_ms", time.Since(createSessionStart).Milliseconds())
	if err != nil {
		return session.SessionInfo{}, fmt.Errorf("failed to create session: %w", err)
	}

	switch GitOption(gitOption) {
	case GitOptionNewBranch:
		if branchName != "" {
			if err := sess.CreateBranch(branchName); err != nil {
				logger.Error(fmt.Sprintf("Failed to create branch %s", branchName), err)
				s.emitLog("error", "ブランチ作成失敗", fmt.Sprintf("%s: %s", branchName, err.Error()))
				// Continue with session creation on current branch
			}
		}
	case GitOptionWorktree:
		slog.Warn("Worktree creation is not yet implemented")
	case GitOptionNone:
		sess.DisableGit()
	case GitOptionCurrent, GitOptionExisting:
		// Use current branch - nothing to do
	}

	s.setupFileEventHandler(sess)
	s.startFileWatcherAsync(sess)

	if err := s.initializeSessionTerminals(sess); err != nil {
		return session.SessionInfo{}, err
	}

	s.sessionManager.SetActiveSession(sess.ID)

	return sess.Info(), nil
}

// GetSessions returns all sessions
func (s *SessionService) GetSessions() []session.SessionInfo {
	return s.sessionManager.ListSessions()
}

// SetActiveSession sets the active session
func (s *SessionService) SetActiveSession(sessionID string) error {
	return s.sessionManager.SetActiveSession(sessionID)
}

// DeleteSession deletes a session
func (s *SessionService) DeleteSession(sessionID string) error {
	sess, err := s.sessionManager.GetSession(sessionID)
	if err != nil {
		return err
	}

	// Close worktree sessions if any
	worktreeSessions := sess.GetWorktreeSessions()
	var cleanupErrors []string
	if len(worktreeSessions) > 0 && s.worktreeCloser == nil {
		logger.Error("Cannot close worktree sessions: worktreeCloser not configured", nil)
		s.emitLog("error", "ワークツリー削除失敗", "worktreeCloserが設定されていません")
	} else {
		for _, wtSessionID := range worktreeSessions {
			if err := s.worktreeCloser.CloseWorktreeSession(wtSessionID); err != nil {
				logger.Error(fmt.Sprintf("Failed to close worktree session %s", wtSessionID), err)
				cleanupErrors = append(cleanupErrors, fmt.Sprintf("%s: %s", wtSessionID, err.Error()))
			}
		}
	}

	// Notify user if worktree cleanup had failures
	if len(cleanupErrors) > 0 {
		s.emitLog("warning", "ワークツリーのクリーンアップに失敗", fmt.Sprintf("%d件の失敗", len(cleanupErrors)))
	}

	err = s.sessionManager.DeleteSession(sessionID)

	if s.historyManager != nil {
		s.historyManager.EndSession(sessionID)
	}

	return err
}
