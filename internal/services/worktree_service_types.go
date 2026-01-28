package services

// WorktreeInfo represents worktree information for frontend
type WorktreeInfo struct {
	Path       string `json:"path"`
	Branch     string `json:"branch"`
	IsMain     bool   `json:"isMain"`
	IsDetached bool   `json:"isDetached"`
	IsOpened   bool   `json:"isOpened"`
}

// ServerWorktreeConfig holds configuration for server-mode worktree operations
type ServerWorktreeConfig struct {
	RepoPath        string // Path to the main repository
	BaseBranch      string // Default base branch for new worktrees
	WorktreesSubdir string // Subdirectory name (e.g., "server")
}

// WorktreeDetail represents detailed worktree information for API response
type WorktreeDetail struct {
	Branch                 string   `json:"branch"`
	Path                   string   `json:"path"`
	IsMain                 bool     `json:"isMain"`
	IsDetached             bool     `json:"isDetached"`
	CommitHash             string   `json:"commitHash,omitempty"`
	CommitTime             string   `json:"commitTime,omitempty"`
	Ahead                  int      `json:"ahead"`
	Behind                 int      `json:"behind"`
	Dirty                  bool     `json:"dirty"`
	AIStatus               string   `json:"aiStatus"`
	AheadBehindUnavailable bool     `json:"aheadBehindUnavailable,omitempty"`
	DirtyStateUnavailable  bool     `json:"dirtyStateUnavailable,omitempty"`
	CommitInfoUnavailable  bool     `json:"commitInfoUnavailable,omitempty"`
	Warnings               []string `json:"warnings,omitempty"`
}

// ListWorktreesResult represents the result of listing worktrees
type ListWorktreesResult struct {
	Worktrees    []WorktreeDetail `json:"worktrees"`
	PruneWarning string           `json:"pruneWarning,omitempty"`
}

// CreateWorktreeParams holds parameters for creating a worktree
type CreateWorktreeParams struct {
	BaseBranch string `json:"baseBranch"` // Base branch for new worktree (used with CreateNew=true)
	CustomName string `json:"customName"` // Custom name for the branch (used with CreateNew=true)
	Branch     string `json:"branch"`     // Existing branch name (used with CreateNew=false)
	CreateNew  bool   `json:"createNew"`
}

// CreateWorktreeResult represents the result of worktree creation
type CreateWorktreeResult struct {
	Branch      string `json:"branch"`
	Path        string `json:"path"`
	PullWarning string `json:"pullWarning,omitempty"`
}

// DeleteWorktreeParams holds parameters for deleting a worktree
type DeleteWorktreeParams struct {
	Branch       string `json:"branch"`
	Force        bool   `json:"force"`
	DeleteBranch bool   `json:"deleteBranch"`
}

// DeleteWorktreeResult represents the result of worktree deletion
type DeleteWorktreeResult struct {
	Branch            string `json:"branch"`
	WorktreeRemoved   bool   `json:"worktreeRemoved"`
	BranchDeleted     bool   `json:"branchDeleted,omitempty"`
	BranchDeleteError string `json:"branchDeleteError,omitempty"`
	PartialSuccess    bool   `json:"partialSuccess,omitempty"`
}

// WorktreeSessionResult represents the result of getting or creating a worktree session
type WorktreeSessionResult struct {
	SessionID      string `json:"sessionId"`
	Branch         string `json:"branch"`
	Path           string `json:"path"`
	TerminalStatus string `json:"terminalStatus"`
}
