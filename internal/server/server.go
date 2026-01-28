package server

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"sync"
	"time"

	"iori-editor/internal/server/broadcast"
	"iori-editor/internal/server/handlers"
	"iori-editor/internal/server/middleware"
	"iori-editor/internal/services"
	"iori-editor/internal/session"
)

// Server manages the embedded HTTP server for mobile access
type Server struct {
	config          *Config
	httpServer      *http.Server
	sessionManager  *session.Manager
	terminalService *services.TerminalService
	worktreeService *services.WorktreeService
	fileService     *services.FileService
	gitService      *services.GitService

	// Handler components
	hub           *broadcast.Hub
	wsHandler     *handlers.WebSocketHandler
	apiHandler    *handlers.APIHandler
	viewHandler   *handlers.ViewHandler
	authHandler   *handlers.AuthHandler
	staticHandler *handlers.StaticHandler

	// Authentication service
	authService *services.AuthService

	ctx         context.Context
	cancel      context.CancelFunc
	mu          sync.RWMutex
	running     bool
	err         error
	pullWarning string // Warning message from base branch pull
}

// New creates a new Server instance
func New(
	sessionMgr *session.Manager,
	terminalSvc *services.TerminalService,
	worktreeSvc *services.WorktreeService,
	fileSvc *services.FileService,
	gitSvc *services.GitService,
) *Server {
	hub := broadcast.NewHub()
	wsHandler := handlers.NewWebSocketHandler(hub, sessionMgr)

	return &Server{
		config:          DefaultConfig(),
		sessionManager:  sessionMgr,
		terminalService: terminalSvc,
		worktreeService: worktreeSvc,
		fileService:     fileSvc,
		gitService:      gitSvc,
		hub:             hub,
		wsHandler:       wsHandler,
		authService:     services.NewAuthService(),
	}
}

// Start starts the HTTP server with the given configuration
func (s *Server) Start(config *Config) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.running {
		return fmt.Errorf("start server: server is already running")
	}

	// Validate configuration
	if err := config.Validate(); err != nil {
		return fmt.Errorf("validate server config: %w", err)
	}

	s.config = config

	// Pull base branch before starting server
	s.pullWarning = PullBaseBranch(config)

	s.ctx, s.cancel = context.WithCancel(context.Background())

	// Set WebSocket handler context for graceful shutdown
	s.wsHandler.SetContext(s.ctx)

	// Warn if starting without password authentication
	if config.Password == "" {
		slog.Warn("Server starting without password authentication - any device on the local network can access")
	}

	// Initialize all handlers
	s.initializeHandlers(config)

	// Set up WebSocket authentication
	s.setupAuthValidator(config)

	// Start background services
	s.startBackgroundServices()

	// Start HTTP server and wait for it to be ready
	return s.listenAndServe(config)
}

// initializeHandlers creates and configures all HTTP handlers
func (s *Server) initializeHandlers(config *Config) {
	// Create API handler with config values
	s.apiHandler = handlers.NewAPIHandler(
		s.worktreeService,
		s.gitService,
		s.fileService,
		s.sessionManager,
		config.RepoPath,
		config.BaseBranch,
	)

	// Create view handler
	s.viewHandler = handlers.NewViewHandler(GetServerAssets(), &handlers.ViewConfig{
		RepoPath:    config.RepoPath,
		BaseBranch:  config.BaseBranch,
		HasPassword: config.Password != "",
		SessionID:   config.SessionID,
	})

	// Create auth handler using AuthService
	s.authHandler = handlers.NewAuthHandler(
		&handlers.AuthConfig{Password: config.Password},
		s.authService, // AuthService implements RateLimiter
		s.authService, // AuthService implements TokenGenerator
	)

	// Create static handler
	s.staticHandler = handlers.NewStaticHandler(GetServerAssets())
}

// setupAuthValidator configures WebSocket authentication based on server configuration
func (s *Server) setupAuthValidator(config *Config) {
	// Always configure an auth validator to ensure explicit security decisions
	if config.Password != "" {
		// Password-based authentication
		s.wsHandler.SetAuthValidator(PasswordAuthValidator(s.authService))
	} else {
		// No password configured - allow connections with logging
		s.wsHandler.SetAuthValidator(NoAuthValidator())
	}
}

// startBackgroundServices starts WebSocket hub and other background goroutines
func (s *Server) startBackgroundServices() {
	// Start WebSocket hub
	go s.hub.Run(s.ctx)
}

