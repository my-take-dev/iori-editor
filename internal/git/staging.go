package git

import (
	"fmt"
	"log/slog"
	"strings"
)

// StageFile stages a file (git add)
// Uses system git command for consistency with GetChanges
func (r *Repository) StageFile(path string) error {
	_, err := r.runGitCommand("add", "--", path)
	if err != nil {
		return fmt.Errorf("failed to stage file: %w", err)
	}
	return nil
}

// UnstageFile unstages a file
// Uses system git command for consistency with GetChanges
func (r *Repository) UnstageFile(path string) error {
	_, err := r.runGitCommand("restore", "--staged", "--", path)
	if err != nil {
		// Fallback to reset for older git versions or initial commits
		slog.Debug("UnstageFile: restore --staged failed, trying reset fallback", "path", path, "error", err)
		_, resetErr := r.runGitCommand("reset", "HEAD", "--", path)
		if resetErr != nil {
			return fmt.Errorf("failed to unstage file (restore: %v, reset: %w)", err, resetErr)
		}
	}
	return nil
}

// RestoreFile restores a file to its HEAD state (git restore)
// Uses system git command for consistency
func (r *Repository) RestoreFile(path string) error {
	_, err := r.runGitCommand("restore", "--", path)
	if err != nil {
		// Fallback to checkout for older git versions
		slog.Debug("RestoreFile: restore failed, trying checkout fallback", "path", path, "error", err)
		_, checkoutErr := r.runGitCommand("checkout", "--", path)
		if checkoutErr != nil {
			return fmt.Errorf("failed to restore file (restore: %v, checkout: %w)", err, checkoutErr)
		}
	}
	return nil
}

// FileOperation represents a single file operation function
type FileOperation func(path string) error

// runBatchOperation is the common logic for batch file operations
func (r *Repository) runBatchOperation(
	paths []string,
	batchArgs []string,
	singleOp FileOperation,
	operationName string,
) (BatchResult, error) {
	if len(paths) == 0 {
		return BatchResult{}, nil
	}

	// Validate all paths (security check - prevent option injection)
	for _, path := range paths {
		if strings.HasPrefix(path, "-") {
			return BatchResult{}, fmt.Errorf("invalid path (starts with -): %s", path)
		}
	}

	// Build command: batchArgs + paths
	args := append(batchArgs, paths...)
	_, err := r.runGitCommand(args...)
	if err != nil {
		// Fallback: try individual operations and collect results
		slog.Debug(operationName+": batch operation failed, trying individual operations", "error", err)
		return r.processFilesIndividually(paths, singleOp), nil
	}

	return BatchResult{Succeeded: paths}, nil
}

// processFilesIndividually processes files one by one, collecting successes and failures
func (r *Repository) processFilesIndividually(paths []string, singleOp FileOperation) BatchResult {
	result := BatchResult{
		Succeeded: make([]string, 0, len(paths)),
		Failed:    make([]BatchError, 0),
	}

	for _, path := range paths {
		err := singleOp(path)
		if err != nil {
			result.Failed = append(result.Failed, BatchError{
				Path:  path,
				Error: err.Error(),
			})
		} else {
			result.Succeeded = append(result.Succeeded, path)
		}
	}

	return result
}

// StageFiles stages multiple files at once (git add -- path1 path2 ...)
// Falls back to individual operations if batch command fails
func (r *Repository) StageFiles(paths []string) (BatchResult, error) {
	return r.runBatchOperation(paths, []string{"add", "--"}, r.StageFile, "StageFiles")
}

// UnstageFiles unstages multiple files at once (git restore --staged -- path1 path2 ...)
// Falls back to individual operations if batch command fails
func (r *Repository) UnstageFiles(paths []string) (BatchResult, error) {
	return r.runBatchOperation(paths, []string{"restore", "--staged", "--"}, r.UnstageFile, "UnstageFiles")
}

// RestoreFiles restores multiple files at once (git restore -- path1 path2 ...)
// Falls back to individual operations if batch command fails
func (r *Repository) RestoreFiles(paths []string) (BatchResult, error) {
	return r.runBatchOperation(paths, []string{"restore", "--"}, r.RestoreFile, "RestoreFiles")
}
