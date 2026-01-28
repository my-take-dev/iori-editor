package history

import "time"

// TerminalType represents the type of terminal output
type TerminalType string

const (
	TerminalTypeAI   TerminalType = "ai"
	TerminalTypeUser TerminalType = "user"
)

// IsValid checks if the terminal type is valid
func (t TerminalType) IsValid() bool {
	return t == TerminalTypeAI || t == TerminalTypeUser
}

// Buffer thresholds for auto-flush
const (
	BufferEntryThreshold = 50    // Flush after 50 entries
	BufferSizeThreshold  = 32768 // Flush after 32KB
)

// TerminalHistoryEntry represents a single entry in the terminal history
type TerminalHistoryEntry struct {
	Timestamp    time.Time    `json:"timestamp"`
	TerminalType TerminalType `json:"terminalType"`
	Data         string       `json:"data"`
}

// TerminalHistory represents the complete history of a terminal session
type TerminalHistory struct {
	SessionID   string                 `json:"sessionId"`
	SessionName string                 `json:"sessionName"`
	StartedAt   time.Time              `json:"startedAt"`
	EndedAt     time.Time              `json:"endedAt,omitempty"`
	WorkDir     string                 `json:"workDir"`
	Entries     []TerminalHistoryEntry `json:"entries"`
}

// HistoryInfo represents metadata about a history file
type HistoryInfo struct {
	Filename    string    `json:"filename"`
	SessionID   string    `json:"sessionId"`
	SessionName string    `json:"sessionName"`
	StartedAt   time.Time `json:"startedAt"`
	EndedAt     time.Time `json:"endedAt"`
	WorkDir     string    `json:"workDir"`
	EntryCount  int       `json:"entryCount"`
}

// HistoryMetadataFile represents the metadata-only file (*.meta.json) for NDJSON format
type HistoryMetadataFile struct {
	SessionID   string    `json:"sessionId"`
	SessionName string    `json:"sessionName"`
	StartedAt   time.Time `json:"startedAt"`
	EndedAt     time.Time `json:"endedAt,omitempty"`
	WorkDir     string    `json:"workDir"`
	EntryCount  int       `json:"entryCount"`
}

// HistoryChunk represents a chunk of history data for streaming/pagination
type HistoryChunk struct {
	Data       string `json:"data"`       // Combined data string from entries
	StartIndex int    `json:"startIndex"` // Start entry index (0-based)
	EndIndex   int    `json:"endIndex"`   // End entry index (exclusive)
	FileSize   int64  `json:"fileSize"`   // File size in bytes (replaces EntryCount)
	HasMore    bool   `json:"hasMore"`    // Whether more data is available
}
