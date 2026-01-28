package git

import "github.com/go-git/go-git/v5"

// FileStatus represents the status of a file in git
type FileStatus string

const (
	StatusModified  FileStatus = "M"
	StatusAdded     FileStatus = "A"
	StatusDeleted   FileStatus = "D"
	StatusRenamed   FileStatus = "R"
	StatusUntracked FileStatus = "?"
)

// FileChange represents a changed file
type FileChange struct {
	Path     string     `json:"path"`
	Status   FileStatus `json:"status"`
	Staged   bool       `json:"staged"`
	Added    int        `json:"added"`
	Removed  int        `json:"removed"`
	Original string     `json:"original,omitempty"`
	Modified string     `json:"modified,omitempty"`
}

// BranchInfo represents branch information
type BranchInfo struct {
	Name      string `json:"name"`
	IsCurrent bool   `json:"isCurrent"`
	IsRemote  bool   `json:"isRemote"`
}

// WorktreeInfo represents information about a git worktree
type WorktreeInfo struct {
	Path       string `json:"path"`
	Branch     string `json:"branch"`
	IsMain     bool   `json:"isMain"`
	IsDetached bool   `json:"isDetached"`
}

// Repository wraps git operations
type Repository struct {
	path string
	repo *git.Repository
}

// BatchResult represents the result of a batch git operation
type BatchResult struct {
	Succeeded []string     `json:"succeeded"`
	Failed    []BatchError `json:"failed"`
}

// BatchError represents an error for a single file in a batch operation
type BatchError struct {
	Path  string `json:"path"`
	Error string `json:"error"`
}
