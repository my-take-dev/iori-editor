package history

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"iori-editor/internal/logger"
)

const (
	// MaxScanTokenSize is the maximum size of a single line when reading NDJSON files
	MaxScanTokenSize = 1024 * 1024 // 1MB
)

// Storage defines the interface for history persistence operations
type Storage interface {
	EnsureDirectory() error
	WriteMetadata(path string, metadata *HistoryMetadataFile) error
	ReadMetadata(path string) (*HistoryMetadataFile, error)
	OpenDataFile(path string) (*os.File, error)
	ReadEntries(path string) ([]TerminalHistoryEntry, error)
	// ReadEntriesRange reads entries with pagination.
	// Returns entries, hasMore flag, and error.
	ReadEntriesRange(path string, offset, limit int) ([]TerminalHistoryEntry, bool, error)
	// StreamEntriesRange reads entries and calls callback for each entry.
	// This allows streaming without accumulating all entries in memory.
	// Returns hasMore flag and error.
	StreamEntriesRange(path string, offset, limit int, callback func(entry TerminalHistoryEntry) error) (bool, error)
	// WriteEntries writes multiple entries to a data file in batch using buffered I/O.
	// Returns the number of entries written and any error.
	WriteEntries(file *os.File, entries []TerminalHistoryEntry) (int, error)
	ListMetadataFiles() ([]string, error)
	DeleteHistoryFiles(basename string) error
	GetBasePath() string
}

// FileStorage implements Storage interface using filesystem
type FileStorage struct {
	baseDir string
}

// NewFileStorage creates a new FileStorage instance
func NewFileStorage(baseDir string) *FileStorage {
	return &FileStorage{baseDir: baseDir}
}

// EnsureDirectory creates the history directory if it doesn't exist
func (fs *FileStorage) EnsureDirectory() error {
	if err := os.MkdirAll(fs.baseDir, 0755); err != nil {
		return fmt.Errorf("failed to create history directory: %w", err)
	}
	return nil
}

// GetBasePath returns the base directory path
func (fs *FileStorage) GetBasePath() string {
	return fs.baseDir
}

// WriteMetadata writes metadata to a .meta.json file
func (fs *FileStorage) WriteMetadata(path string, metadata *HistoryMetadataFile) error {
	data, err := json.Marshal(metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}
	return os.WriteFile(path, data, 0644)
}

// ReadMetadata reads metadata from a .meta.json file
func (fs *FileStorage) ReadMetadata(path string) (*HistoryMetadataFile, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read metadata file: %w", err)
	}

	var metadata HistoryMetadataFile
	if err := json.Unmarshal(data, &metadata); err != nil {
		return nil, fmt.Errorf("failed to parse metadata file: %w", err)
	}
	return &metadata, nil
}

// OpenDataFile opens a data file for append writes
func (fs *FileStorage) OpenDataFile(path string) (*os.File, error) {
	return os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
}

// WriteEntries writes multiple entries to a data file in batch using buffered I/O.
// Uses bufio.Writer and json.Encoder for efficient streaming writes.
// Returns the number of entries successfully written and any error.
func (fs *FileStorage) WriteEntries(file *os.File, entries []TerminalHistoryEntry) (int, error) {
	if len(entries) == 0 {
		return 0, nil
	}

	bw := bufio.NewWriter(file)
	encoder := json.NewEncoder(bw)

	written := 0
	for _, entry := range entries {
		if err := encoder.Encode(entry); err != nil {
			// Flush what we have written so far
			bw.Flush()
			return written, fmt.Errorf("failed to encode entry: %w", err)
		}
		written++
	}

	if err := bw.Flush(); err != nil {
		return written, fmt.Errorf("failed to flush buffer: %w", err)
	}

	return written, nil
}

// ReadEntries reads entries from an NDJSON file
func (fs *FileStorage) ReadEntries(path string) ([]TerminalHistoryEntry, error) {
	dataFile, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return []TerminalHistoryEntry{}, nil
		}
		return nil, fmt.Errorf("failed to open data file: %w", err)
	}
	defer dataFile.Close()

	var entries []TerminalHistoryEntry
	scanner := bufio.NewScanner(dataFile)

	// Increase buffer size for large lines
	buf := make([]byte, MaxScanTokenSize)
	scanner.Buffer(buf, MaxScanTokenSize)

	for scanner.Scan() {
		var entry TerminalHistoryEntry
		if err := json.Unmarshal(scanner.Bytes(), &entry); err != nil {
			logger.Warn("failed to parse entry line, skipping", err)
			continue
		}
		entries = append(entries, entry)
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("failed to read data file: %w", err)
	}

	return entries, nil
}

