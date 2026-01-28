package broadcast

import "encoding/json"

// MessageType represents the type of WebSocket message
type MessageType string

const (
	MessageTypeInput                MessageType = "input"
	MessageTypeOutput               MessageType = "output"
	MessageTypeResize               MessageType = "resize"
	MessageTypeStatus               MessageType = "status"
	MessageTypeError                MessageType = "error"
	MessageTypeHistory              MessageType = "history"
	MessageTypeHistoryChunk         MessageType = "history_chunk"
	MessageTypeHistoryEnd           MessageType = "history_end"
	MessageTypeHistoryStreamRequest MessageType = "history_stream_request"
)

// IsValid checks if the message type is valid
func (t MessageType) IsValid() bool {
	switch t {
	case MessageTypeInput, MessageTypeOutput, MessageTypeResize,
		MessageTypeStatus, MessageTypeError, MessageTypeHistory,
		MessageTypeHistoryChunk, MessageTypeHistoryEnd, MessageTypeHistoryStreamRequest:
		return true
	}
	return false
}

// TerminalType represents the type of terminal connection
type TerminalType string

const (
	TerminalTypeAI   TerminalType = "ai"
	TerminalTypeUser TerminalType = "user"
)

// IsValid checks if the terminal type is valid
func (t TerminalType) IsValid() bool {
	return t == TerminalTypeAI || t == TerminalTypeUser
}

// String returns the string representation of the terminal type
func (t TerminalType) String() string {
	return string(t)
}

// Message represents a WebSocket message
type Message struct {
	Type MessageType     `json:"type"`
	Data json.RawMessage `json:"data"`
}

// ResizeData represents terminal resize data
type ResizeData struct {
	Cols int `json:"cols"`
	Rows int `json:"rows"`
}

// BroadcastMessage represents a message to broadcast
type BroadcastMessage struct {
	SessionID    string
	TerminalType TerminalType
	Data         []byte
}

// HistoryChunkPayload represents a chunk of history data for streaming
type HistoryChunkPayload struct {
	Data       string `json:"data"`
	StartIndex int    `json:"startIndex"`
	EndIndex   int    `json:"endIndex"`
	HasMore    bool   `json:"hasMore"`
}

// HistoryEndPayload represents the end of history streaming
type HistoryEndPayload struct {
	TotalEntries int   `json:"totalEntries"`
	FileSize     int64 `json:"fileSize"`
}
