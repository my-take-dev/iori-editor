package history

import (
	"errors"
	"fmt"
)

// ErrorCode represents machine-readable error codes for history operations
type ErrorCode string

const (
	ErrCodeFileNotFound      ErrorCode = "FILE_NOT_FOUND"
	ErrCodeInvalidFilename   ErrorCode = "INVALID_FILENAME"
	ErrCodeUnsupportedFormat ErrorCode = "UNSUPPORTED_FORMAT"
	ErrCodeParseError        ErrorCode = "PARSE_ERROR"
	ErrCodeIOError           ErrorCode = "IO_ERROR"
	ErrCodeCancelled         ErrorCode = "CANCELLED"
)

// HistoryError represents a typed error for history operations
type HistoryError struct {
	Code    ErrorCode
	Message string
	Cause   error
}

func (e *HistoryError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("%s: %s: %v", e.Code, e.Message, e.Cause)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *HistoryError) Unwrap() error {
	return e.Cause
}

// Sentinel errors for errors.Is() checks
var (
	ErrFileNotFound      = &HistoryError{Code: ErrCodeFileNotFound, Message: "history file not found"}
	ErrInvalidFilename   = &HistoryError{Code: ErrCodeInvalidFilename, Message: "invalid history filename"}
	ErrUnsupportedFormat = &HistoryError{Code: ErrCodeUnsupportedFormat, Message: "unsupported history file format"}
	ErrParseError        = &HistoryError{Code: ErrCodeParseError, Message: "failed to parse history data"}
	ErrStreamCancelled   = &HistoryError{Code: ErrCodeCancelled, Message: "streaming cancelled"}
)

// NewFileNotFoundError creates a file not found error with path context
func NewFileNotFoundError(path string) *HistoryError {
	return &HistoryError{
		Code:    ErrCodeFileNotFound,
		Message: fmt.Sprintf("history file not found: %s", path),
	}
}

// NewInvalidFilenameError creates an invalid filename error
func NewInvalidFilenameError(filename string) *HistoryError {
	return &HistoryError{
		Code:    ErrCodeInvalidFilename,
		Message: fmt.Sprintf("invalid filename: %s", filename),
	}
}

// NewUnsupportedFormatError creates an unsupported format error
func NewUnsupportedFormatError(format string) *HistoryError {
	return &HistoryError{
		Code:    ErrCodeUnsupportedFormat,
		Message: fmt.Sprintf("unsupported format: %s", format),
	}
}

// NewParseError creates a parse error with line context
func NewParseError(line int, cause error) *HistoryError {
	return &HistoryError{
		Code:    ErrCodeParseError,
		Message: fmt.Sprintf("failed to parse entry at line %d", line),
		Cause:   cause,
	}
}

// NewIOError creates an I/O error with operation context
func NewIOError(operation string, cause error) *HistoryError {
	return &HistoryError{
		Code:    ErrCodeIOError,
		Message: fmt.Sprintf("I/O error during %s", operation),
		Cause:   cause,
	}
}

// NewCancelledError creates a cancelled error
func NewCancelledError() *HistoryError {
	return &HistoryError{
		Code:    ErrCodeCancelled,
		Message: "streaming cancelled",
	}
}

// GetErrorCode extracts the error code from a HistoryError
// Returns empty string if the error is not a HistoryError
func GetErrorCode(err error) ErrorCode {
	var histErr *HistoryError
	if errors.As(err, &histErr) {
		return histErr.Code
	}
	return ""
}
