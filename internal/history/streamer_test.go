package history

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// mockStreamHandler captures stream events for testing
type mockStreamHandler struct {
	chunks []StreamChunk
	result *StreamResult
	err    error
}

func (m *mockStreamHandler) OnChunk(chunk StreamChunk) error {
	m.chunks = append(m.chunks, chunk)
	return nil
}

func (m *mockStreamHandler) OnEnd(result StreamResult) {
	m.result = &result
}

func (m *mockStreamHandler) OnError(err error) {
	m.err = err
}

func TestHistoryStreamer_Stream_Success(t *testing.T) {
	// Setup temp directory
	tempDir, err := os.MkdirTemp("", "streamer_test")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create test data file
	dataPath := filepath.Join(tempDir, "test_session.ndjson")
	entries := []TerminalHistoryEntry{
		{TerminalType: TerminalTypeUser, Data: "line1\n", Timestamp: time.Now()},
		{TerminalType: TerminalTypeUser, Data: "line2\n", Timestamp: time.Now()},
		{TerminalType: TerminalTypeUser, Data: "line3\n", Timestamp: time.Now()},
	}

	file, err := os.Create(dataPath)
	if err != nil {
		t.Fatalf("failed to create data file: %v", err)
	}
	encoder := json.NewEncoder(file)
	for _, entry := range entries {
		if err := encoder.Encode(entry); err != nil {
			t.Fatalf("failed to write entry: %v", err)
		}
	}
	file.Close()

	// Create metadata file (required for validation)
	metaPath := filepath.Join(tempDir, "test_session.meta.json")
	meta := &HistoryMetadataFile{
		SessionID: "test_session",
		StartedAt: time.Now(),
	}
	metaData, _ := json.Marshal(meta)
	os.WriteFile(metaPath, metaData, 0644)

	// Test streaming
	storage := NewFileStorage(tempDir)
	streamer := NewHistoryStreamer(storage)
	handler := &mockStreamHandler{}

	streamer.Stream(context.Background(), "test_session.meta.json", 0, handler)

	// Verify results
	if handler.err != nil {
		t.Errorf("unexpected error: %v", handler.err)
	}
	if handler.result == nil {
		t.Fatal("expected result, got nil")
	}
	if handler.result.TotalEntries != 3 {
		t.Errorf("expected 3 entries, got %d", handler.result.TotalEntries)
	}
	if len(handler.chunks) == 0 {
		t.Error("expected at least one chunk")
	}
}

func TestHistoryStreamer_Stream_InvalidFilename(t *testing.T) {
	tempDir, _ := os.MkdirTemp("", "streamer_test")
	defer os.RemoveAll(tempDir)

	storage := NewFileStorage(tempDir)
	streamer := NewHistoryStreamer(storage)
	handler := &mockStreamHandler{}

	// Test with path traversal attack
	streamer.Stream(context.Background(), "../etc/passwd.meta.json", 0, handler)

	if handler.err == nil {
		t.Error("expected error for invalid filename")
	}
	histErr, ok := handler.err.(*HistoryError)
	if !ok {
		t.Errorf("expected HistoryError, got %T", handler.err)
	}
	if histErr.Code != ErrCodeInvalidFilename {
		t.Errorf("expected ErrCodeInvalidFilename, got %s", histErr.Code)
	}
}

func TestHistoryStreamer_Stream_UnsupportedFormat(t *testing.T) {
	tempDir, _ := os.MkdirTemp("", "streamer_test")
	defer os.RemoveAll(tempDir)

	storage := NewFileStorage(tempDir)
	streamer := NewHistoryStreamer(storage)
	handler := &mockStreamHandler{}

	// Test with wrong extension
	streamer.Stream(context.Background(), "test_session.json", 0, handler)

	if handler.err == nil {
		t.Error("expected error for unsupported format")
	}
	histErr, ok := handler.err.(*HistoryError)
	if !ok {
		t.Errorf("expected HistoryError, got %T", handler.err)
	}
	if histErr.Code != ErrCodeUnsupportedFormat {
		t.Errorf("expected ErrCodeUnsupportedFormat, got %s", histErr.Code)
	}
}

