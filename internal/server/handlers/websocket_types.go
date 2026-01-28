package handlers

import (
	"net/http"
	"time"

	"github.com/google/uuid"
	"iori-editor/internal/server/broadcast"
)

// WebSocket configuration constants
const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 8192
)

// WebSocket-specific errors
var (
	ErrWSAuthNotConfigured   = &APIError{Code: http.StatusInternalServerError, Msg: "Server configuration error", ErrorCode: ErrCodeInternal}
	ErrWSUnauthorized        = &APIError{Code: http.StatusUnauthorized, Msg: "Unauthorized", ErrorCode: ErrCodeUnauthorized}
	ErrWSInvalidPath         = &APIError{Code: http.StatusBadRequest, Msg: "Invalid path", ErrorCode: ErrCodeBadRequest}
	ErrWSInvalidSessionID    = &APIError{Code: http.StatusBadRequest, Msg: "Invalid session ID format", ErrorCode: ErrCodeValidation}
	ErrWSInvalidTerminalType = &APIError{Code: http.StatusBadRequest, Msg: "Invalid terminal type", ErrorCode: ErrCodeValidation}
	ErrWSSessionNotFound     = &APIError{Code: http.StatusNotFound, Msg: "Session not found", ErrorCode: ErrCodeNotFound}
)

// userFriendlyErrors maps internal error codes to user-friendly messages
var userFriendlyErrors = map[string]string{
	"terminal_not_available":  "ターミナルに接続できません。セッションを再起動してください。",
	"terminal_buffer_error":   "ターミナルの初期化に失敗しました。",
	"terminal_disconnected":   "ターミナル接続が切断されました。再接続してください。",
	"terminal_write_error":    "入力の送信に失敗しました。",
	"terminal_resize_error":   "ターミナルサイズの変更に失敗しました。",
	"invalid_message_format":  "不正なメッセージ形式です。",
	"invalid_input_data":      "不正な入力データです。",
	"invalid_resize_data":     "不正なリサイズデータです。",
	"invalid_history_request": "不正な履歴リクエストです。",
}

// getUserFriendlyError returns a user-friendly error message for an error code
func getUserFriendlyError(errorCode string) string {
	if msg, ok := userFriendlyErrors[errorCode]; ok {
		return msg
	}
	// Return the original code if no translation found
	return errorCode
}

// ConnectionParams holds parsed WebSocket connection parameters
type ConnectionParams struct {
	SessionID    string
	TerminalType string
}

// Validate validates the connection parameters
func (p *ConnectionParams) Validate() error {
	if _, err := uuid.Parse(p.SessionID); err != nil {
		return ErrWSInvalidSessionID
	}
	if !broadcast.TerminalType(p.TerminalType).IsValid() {
		return ErrWSInvalidTerminalType
	}
	return nil
}

// readResult holds the result of a terminal read operation
type readResult struct {
	data []byte
	err  error
}

// AuthValidator is a function type for validating authentication
type AuthValidator func(r *http.Request) bool
