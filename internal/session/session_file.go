package session

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"syscall"
	"time"

	"iori-editor/internal/util"
)

// File size limits and retry configuration
const (
	MaxReadFileSize = 10 * 1024 * 1024      // 10MB - hard limit for ReadFile
	retryBaseDelay  = 10 * time.Millisecond // Base delay for exponential backoff
	maxRetries      = 5                     // Maximum file operation retries
)

// File operation errors
var (
	ErrFileTooLarge = errors.New("file too large: use ReadFilePartial for large files")
)

// FileMetadata represents file metadata without content
type FileMetadata struct {
	Path  string `json:"path"`
	Size  int64  `json:"size"`
	IsDir bool   `json:"isDir"`
}

// ReadFile reads a file's content (relative path within session work dir)
// Returns ErrFileTooLarge if the file exceeds MaxReadFileSize (10MB).
// For large files, use ReadFilePartial instead.
func (s *Session) ReadFile(relativePath string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	fullPath, err := util.SecureJoin(s.WorkDir, relativePath)
	if err != nil {
		return "", err
	}

	// Check file size before reading to prevent memory issues
	stat, err := os.Stat(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to stat file: %w", err)
	}
	if stat.Size() > MaxReadFileSize {
		return "", fmt.Errorf("%w: %d bytes (max: %d bytes)",
			ErrFileTooLarge, stat.Size(), MaxReadFileSize)
	}

	content, err := os.ReadFile(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	return string(content), nil
}

// GetFileInfo returns file metadata without reading content
func (s *Session) GetFileInfo(relativePath string) (FileMetadata, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	fullPath, err := util.SecureJoin(s.WorkDir, relativePath)
	if err != nil {
		return FileMetadata{}, err
	}

	stat, err := os.Stat(fullPath)
	if err != nil {
		return FileMetadata{}, fmt.Errorf("failed to stat file: %w", err)
	}

	return FileMetadata{
		Path:  relativePath,
		Size:  stat.Size(),
		IsDir: stat.IsDir(),
	}, nil
}

// ReadFilePartial reads only the first maxBytes of a file (for preview mode)
func (s *Session) ReadFilePartial(relativePath string, maxBytes int64) (content string, isTruncated bool, err error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	fullPath, err := util.SecureJoin(s.WorkDir, relativePath)
	if err != nil {
		return "", false, err
	}

	file, err := os.Open(fullPath)
	if err != nil {
		return "", false, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		return "", false, fmt.Errorf("failed to stat file: %w", err)
	}

	isTruncated = stat.Size() > maxBytes
	readSize := stat.Size()
	if readSize > maxBytes {
		readSize = maxBytes
	}

	buf := make([]byte, readSize)
	n, err := file.Read(buf)
	if err != nil {
		return "", false, fmt.Errorf("failed to read file: %w", err)
	}

	return string(buf[:n]), isTruncated, nil
}

// WriteFile writes content to a file (relative path within session work dir)
func (s *Session) WriteFile(relativePath string, content string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	fullPath, err := util.SecureJoin(s.WorkDir, relativePath)
	if err != nil {
		return err
	}

	// Ensure directory exists
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
}

// RenameFile renames a file (relative paths within session work dir)
func (s *Session) RenameFile(oldPath string, newPath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	fullOldPath, err := util.SecureJoin(s.WorkDir, oldPath)
	if err != nil {
		return err
	}
	fullNewPath, err := util.SecureJoin(s.WorkDir, newPath)
	if err != nil {
		return err
	}

	// Check if source exists
	if _, err := os.Stat(fullOldPath); os.IsNotExist(err) {
		return fmt.Errorf("file not found: %s", oldPath)
	}

	// Check if destination already exists
	if _, err := os.Stat(fullNewPath); err == nil {
		return fmt.Errorf("destination already exists: %s", newPath)
	}

	// Ensure destination directory exists
	destDir := filepath.Dir(fullNewPath)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	// Rename the file with retry for Windows file locking
	err = retryFileOperation(func() error {
		return os.Rename(fullOldPath, fullNewPath)
	}, "rename file")
	if err != nil {
		return fmt.Errorf("failed to rename file: %w", err)
	}

	return nil
}

// DeleteFile deletes a file or directory recursively (relative path within session work dir)
func (s *Session) DeleteFile(relativePath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	fullPath, err := util.SecureJoin(s.WorkDir, relativePath)
	if err != nil {
		return err
	}

	// Check if file exists
	info, err := os.Stat(fullPath)
	if os.IsNotExist(err) {
		return fmt.Errorf("file not found: %s", relativePath)
	}
	if err != nil {
		return fmt.Errorf("failed to stat file: %w", err)
	}

	// Delete file or directory with retry for Windows file locking
	if info.IsDir() {
		// Use RemoveAll for directories to delete recursively
		err = retryFileOperation(func() error {
			return os.RemoveAll(fullPath)
		}, "delete directory")
		if err != nil {
			return fmt.Errorf("failed to delete directory: %w", err)
		}
	} else {
		err = retryFileOperation(func() error {
			return os.Remove(fullPath)
		}, "delete file")
		if err != nil {
			return fmt.Errorf("failed to delete file: %w", err)
		}
	}

	return nil
}

// Windows error codes for file locking
const (
	errorSharingViolation syscall.Errno = 32 // ERROR_SHARING_VIOLATION: File in use by another process
)

// isRetryableFileError checks if an error is a Windows file locking error
// that may be resolved by retrying (e.g., antivirus or indexing service locks).
func isRetryableFileError(err error) bool {
	if err == nil {
		return false
	}
	if runtime.GOOS != "windows" {
		return false
	}
	var errno syscall.Errno
	if errors.As(err, &errno) {
		switch errno {
		case syscall.ERROR_ACCESS_DENIED, // 5: Access denied (antivirus, etc.)
			errorSharingViolation: // 32: File in use by another process
			return true
		}
	}
	return false
}

// retryFileOperation retries a file operation with exponential backoff.
// It handles Windows-specific file locking errors from antivirus and indexing services.
func retryFileOperation(operation func() error, operationName string) error {
	baseDelay := retryBaseDelay

	var lastErr error
	for attempt := 0; attempt < maxRetries; attempt++ {
		lastErr = operation()
		if lastErr == nil {
			return nil
		}

		// Only retry on Windows file locking errors
		if !isRetryableFileError(lastErr) {
			return lastErr
		}

		// Don't sleep after the last attempt
		if attempt < maxRetries-1 {
			delay := baseDelay * time.Duration(1<<attempt) // Exponential: 10, 20, 40, 80, 160ms
			time.Sleep(delay)
		}
	}

	return fmt.Errorf("%s failed after %d retries: %w", operationName, maxRetries, lastErr)
}
