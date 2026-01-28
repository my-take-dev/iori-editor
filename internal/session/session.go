package session

import (
	"log/slog"
	"sync"
	"time"

	"iori-editor/internal/git"
	"iori-editor/internal/terminal"
	"iori-editor/internal/watcher"
)

// ClientType はセッションを作成したクライアントの種別を表す
type ClientType string

const (
	ClientTypeDesktop ClientType = "desktop"
	ClientTypeBrowser ClientType = "browser"
)

// Session represents a coding session with dual terminals
type Session struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	WorkDir    string     `json:"workDir"`
	CreatedAt  time.Time  `json:"createdAt"`
	IsActive   bool       `json:"isActive"`
	IsGitRepo  bool       `json:"isGitRepo"`
	Branch     string     `json:"branch"`
	ClientType ClientType `json:"clientType"`

	// Worktree-related fields
	IsWorktree       bool     `json:"isWorktree"`
	ParentRepoPath   string   `json:"parentRepoPath"`
	ParentSessionID  string   `json:"parentSessionId"`
	WorktreeSessions []string `json:"worktreeSessions"`

	aiTerminal       *terminal.Terminal
	userTerminal     *terminal.Terminal
	aiHistory        *terminal.HistoryBuffer // AI terminal output history for browser reconnection
	userHistory      *terminal.HistoryBuffer // User terminal output history for local reconnection
	lastAIActivity   time.Time               // Last AI terminal activity timestamp for running status detection
	fileWatcher      *watcher.Watcher
	gitRepo          *git.Repository
	fileEventHandler FileEventHandler
	treeCache        *TreeCache
	mu               sync.RWMutex

	// Connection tracking for WebSocket connections
	connectionCount int
	connMu          sync.RWMutex
}

// SessionInfo is the JSON-safe session info for frontend
type SessionInfo struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	WorkDir    string `json:"workDir"`
	CreatedAt  string `json:"createdAt"`
	IsActive   bool   `json:"isActive"`
	IsGitRepo  bool   `json:"isGitRepo"`
	Branch     string `json:"branch"`
	ClientType string `json:"clientType"`

	// Worktree-related fields
	IsWorktree       bool     `json:"isWorktree"`
	ParentRepoPath   string   `json:"parentRepoPath"`
	ParentSessionID  string   `json:"parentSessionId"`
	WorktreeSessions []string `json:"worktreeSessions"`
}

// New creates a new session
func New(id, name, workDir string) *Session {
	totalStart := time.Now()
	defer func() {
		slog.Info("[Perf] Session.New completed",
			"duration_ms", time.Since(totalStart).Milliseconds(),
			"sessionName", name,
			"workDir", workDir)
	}()

	s := &Session{
		ID:        id,
		Name:      name,
		WorkDir:   workDir,
		CreatedAt: time.Now(),
		IsActive:  false,
		IsGitRepo: false,
		treeCache: NewTreeCache(5 * time.Minute), // Cache tree longer; watcher invalidates on changes.
	}

	// Check if it's a git repository
	gitCheckStart := time.Now()
	isGit := git.IsGitRepository(workDir)
	slog.Info("[Perf] git.IsGitRepository",
		"duration_ms", time.Since(gitCheckStart).Milliseconds(),
		"isGit", isGit)

	if isGit {
		s.IsGitRepo = true

		gitOpenStart := time.Now()
		repo, err := git.Open(workDir)
		slog.Info("[Perf] git.Open",
			"duration_ms", time.Since(gitOpenStart).Milliseconds(),
			"error", err)

		if err == nil {
			s.gitRepo = repo

			branchStart := time.Now()
			branch, err := repo.GetCurrentBranch()
			slog.Info("[Perf] GetCurrentBranch",
				"duration_ms", time.Since(branchStart).Milliseconds(),
				"branch", branch,
				"error", err)

			if err == nil {
				s.Branch = branch
			} else {
				slog.Error("Failed to get branch in session.New()",
					"error", err,
					"sessionName", name,
					"workDir", workDir)
			}
		} else {
			slog.Error("Failed to open git repo in session.New()",
				"error", err,
				"sessionName", name,
				"workDir", workDir)
		}
	}

	return s
}

// Info returns JSON-safe session info
func (s *Session) Info() SessionInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return SessionInfo{
		ID:               s.ID,
		Name:             s.Name,
		WorkDir:          s.WorkDir,
		CreatedAt:        s.CreatedAt.Format(time.RFC3339),
		IsActive:         s.IsActive,
		IsGitRepo:        s.IsGitRepo,
		Branch:           s.Branch,
		ClientType:       string(s.ClientType),
		IsWorktree:       s.IsWorktree,
		ParentRepoPath:   s.ParentRepoPath,
		ParentSessionID:  s.ParentSessionID,
		WorktreeSessions: s.WorktreeSessions,
	}
}

// Close closes all resources in the session
func (s *Session) Close() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.fileWatcher != nil {
		s.fileWatcher.Stop()
		s.fileWatcher = nil
	}

	if s.aiTerminal != nil {
		s.aiTerminal.Close()
		s.aiTerminal = nil
	}
	if s.userTerminal != nil {
		s.userTerminal.Close()
		s.userTerminal = nil
	}
	s.IsActive = false
}

// IncrementConnections increments the WebSocket connection count
func (s *Session) IncrementConnections() {
	s.connMu.Lock()
	defer s.connMu.Unlock()
	s.connectionCount++
}

// DecrementConnections decrements the WebSocket connection count
func (s *Session) DecrementConnections() {
	s.connMu.Lock()
	defer s.connMu.Unlock()
	if s.connectionCount > 0 {
		s.connectionCount--
	}
}

// HasConnections returns true if there are active WebSocket connections
func (s *Session) HasConnections() bool {
	s.connMu.RLock()
	defer s.connMu.RUnlock()
	return s.connectionCount > 0
}