// ReadEntriesRange reads entries from an NDJSON file with pagination (offset and limit)
// Returns the entries, hasMore flag, and any error.
func (fs *FileStorage) ReadEntriesRange(path string, offset, limit int) ([]TerminalHistoryEntry, bool, error) {
	dataFile, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return []TerminalHistoryEntry{}, false, nil
		}
		return nil, false, fmt.Errorf("failed to open data file: %w", err)
	}
	defer dataFile.Close()

	var entries []TerminalHistoryEntry
	scanner := bufio.NewScanner(dataFile)

	// Increase buffer size for large lines
	buf := make([]byte, MaxScanTokenSize)
	scanner.Buffer(buf, MaxScanTokenSize)

	lineIndex := 0
	skippedCount := 0
	for scanner.Scan() {
		// Skip lines before offset
		if lineIndex < offset {
			lineIndex++
			continue
		}

		// Stop if we've collected enough entries - there are more available
		if limit > 0 && len(entries) >= limit {
			return entries, true, nil
		}

		var entry TerminalHistoryEntry
		if err := json.Unmarshal(scanner.Bytes(), &entry); err != nil {
			logger.Warn(fmt.Sprintf("failed to parse entry at line %d in %s, skipping", lineIndex+1, path), err)
			skippedCount++
			lineIndex++
			continue
		}
		entries = append(entries, entry)
		lineIndex++
	}

	if skippedCount > 0 {
		logger.Warn(fmt.Sprintf("skipped %d corrupted entries in %s", skippedCount, path), nil)
	}

	if err := scanner.Err(); err != nil {
		return nil, false, fmt.Errorf("failed to read data file: %w", err)
	}

	// Reached end of file
	return entries, false, nil
}

// StreamEntriesRange reads entries from an NDJSON file with pagination and calls callback for each entry.
// This allows streaming without accumulating all entries in memory.
// Returns hasMore flag and error.
func (fs *FileStorage) StreamEntriesRange(path string, offset, limit int, callback func(entry TerminalHistoryEntry) error) (bool, error) {
	dataFile, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, fmt.Errorf("failed to open data file: %w", err)
	}
	defer dataFile.Close()

	scanner := bufio.NewScanner(dataFile)

	// Increase buffer size for large lines
	buf := make([]byte, MaxScanTokenSize)
	scanner.Buffer(buf, MaxScanTokenSize)

	lineIndex := 0
	processedCount := 0
	skippedCount := 0

	for scanner.Scan() {
		// Skip lines before offset
		if lineIndex < offset {
			lineIndex++
			continue
		}

		// Stop if we've processed enough entries - there are more available
		if limit > 0 && processedCount >= limit {
			return true, nil
		}

		var entry TerminalHistoryEntry
		if err := json.Unmarshal(scanner.Bytes(), &entry); err != nil {
			logger.Warn(fmt.Sprintf("failed to parse entry at line %d in %s, skipping", lineIndex+1, path), err)
			skippedCount++
			lineIndex++
			continue
		}

		if err := callback(entry); err != nil {
			return false, fmt.Errorf("callback error at line %d: %w", lineIndex+1, err)
		}

		processedCount++
		lineIndex++
	}

	if skippedCount > 0 {
		logger.Warn(fmt.Sprintf("skipped %d corrupted entries in %s", skippedCount, path), nil)
	}

	if err := scanner.Err(); err != nil {
		return false, fmt.Errorf("failed to read data file: %w", err)
	}

	// Reached end of file
	return false, nil
}

// ListMetadataFiles returns all .meta.json files in the directory
func (fs *FileStorage) ListMetadataFiles() ([]string, error) {
	files, err := os.ReadDir(fs.baseDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read history directory: %w", err)
	}

	var metaFiles []string
	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".meta.json") {
			metaFiles = append(metaFiles, file.Name())
		}
	}
	return metaFiles, nil
}

// DeleteHistoryFiles deletes both .meta.json and .ndjson files
func (fs *FileStorage) DeleteHistoryFiles(basename string) error {
	metaPath := filepath.Join(fs.baseDir, basename+".meta.json")
	dataPath := filepath.Join(fs.baseDir, basename+".ndjson")

	if err := os.Remove(metaPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete metadata file: %w", err)
	}
	if err := os.Remove(dataPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete data file: %w", err)
	}
	return nil
}

// ValidateFilename checks for path traversal attacks
func ValidateFilename(filename string) error {
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		return fmt.Errorf("invalid filename")
	}
	return nil
}
