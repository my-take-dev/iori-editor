package main

import (
	"context"
	"sync"

	"iori-editor/internal/history"
	"iori-editor/internal/server"
	"iori-editor/internal/services"
	"iori-editor/internal/session"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct holds the application state and services
type App struct {
	ctx            context.Context
	sessionManager *session.Manager
	historyManager *history.Manager
	execDir        string
	mu             sync.RWMutex

	// Services
	gitService      *services.GitService
	terminalService *services.TerminalService
	fileService     *services.FileService
	sessionService  *services.SessionService
	worktreeService *services.WorktreeService
	historyService  *services.HistoryService

	// Server mode
	server *server.Server
}

// NewApp creates a new App instance with all services initialized
func NewApp() *App {
	execDir, historyMgr := initializeApp()
	sessionMgr := session.NewManager()

	// Create services with dependencies
	gitService := services.NewGitService(sessionMgr)
	terminalService := services.NewTerminalService(sessionMgr, historyMgr)
	fileService := services.NewFileService(sessionMgr)
	historyService := services.NewHistoryService(historyMgr)

	// Create worktree service first, then session service (dependency injection)
	worktreeService := services.NewWorktreeService(sessionMgr, historyMgr, terminalService)
	sessionService := services.NewSessionService(sessionMgr, historyMgr, terminalService, worktreeService)

	return &App{
		sessionManager:  sessionMgr,
		historyManager:  historyMgr,
		execDir:         execDir,
		gitService:      gitService,
		terminalService: terminalService,
		fileService:     fileService,
		sessionService:  sessionService,
		worktreeService: worktreeService,
		historyService:  historyService,
	}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Set context for all services
	a.gitService.SetContext(ctx)
	a.terminalService.SetContext(ctx)
	a.fileService.SetContext(ctx)
	a.sessionService.SetContext(ctx)
	a.worktreeService.SetContext(ctx)
	a.historyService.SetContext(ctx)
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {
	// Stop server if running
	// Get server reference under lock, then release lock before calling Stop()
	// to avoid deadlock (Stop() also acquires its own mutex)
	a.mu.Lock()
	srv := a.server
	a.mu.Unlock()

	if srv != nil && srv.IsRunning() {
		if err := srv.Stop(); err != nil {
			a.emitLog("error", "Failed to stop server during shutdown", err.Error())
		}
	}

	if a.historyManager != nil {
		a.historyManager.Close()
	}
	a.sessionManager.CloseAll()
}

// emitLog emits a log event to the frontend
func (a *App) emitLog(level string, message string, details string) {
	runtime.EventsEmit(a.ctx, "system:log", map[string]interface{}{
		"level":   level,
		"message": message,
		"details": details,
	})
}

// GitOption represents the git option for session creation (re-exported for Wails binding)
type GitOption = services.GitOption

const (
	GitOptionCurrent   = services.GitOptionCurrent
	GitOptionExisting  = services.GitOptionExisting
	GitOptionNewBranch = services.GitOptionNewBranch
	GitOptionWorktree  = services.GitOptionWorktree
	GitOptionNone      = services.GitOptionNone
)
