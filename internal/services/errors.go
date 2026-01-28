package services

import "errors"

// Sentinel errors for service layer operations.
// These errors can be checked with errors.Is() and wrapped with fmt.Errorf("%w", err).
var (
	ErrWorktreeNotFound      = errors.New("worktree not found")
	ErrCannotDeleteMain      = errors.New("cannot delete main worktree")
	ErrUncommittedChanges    = errors.New("worktree has uncommitted changes")
	ErrPathTraversal         = errors.New("path traversal detected")
	ErrBranchRequired        = errors.New("branch name is required")
	ErrInvalidBranchName     = errors.New("invalid branch name")
	ErrFetchFailed           = errors.New("fetch failed")
	ErrRepositoryNotFound    = errors.New("repository not found")
	ErrWorktreeAlreadyOpened = errors.New("worktree is already opened by another client")
)

// WorktreeAlreadyOpenedError contains the client type that has the worktree open
type WorktreeAlreadyOpenedError struct {
	ClientType string
}

func (e *WorktreeAlreadyOpenedError) Error() string {
	return "このワークツリーは既に" + e.ClientType + "で開かれています"
}

func (e *WorktreeAlreadyOpenedError) Is(target error) bool {
	return target == ErrWorktreeAlreadyOpened
}
