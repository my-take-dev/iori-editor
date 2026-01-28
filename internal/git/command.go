package git

import (
	"bytes"
	"fmt"
	"log/slog"
	"os/exec"
	"strings"
	"time"

	"iori-editor/internal/validation"
)

// Git command retry settings for handling index.lock conflicts
const (
	maxGitRetries    = 10
	gitRetryInterval = 100 * time.Millisecond
	// Maximum number of concurrent git commands (prevents excessive process spawning)
	maxConcurrentGitCommands = 4
)

// gitSemaphore limits the number of concurrent git command executions
// This prevents performance degradation from spawning too many git processes
var gitSemaphore = make(chan struct{}, maxConcurrentGitCommands)

// acquireGitSemaphore blocks until a slot is available for git execution
func acquireGitSemaphore() {
	gitSemaphore <- struct{}{}
}

// releaseGitSemaphore releases a slot for git execution
func releaseGitSemaphore() {
	<-gitSemaphore
}

// isIndexLockError checks if the error message indicates a git index.lock conflict
func isIndexLockError(errMsg string) bool {
	return strings.Contains(errMsg, "index.lock") ||
		(strings.Contains(errMsg, "Unable to create") && strings.Contains(errMsg, "File exists"))
}

// executeGitCommand is the common implementation for running git commands
// Handles performance logging, semaphore-based concurrency limiting, and retry logic for index.lock conflicts
// Returns raw byte output; callers handle output formatting
func (r *Repository) executeGitCommand(args []string) ([]byte, error) {
	start := time.Now()
	defer func() {
		slog.Info("[Perf] git command completed",
			"args", args,
			"duration_ms", time.Since(start).Milliseconds())
	}()

	// Acquire semaphore slot to limit concurrent git executions
	acquireGitSemaphore()
	defer releaseGitSemaphore()

	var lastErrMsg string

	for attempt := 0; attempt < maxGitRetries; attempt++ {
		cmd := exec.Command("git", args...)
		cmd.Dir = r.path
		hideWindow(cmd) // Hide console window on Windows

		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr

		err := cmd.Run()
		if err == nil {
			return stdout.Bytes(), nil
		}

		errMsg := stderr.String()
		if errMsg == "" {
			errMsg = err.Error()
		}
		lastErrMsg = errMsg

		// Only retry on index.lock errors
		if !isIndexLockError(errMsg) {
			return nil, fmt.Errorf("git %s failed: %s", args[0], strings.TrimSpace(errMsg))
		}

		// Wait before retrying (skip wait on last attempt)
		if attempt < maxGitRetries-1 {
			time.Sleep(gitRetryInterval)
		}
	}

	return nil, fmt.Errorf("git %s failed after %d retries (index.lock conflict): %s", args[0], maxGitRetries, strings.TrimSpace(lastErrMsg))
}

// ValidateBranchName validates that a branch name is safe for git commands
// Uses validation.IsValidBranchName for consistent validation across the codebase.
// Returns error if the name is invalid or could be used for path traversal attacks.
func ValidateBranchName(name string) error {
	if name == "" {
		return fmt.Errorf("branch name cannot be empty")
	}
	if !validation.IsValidBranchName(name) {
		return fmt.Errorf("invalid branch name: %s (must contain only alphanumeric characters, dots, underscores, hyphens, and slashes; cannot start with '.', '-', or '/')", name)
	}
	return nil
}

// ValidateGitURL validates that a URL is safe for git clone
func ValidateGitURL(url string) error {
	if url == "" {
		return fmt.Errorf("URL cannot be empty")
	}
	if strings.HasPrefix(url, "-") {
		return fmt.Errorf("URL cannot start with '-': %s", url)
	}
	// Allow common git URL schemes
	validPrefixes := []string{"http://", "https://", "ssh://", "git://", "git@"}
	hasValidPrefix := false
	for _, prefix := range validPrefixes {
		if strings.HasPrefix(url, prefix) {
			hasValidPrefix = true
			break
		}
	}
	if !hasValidPrefix {
		return fmt.Errorf("URL must start with http://, https://, ssh://, git://, or git@: %s", url)
	}
	return nil
}

// runGitCommand executes a git command in the repository directory
// Returns output with leading/trailing whitespace trimmed
func (r *Repository) runGitCommand(args ...string) (string, error) {
	output, err := r.executeGitCommand(args)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

// runGitCommandRaw executes a git command and returns output without trimming
// Use this for commands where leading/trailing whitespace is significant (e.g., git status --porcelain)
// Only trims trailing newlines, preserves leading spaces
func (r *Repository) runGitCommandRaw(args ...string) (string, error) {
	output, err := r.executeGitCommand(args)
	if err != nil {
		return "", err
	}
	return strings.TrimRight(string(output), "\n\r"), nil
}

// runGitCommandBytes executes a git command and returns raw byte output
// Use this for commands with binary/null-byte output (e.g., git status -z)
func (r *Repository) runGitCommandBytes(args ...string) ([]byte, error) {
	return r.executeGitCommand(args)
}
