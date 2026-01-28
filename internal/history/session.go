package history

import (
	"fmt"
	"os"
	"sync"
	"time"
)

// ActiveSession tracks runtime state for an active session
type ActiveSession struct {
	Metadata     *HistoryMetadataFile
	EntryBuffer  []TerminalHistoryEntry
	MetaFilePath string
	DataFilePath string
	DataFile     *os.File
	Storage      Storage // Storage interface for batch writes
	IsDirty      bool
	BufferSize   int
	mu           sync.Mutex
}

// NewActiveSession creates a new ActiveSession instance
func NewActiveSession(metadata *HistoryMetadataFile, metaPath, dataPath string, dataFile *os.File, storage Storage) *ActiveSession {
	return &ActiveSession{
		Metadata:     metadata,
		EntryBuffer:  make([]TerminalHistoryEntry, 0, BufferEntryThreshold),
		MetaFilePath: metaPath,
		DataFilePath: dataPath,
		DataFile:     dataFile,
		Storage:      storage,
		IsDirty:      false,
		BufferSize:   0,
	}
}

// AddEntry adds an entry to the buffer (caller must hold lock)
func (s *ActiveSession) AddEntry(terminalType TerminalType, data []byte) {
	entry := TerminalHistoryEntry{
		Timestamp:    time.Now(),
		TerminalType: terminalType,
		Data:         string(data),
	}

	s.EntryBuffer = append(s.EntryBuffer, entry)
	s.BufferSize += len(data)
	s.IsDirty = true
}

// ShouldFlush returns true if buffer thresholds are exceeded
func (s *ActiveSession) ShouldFlush() bool {
	return len(s.EntryBuffer) >= BufferEntryThreshold || s.BufferSize >= BufferSizeThreshold
}

// FlushEntries writes buffered entries to the data file using batch I/O (caller must hold lock)
func (s *ActiveSession) FlushEntries() error {
	if len(s.EntryBuffer) == 0 {
		return nil
	}

	written, err := s.Storage.WriteEntries(s.DataFile, s.EntryBuffer)
	if err != nil {
		// Partial write handling: update counts for what was written
		s.Metadata.EntryCount += written
		if written > 0 {
			s.EntryBuffer = s.EntryBuffer[written:]
			s.BufferSize = s.calculateBufferSize()
		}
		return fmt.Errorf("failed to write entries: %w", err)
	}

	s.Metadata.EntryCount += len(s.EntryBuffer)
	s.EntryBuffer = s.EntryBuffer[:0] // Clear buffer, keep capacity
	s.BufferSize = 0

	return nil
}

// calculateBufferSize calculates the total buffer size from remaining entries
func (s *ActiveSession) calculateBufferSize() int {
	size := 0
	for _, entry := range s.EntryBuffer {
		size += len(entry.Data)
	}
	return size
}

// Lock acquires the session mutex
func (s *ActiveSession) Lock() {
	s.mu.Lock()
}

// Unlock releases the session mutex
func (s *ActiveSession) Unlock() {
	s.mu.Unlock()
}
