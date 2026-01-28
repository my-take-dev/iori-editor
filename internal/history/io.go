package history

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"iori-editor/internal/logger"
)

// GetHistoryMetadata retrieves metadata from a history file
func (m *Manager) GetHistoryMetadata(filename string) (*HistoryInfo, error) {
	if err := ValidateFilename(filename); err != nil {
		return nil, err
	}

	if !strings.HasSuffix(filename, ".meta.json") {
		return nil, fmt.Errorf("unsupported file format: %s", filename)
	}

	metaPath := filepath.Join(m.storage.GetBasePath(), filename)
	metadata, err := m.storage.ReadMetadata(metaPath)
	if err != nil {
		return nil, err
	}

	return &HistoryInfo{
		Filename:    filename,
		SessionID:   metadata.SessionID,
		SessionName: metadata.SessionName,
		StartedAt:   metadata.StartedAt,
		EndedAt:     metadata.EndedAt,
		WorkDir:     metadata.WorkDir,
		EntryCount:  metadata.EntryCount,
	}, nil
}

// GetHistory retrieves a specific history file
func (m *Manager) GetHistory(filename string) (*TerminalHistory, error) {
	if err := ValidateFilename(filename); err != nil {
		return nil, err
	}

	if !strings.HasSuffix(filename, ".meta.json") {
		return nil, fmt.Errorf("unsupported file format: %s", filename)
	}

	basename := strings.TrimSuffix(filename, ".meta.json")
	metaPath := BuildMetaPath(m.storage.GetBasePath(), basename)
	dataPath := BuildDataPath(m.storage.GetBasePath(), basename)

	metadata, err := m.storage.ReadMetadata(metaPath)
	if err != nil {
		return nil, err
	}

	entries, err := m.storage.ReadEntries(dataPath)
	if err != nil {
		return nil, err
	}

	return &TerminalHistory{
		SessionID:   metadata.SessionID,
		SessionName: metadata.SessionName,
		StartedAt:   metadata.StartedAt,
		EndedAt:     metadata.EndedAt,
		WorkDir:     metadata.WorkDir,
		Entries:     entries,
	}, nil
}

// GetHistoryWithFlush retrieves history, flushing if it's an active session
func (m *Manager) GetHistoryWithFlush(filename string, currentSessionID string) (*TerminalHistory, error) {
	if err := m.FlushActiveSessionForFile(filename, currentSessionID); err != nil {
		logger.Error("failed to flush session before read", err)
	}

	return m.GetHistory(filename)
}

// GetHistoryChunk retrieves a chunk of history data with pagination
func (m *Manager) GetHistoryChunk(filename string, offset, limit int) (*HistoryChunk, error) {
	slog.Info(fmt.Sprintf("[History] GetHistoryChunk called: filename=%s, offset=%d, limit=%d", filename, offset, limit))

	if err := ValidateFilename(filename); err != nil {
		logger.Error("[History] ValidateFilename failed", err)
		return nil, err
	}

	if !strings.HasSuffix(filename, ".meta.json") {
		return nil, fmt.Errorf("unsupported file format: %s", filename)
	}

	basename := strings.TrimSuffix(filename, ".meta.json")
	dataPath := BuildDataPath(m.storage.GetBasePath(), basename)
	slog.Info(fmt.Sprintf("[History] Data path: %s", dataPath))

	// Get file size using os.Stat (does not read file content)
	fileInfo, err := os.Stat(dataPath)
	if err != nil {
		if os.IsNotExist(err) {
			logger.Warn(fmt.Sprintf("[History] Data file does not exist: %s", dataPath), nil)
			return &HistoryChunk{
				Data:       "",
				StartIndex: 0,
				EndIndex:   0,
				FileSize:   0,
				HasMore:    false,
			}, nil
		}
		return nil, fmt.Errorf("failed to stat data file: %w", err)
	}
	fileSize := fileInfo.Size()
	slog.Info(fmt.Sprintf("[History] File size: %d bytes", fileSize))

	// Read entries with pagination (hasMore is determined by ReadEntriesRange)
	entries, hasMore, err := m.storage.ReadEntriesRange(dataPath, offset, limit)
	if err != nil {
		logger.Error("[History] ReadEntriesRange failed", err)
		return nil, err
	}
	slog.Info(fmt.Sprintf("[History] Read %d entries, hasMore=%v", len(entries), hasMore))

	// Combine entry data into single string
	// Pre-calculate total size to minimize memory reallocations
	totalSize := 0
	for _, entry := range entries {
		totalSize += len(entry.Data)
	}

	var dataBuilder strings.Builder
	dataBuilder.Grow(totalSize) // Pre-allocate to avoid reallocations
	for _, entry := range entries {
		dataBuilder.WriteString(entry.Data)
	}

	endIndex := offset + len(entries)
	dataLen := dataBuilder.Len()
	slog.Info(fmt.Sprintf("[History] Combined data length: %d chars, endIndex=%d", dataLen, endIndex))

	return &HistoryChunk{
		Data:       dataBuilder.String(),
		StartIndex: offset,
		EndIndex:   endIndex,
		FileSize:   fileSize,
		HasMore:    hasMore,
	}, nil
}

// GetHistoryChunkWithFlush retrieves a chunk of history, flushing if it's an active session
func (m *Manager) GetHistoryChunkWithFlush(filename string, offset, limit int, currentSessionID string) (*HistoryChunk, error) {
	if err := m.FlushActiveSessionForFile(filename, currentSessionID); err != nil {
		logger.Error("failed to flush session before read", err)
	}

	return m.GetHistoryChunk(filename, offset, limit)
}

// ListHistories returns all available history files (metadata only)
func (m *Manager) ListHistories() ([]HistoryInfo, error) {
	files, err := m.storage.ListMetadataFiles()
	if err != nil {
		return nil, err
	}

	var histories []HistoryInfo
	for _, filename := range files {
		info, err := m.GetHistoryMetadata(filename)
		if err != nil {
			logger.Warn(fmt.Sprintf("failed to read history metadata for %s, skipping", filename), err)
			continue
		}
		histories = append(histories, *info)
	}

	sort.Slice(histories, func(i, j int) bool {
		return histories[i].StartedAt.After(histories[j].StartedAt)
	})

	return histories, nil
}

// DeleteHistory deletes a history file
func (m *Manager) DeleteHistory(filename string) error {
	if err := ValidateFilename(filename); err != nil {
		return err
	}

	if !strings.HasSuffix(filename, ".meta.json") {
		return fmt.Errorf("unsupported file format: %s", filename)
	}

	basename := strings.TrimSuffix(filename, ".meta.json")
	return m.storage.DeleteHistoryFiles(basename)
}
