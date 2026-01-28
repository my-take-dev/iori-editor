package history

import (
	"context"
	"os"
	"path/filepath"
	"strings"
)

const (
	// DefaultChunkSize is the default number of entries per chunk
	DefaultChunkSize = 100
)

// StreamChunk represents a chunk of streamed history data
type StreamChunk struct {
	Data       string
	StartIndex int
	EndIndex   int
	HasMore    bool
}

// StreamResult represents the final result of streaming
type StreamResult struct {
	TotalEntries int
	FileSize     int64
}

// StreamHandler defines the callback interface for stream events
type StreamHandler interface {
	// OnChunk is called for each chunk of data
	OnChunk(chunk StreamChunk) error
	// OnEnd is called when streaming completes successfully
	OnEnd(result StreamResult)
	// OnError is called when an error occurs
	OnError(err error)
}

// HistoryStreamer handles streaming of history data from storage
type HistoryStreamer struct {
	storage   Storage
	chunkSize int
}

// NewHistoryStreamer creates a new HistoryStreamer instance
func NewHistoryStreamer(storage Storage) *HistoryStreamer {
	return &HistoryStreamer{
		storage:   storage,
		chunkSize: DefaultChunkSize,
	}
}

// NewHistoryStreamerWithChunkSize creates a new HistoryStreamer with custom chunk size
func NewHistoryStreamerWithChunkSize(storage Storage, chunkSize int) *HistoryStreamer {
	if chunkSize <= 0 {
		chunkSize = DefaultChunkSize
	}
	return &HistoryStreamer{
		storage:   storage,
		chunkSize: chunkSize,
	}
}

// Stream streams history data from the given path to the handler
// It validates the filename, reads file metadata, and streams chunks via callbacks
func (s *HistoryStreamer) Stream(ctx context.Context, filename string, offset int, handler StreamHandler) {
	// Validate filename
	if err := ValidateFilename(filename); err != nil {
		handler.OnError(NewInvalidFilenameError(filename))
		return
	}

	// Check format
	if !strings.HasSuffix(filename, ".meta.json") {
		handler.OnError(NewUnsupportedFormatError(filename))
		return
	}

	// Construct data file path
	basename := strings.TrimSuffix(filename, ".meta.json")
	dataPath := filepath.Join(s.storage.GetBasePath(), basename+".ndjson")

	// Get file size
	fileInfo, err := os.Stat(dataPath)
	if err != nil {
		if os.IsNotExist(err) {
			// File doesn't exist - send empty result
			handler.OnEnd(StreamResult{
				TotalEntries: 0,
				FileSize:     0,
			})
			return
		}
		handler.OnError(NewIOError("stat file", err))
		return
	}
	fileSize := fileInfo.Size()

	// Stream chunks
	totalEntries := 0
	currentOffset := offset

	for {
		// Check context cancellation
		select {
		case <-ctx.Done():
			handler.OnError(NewCancelledError())
			return
		default:
		}

		// Collect entries for this chunk
		var chunkData strings.Builder
		chunkEntryCount := 0
		startIndex := currentOffset

		hasMore, err := s.storage.StreamEntriesRange(dataPath, currentOffset, s.chunkSize, func(entry TerminalHistoryEntry) error {
			// Check context cancellation inside callback
			select {
			case <-ctx.Done():
				return ctx.Err()
			default:
			}
			chunkData.WriteString(entry.Data)
			chunkEntryCount++
			return nil
		})

		if err != nil {
			if err == context.Canceled {
				handler.OnError(NewCancelledError())
				return
			}
			handler.OnError(NewIOError("read entries", err))
			return
		}

		// Send chunk if we have data
		if chunkEntryCount > 0 {
			endIndex := currentOffset + chunkEntryCount
			if err := handler.OnChunk(StreamChunk{
				Data:       chunkData.String(),
				StartIndex: startIndex,
				EndIndex:   endIndex,
				HasMore:    hasMore,
			}); err != nil {
				// Handler requested stop
				return
			}
			currentOffset = endIndex
			totalEntries += chunkEntryCount
		}

		// If no more data, send end event and exit
		if !hasMore {
			handler.OnEnd(StreamResult{
				TotalEntries: totalEntries,
				FileSize:     fileSize,
			})
			return
		}
	}
}
