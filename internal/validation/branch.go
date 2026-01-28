package validation

import (
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// BranchNameRegex validates git branch names (prevents shell injection and invalid names)
// Allowed characters: alphanumeric, dots, underscores, hyphens, and slashes
var BranchNameRegex = regexp.MustCompile(`^[a-zA-Z0-9._/-]+$`)

// IsValidBranchName checks if the given branch name is valid
// This validates against Git's branch naming rules and additional security constraints
// including path traversal prevention via filepath.Clean
func IsValidBranchName(name string) bool {
	if name == "" {
		return false
	}

	// Reject branches starting with problematic characters
	if strings.HasPrefix(name, ".") || strings.HasPrefix(name, "-") || strings.HasPrefix(name, "/") {
		return false
	}

	// Reject branches ending with problematic characters
	if strings.HasSuffix(name, "/") || strings.HasSuffix(name, ".") {
		return false
	}

	// Reject path traversal patterns
	if strings.Contains(name, "..") {
		return false
	}

	// Additional path traversal check via filepath.Clean
	// This handles edge cases where "/" in branch names on Windows could bypass separator checks
	if strings.Contains(filepath.Clean(name), "..") {
		return false
	}

	// Reject consecutive slashes
	if strings.Contains(name, "//") {
		return false
	}

	// Reject Git lock file pattern
	if strings.HasSuffix(name, ".lock") {
		return false
	}

	return BranchNameRegex.MatchString(name)
}

// customNameRegex allows only alphanumeric characters, hyphens, and underscores
var customNameRegex = regexp.MustCompile(`[^a-zA-Z0-9\-_]`)

// SanitizeCustomName removes invalid characters from custom name.
// Allowed characters: [a-zA-Z0-9-_]
// Converts to lowercase, returns "work" as default if empty.
func SanitizeCustomName(name string) string {
	sanitized := customNameRegex.ReplaceAllString(strings.ToLower(name), "")
	if sanitized == "" {
		return "work"
	}
	return sanitized
}

// GenerateBranchName creates a unique branch name in the format:
// {baseBranch}-{customName}-{UnixNano}
// This matches the naming convention used by the desktop app.
func GenerateBranchName(baseBranch, customName string) string {
	sanitizedName := SanitizeCustomName(customName)
	uniqueID := fmt.Sprintf("%d", time.Now().UnixNano())
	return fmt.Sprintf("%s-%s-%s", baseBranch, sanitizedName, uniqueID)
}

// ErrInvalidBranchName is returned when a branch name fails validation
var ErrInvalidBranchName = fmt.Errorf("invalid branch name: must contain only alphanumeric characters, dots, underscores, hyphens, and slashes")

// ValidateBranchNameWithError validates a branch name and returns an error if invalid
func ValidateBranchNameWithError(name string) error {
	if !IsValidBranchName(name) {
		return ErrInvalidBranchName
	}
	return nil
}
