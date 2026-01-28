package services

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"iori-editor/internal/git"
	"iori-editor/internal/history"
	"iori-editor/internal/logger"
	"iori-editor/internal/session"
	"iori-editor/internal/watcher"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	// PruneInterval is the minimum interval between prune operations
	PruneInterval = 5 * time.Minute
)

// WorktreeCloser はワークツリーセッションを閉じる機能を提供するインターフェース
// SessionService からの依存を疎結合にするために使用
type WorktreeCloser interface {
	CloseWorktreeSession(sessionID string) error
}

// WorktreeService handles all worktree-related operations
type WorktreeService struct {
	// ctx is the Wails application lifecycle context.
	// This is NOT a per-request context; it's set once during app startup
	// and used for emitting events to the frontend via runtime.EventsEmit().
	ctx             context.Context
	ctxMu           sync.RWMutex
	sessionManager  *session.Manager
	historyManager  *history.Manager
	terminalService *TerminalService

	// pruneLastRun tracks the last prune execution time per repository
	pruneLastRun   map[string]time.Time
	pruneLastRunMu sync.RWMutex
}

// cleanupStack manages rollback operations for worktree creation
type cleanupStack struct {
	cleanups []func()
}

func (c *cleanupStack) push(fn func()) {
	c.cleanups = append(c.cleanups, fn)
}

func (c *cleanupStack) rollback() {
	for i := len(c.cleanups) - 1; i >= 0; i-- {
		c.cleanups[i]()
	}
}

func (c *cleanupStack) clear() {
	c.cleanups = nil
}

// NewWorktreeService creates a new WorktreeService instance
func NewWorktreeService(sessionManager *session.Manager, historyManager *history.Manager, terminalService *TerminalService) *WorktreeService {
	return &WorktreeService{
		sessionManager:  sessionManager,
		historyManager:  historyManager,
		terminalService: terminalService,
		pruneLastRun:    make(map[string]time.Time),
	}
}

// SetContext sets the Wails context for event emission.
// This is called once during app startup by Wails.
func (s *WorktreeService) SetContext(ctx context.Context) {
	s.ctxMu.Lock()
	defer s.ctxMu.Unlock()
	s.ctx = ctx
}

// getContext returns the Wails context in a thread-safe manner
func (s *WorktreeService) getContext() context.Context {
	s.ctxMu.RLock()
	defer s.ctxMu.RUnlock()
	return s.ctx
}

// emitLog emits a log event to the frontend
func (s *WorktreeService) emitLog(level string, message string, details string) {
	runtime.EventsEmit(s.getContext(), "system:log", map[string]interface{}{
		"level":   level,
		"message": message,
		"details": details,
	})
}

// setupFileEventHandler sets up the file event handler for a session
func (s *WorktreeService) setupFileEventHandler(sess *session.Session) {
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
func (s *WorktreeService) startFileWatcherAsync(sess *session.Session) {
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

// TriggerPruneIfNeeded triggers an asynchronous prune operation if enough time has passed
// since the last prune for the given repository. This is non-blocking and returns immediately.
func (s *WorktreeService) TriggerPruneIfNeeded(repoPath string) {
	if !s.shouldPrune(repoPath) {
		return
	}

	go func() {
		defer func() {
			if r := recover(); r != nil {
				logger.Panic(r)
			}
		}()

		repo, err := git.Open(repoPath)
		if err != nil {
			logger.Warn("Failed to open repository for prune", err)
			return
		}

		if err := repo.PruneWorktrees(); err != nil {
			logger.Warn("Failed to prune worktrees", err)
			return
		}

		s.recordPruneTime(repoPath)
		slog.Info("Worktree prune completed asynchronously", "repoPath", repoPath)
	}()
}

// shouldPrune checks if a prune operation should be triggered for the given repository.
// Returns true if enough time has passed since the last prune.
func (s *WorktreeService) shouldPrune(repoPath string) bool {
	s.pruneLastRunMu.RLock()
	lastRun, exists := s.pruneLastRun[repoPath]
	s.pruneLastRunMu.RUnlock()

	if !exists {
		return true
	}
	return time.Since(lastRun) >= PruneInterval
}

// recordPruneTime records the current time as the last prune time for the given repository.
func (s *WorktreeService) recordPruneTime(repoPath string) {
	s.pruneLastRunMu.Lock()
	defer s.pruneLastRunMu.Unlock()
	s.pruneLastRun[repoPath] = time.Now()
}