func TestHistoryStreamer_Stream_FileNotFound(t *testing.T) {
	tempDir, _ := os.MkdirTemp("", "streamer_test")
	defer os.RemoveAll(tempDir)

	storage := NewFileStorage(tempDir)
	streamer := NewHistoryStreamer(storage)
	handler := &mockStreamHandler{}

	// Test with non-existent file
	streamer.Stream(context.Background(), "nonexistent.meta.json", 0, handler)

	// File not found should result in empty end event, not error
	if handler.err != nil {
		t.Errorf("unexpected error: %v", handler.err)
	}
	if handler.result == nil {
		t.Fatal("expected result for non-existent file")
	}
	if handler.result.TotalEntries != 0 {
		t.Errorf("expected 0 entries, got %d", handler.result.TotalEntries)
	}
}

func TestHistoryStreamer_Stream_ContextCancellation(t *testing.T) {
	tempDir, _ := os.MkdirTemp("", "streamer_test")
	defer os.RemoveAll(tempDir)

	// Create a large test file
	dataPath := filepath.Join(tempDir, "test_session.ndjson")
	file, _ := os.Create(dataPath)
	encoder := json.NewEncoder(file)
	for i := 0; i < 1000; i++ {
		entry := TerminalHistoryEntry{
			TerminalType: TerminalTypeUser,
			Data:         "test data\n",
			Timestamp:    time.Now(),
		}
		encoder.Encode(entry)
	}
	file.Close()

	storage := NewFileStorage(tempDir)
	streamer := NewHistoryStreamerWithChunkSize(storage, 10) // Small chunks to test cancellation

	// Create cancelled context
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	handler := &mockStreamHandler{}
	streamer.Stream(ctx, "test_session.meta.json", 0, handler)

	if handler.err == nil {
		t.Error("expected error for cancelled context")
	}
	histErr, ok := handler.err.(*HistoryError)
	if !ok {
		t.Errorf("expected HistoryError, got %T", handler.err)
	}
	if histErr.Code != ErrCodeCancelled {
		t.Errorf("expected ErrCodeCancelled, got %s", histErr.Code)
	}
}

func TestHistoryStreamer_Stream_WithOffset(t *testing.T) {
	tempDir, _ := os.MkdirTemp("", "streamer_test")
	defer os.RemoveAll(tempDir)

	// Create test data file with 5 entries
	dataPath := filepath.Join(tempDir, "test_session.ndjson")
	file, _ := os.Create(dataPath)
	encoder := json.NewEncoder(file)
	for i := 0; i < 5; i++ {
		entry := TerminalHistoryEntry{
			TerminalType: TerminalTypeUser,
			Data:         "line\n",
			Timestamp:    time.Now(),
		}
		encoder.Encode(entry)
	}
	file.Close()

	storage := NewFileStorage(tempDir)
	streamer := NewHistoryStreamer(storage)
	handler := &mockStreamHandler{}

	// Start from offset 2
	streamer.Stream(context.Background(), "test_session.meta.json", 2, handler)

	if handler.err != nil {
		t.Errorf("unexpected error: %v", handler.err)
	}
	if handler.result == nil {
		t.Fatal("expected result")
	}
	// Should only have 3 entries (5 total - 2 offset)
	if handler.result.TotalEntries != 3 {
		t.Errorf("expected 3 entries, got %d", handler.result.TotalEntries)
	}
}

func TestHistoryError_ErrorsAs(t *testing.T) {
	err := NewFileNotFoundError("/path/to/file")

	var histErr *HistoryError
	if !isHistoryError(err, &histErr) {
		t.Error("expected errors.As to work with HistoryError")
	}
	if histErr.Code != ErrCodeFileNotFound {
		t.Errorf("expected ErrCodeFileNotFound, got %s", histErr.Code)
	}
}

func TestGetErrorCode(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected ErrorCode
	}{
		{
			name:     "HistoryError",
			err:      NewFileNotFoundError("/path"),
			expected: ErrCodeFileNotFound,
		},
		{
			name:     "ParseError",
			err:      NewParseError(10, nil),
			expected: ErrCodeParseError,
		},
		{
			name:     "NonHistoryError",
			err:      os.ErrNotExist,
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			code := GetErrorCode(tt.err)
			if code != tt.expected {
				t.Errorf("expected %s, got %s", tt.expected, code)
			}
		})
	}
}

// Helper function for errors.As check
func isHistoryError(err error, target **HistoryError) bool {
	switch e := err.(type) {
	case *HistoryError:
		*target = e
		return true
	default:
		return false
	}
}