// listenAndServe creates and starts the HTTP server
func (s *Server) listenAndServe(config *Config) error {
	// Create router
	router := s.setupRouter()

	// Create listener first to verify port is available
	listener, err := net.Listen("tcp", config.Address())
	if err != nil {
		return fmt.Errorf("start server: failed to bind to %s: %w", config.Address(), err)
	}

	// Create HTTP server
	s.httpServer = &http.Server{
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Channel to report startup errors
	startErrChan := make(chan error, 1)

	// Start server in goroutine
	go func() {
		slog.Info("Starting server", "address", config.Address())
		if err := s.httpServer.Serve(listener); err != nil && err != http.ErrServerClosed {
			s.mu.Lock()
			s.err = err
			s.running = false
			s.mu.Unlock()
			slog.Error("Server error", "error", err)
			// Non-blocking send to report error if anyone is still listening
			select {
			case startErrChan <- err:
			default:
				// No one is listening - this means the initial startup succeeded but
				// the server failed afterward. Error is already stored in s.err and logged.
				slog.Warn("Server failed after startup check completed, error stored for later retrieval", "error", err)
			}
		}
	}()

	// Brief delay to catch immediate startup failures
	select {
	case err := <-startErrChan:
		return fmt.Errorf("start server: %w", err)
	case <-time.After(50 * time.Millisecond):
		// Server started successfully
	}

	s.running = true
	s.err = nil
	return nil
}

// Stop stops the HTTP server gracefully
func (s *Server) Stop() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.running {
		return fmt.Errorf("stop server: server is not running")
	}

	// Stop all WebSocket streams before cancelling context
	if s.wsHandler != nil {
		s.wsHandler.StopAllStreams()
	}

	// Cancel context to stop background operations
	if s.cancel != nil {
		s.cancel()
	}

	// Graceful shutdown with timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	err := s.httpServer.Shutdown(shutdownCtx)

	// Always mark as not running, even if shutdown fails
	// This prevents inconsistent state where running=true but server is partially shut down
	s.running = false

	// Reset authentication state (session token and login attempts)
	s.authService.Reset()

	if err != nil {
		slog.Error("Server shutdown error", "error", err)
		return fmt.Errorf("shutdown server: %w", err)
	}

	slog.Info("Server stopped")
	return nil
}

// IsRunning returns true if the server is running
func (s *Server) IsRunning() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.running
}

// GetStatus returns the current server status
func (s *Server) GetStatus() ServerStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()

	status := ServerStatus{
		Running:   s.running,
		IP:        s.config.IP,
		Port:      s.config.Port,
		SessionID: s.config.SessionID,
	}

	if s.running {
		// Get the actual URL
		if s.config.IP != "" {
			status.URL = s.config.URL(s.config.IP)
			// Check if configured IP is localhost-only
			if IsLocalhostOnly([]string{s.config.IP}) {
				status.Warning = "外部IPアドレスが見つかりません。モバイル/タブレットからのアクセスができない可能性があります。"
			}
		} else {
			// Try to get the first local IP
			ips, err := GetLocalIPAddresses()
			if err == nil && len(ips) > 0 {
				status.URL = s.config.URL(ips[0])
				// Set warning if only localhost is available
				if IsLocalhostOnly(ips) {
					status.Warning = "外部IPアドレスが見つかりません。モバイル/タブレットからのアクセスができない可能性があります。"
				}
			}
		}

		// Add pull warning if present
		if s.pullWarning != "" {
			if status.Warning != "" {
				status.Warning = status.Warning + " / " + s.pullWarning
			} else {
				status.Warning = s.pullWarning
			}
		}
	}

	if s.err != nil {
		status.Error = s.err.Error()
	}

	return status
}

// GetConfig returns a copy of the current configuration
// SECURITY: Password is never returned to prevent exposure via Wails binding.
// Use HasPassword field to check if password authentication is enabled.
func (s *Server) GetConfig() *Config {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Return a copy to prevent external modification
	// SECURITY: Never expose the actual password
	return &Config{
		IP:          s.config.IP,
		Port:        s.config.Port,
		BaseBranch:  s.config.BaseBranch,
		SessionID:   s.config.SessionID,
		Password:    "", // Never expose password
		RepoPath:    s.config.RepoPath,
		HasPassword: s.config.Password != "", // Indicate if password is set
	}
}

// setupRouter creates the HTTP router with all routes
func (s *Server) setupRouter() http.Handler {
	mux := http.NewServeMux()

	// Wrap with middleware
	var handler http.Handler = mux

	// Auth middleware (if password is set)
	if s.config.Password != "" {
		handler = middleware.AuthMiddleware(s.authService)(handler)
	}

	// CORS middleware for local network access
	handler = middleware.CORSMiddleware(handler)

	// No-cache middleware to prevent browser caching
	handler = middleware.NoCacheMiddleware(handler)

	// Register routes
	s.registerRoutes(mux)

	return handler
}

// registerRoutes sets up all HTTP routes
func (s *Server) registerRoutes(mux *http.ServeMux) {
	// Register all routes from router.go
	s.RegisterAllRoutes(mux)
}
