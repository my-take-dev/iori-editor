package terminal

import (
	"bytes"
	"sync"
)

const defaultMaxLines = 1000 // Default max history lines

// HistoryBuffer stores terminal output history with a maximum line limit.
// It uses a ring buffer internally to efficiently manage memory.
type HistoryBuffer struct {
	lines    [][]byte
	maxLines int
	start    int // Start index in the ring buffer
	count    int // Number of lines currently stored
	partial  []byte
	mu       sync.RWMutex
}

// NewHistoryBuffer creates a new HistoryBuffer with the specified maximum line count.
func NewHistoryBuffer(maxLines int) *HistoryBuffer {
	if maxLines <= 0 {
		maxLines = defaultMaxLines
	}
	return &HistoryBuffer{
		lines:    make([][]byte, maxLines),
		maxLines: maxLines,
	}
}

// Write adds data to the history buffer.
// Data is split by newlines and stored line by line.
func (h *HistoryBuffer) Write(data []byte) {
	if len(data) == 0 {
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	// Combine with any partial line from previous write
	if len(h.partial) > 0 {
		data = append(h.partial, data...)
		h.partial = nil
	}

	// Split by newlines
	for {
		idx := bytes.IndexByte(data, '\n')
		if idx == -1 {
			// No newline found - save as partial line
			if len(data) > 0 {
				h.partial = make([]byte, len(data))
				copy(h.partial, data)
			}
			break
		}

		// Add the line (including the newline)
		line := make([]byte, idx+1)
		copy(line, data[:idx+1])
		h.addLine(line)

		data = data[idx+1:]
	}
}

// addLine adds a single line to the ring buffer (caller must hold lock)
func (h *HistoryBuffer) addLine(line []byte) {
	if h.count < h.maxLines {
		// Buffer not full yet
		h.lines[h.count] = line
		h.count++
	} else {
		// Buffer is full - overwrite oldest line
		h.lines[h.start] = line
		h.start = (h.start + 1) % h.maxLines
	}
}

// GetHistory returns all stored history as a single byte slice.
func (h *HistoryBuffer) GetHistory() []byte {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if h.count == 0 {
		return nil
	}

	// Calculate total size
	totalSize := 0
	for i := 0; i < h.count; i++ {
		idx := (h.start + i) % h.maxLines
		totalSize += len(h.lines[idx])
	}

	// Include partial line if any
	if len(h.partial) > 0 {
		totalSize += len(h.partial)
	}

	// Build result
	result := make([]byte, 0, totalSize)
	for i := 0; i < h.count; i++ {
		idx := (h.start + i) % h.maxLines
		result = append(result, h.lines[idx]...)
	}

	// Append partial line
	if len(h.partial) > 0 {
		result = append(result, h.partial...)
	}

	return result
}

// GetLineCount returns the number of lines currently stored.
func (h *HistoryBuffer) GetLineCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.count
}

// Clear removes all stored history.
func (h *HistoryBuffer) Clear() {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Clear all lines
	for i := range h.lines {
		h.lines[i] = nil
	}
	h.start = 0
	h.count = 0
	h.partial = nil
}

// IsEmpty returns true if the buffer has no history.
func (h *HistoryBuffer) IsEmpty() bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.count == 0 && len(h.partial) == 0
}
