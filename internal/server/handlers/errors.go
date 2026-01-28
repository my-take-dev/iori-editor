package handlers

import (
	"errors"
	"log/slog"
	"net/http"

	"iori-editor/internal/services"
)

// ErrorCode represents machine-readable error codes for programmatic handling
type ErrorCode string

const (
	ErrCodeInternal              ErrorCode = "INTERNAL_ERROR"
	ErrCodeBadRequest            ErrorCode = "BAD_REQUEST"
	ErrCodeNotFound              ErrorCode = "NOT_FOUND"
	ErrCodeUnauthorized          ErrorCode = "UNAUTHORIZED"
	ErrCodeConflict              ErrorCode = "CONFLICT"
	ErrCodeValidation            ErrorCode = "VALIDATION_ERROR"
	ErrCodeWorktreeNotFound      ErrorCode = "WORKTREE_NOT_FOUND"
	ErrCodeCannotDeleteMain      ErrorCode = "CANNOT_DELETE_MAIN"
	ErrCodeUncommittedChanges    ErrorCode = "UNCOMMITTED_CHANGES"
	ErrCodePathTraversal         ErrorCode = "PATH_TRAVERSAL"
	ErrCodeFetchFailed           ErrorCode = "FETCH_FAILED"
	ErrCodeBranchRequired        ErrorCode = "BRANCH_REQUIRED"
	ErrCodeInvalidBranchName     ErrorCode = "INVALID_BRANCH_NAME"
	ErrCodeWorktreeAlreadyOpened ErrorCode = "WORKTREE_ALREADY_OPENED"
)

// APIError represents an API error with HTTP status code
type APIError struct {
	Code        int       // HTTP status code
	Msg         string    // User-facing message (safe to expose)
	ErrorCode   ErrorCode // Machine-readable error code
	InternalErr error     // Internal error (never exposed to users)
}

func (e *APIError) Error() string {
	return e.Msg
}

func (e *APIError) Unwrap() error {
	return e.InternalErr
}

// StatusCode returns the HTTP status code for this error
func (e *APIError) StatusCode() int {
	return e.Code
}

// Sentinel errors for common API error conditions
var (
	ErrBranchRequired     = &APIError{Code: http.StatusBadRequest, Msg: "ブランチ名は必須です", ErrorCode: ErrCodeBranchRequired}
	ErrInvalidBranchName  = &APIError{Code: http.StatusBadRequest, Msg: "無効なブランチ名です：英数字、ドット、アンダースコア、ハイフン、スラッシュのみ使用できます", ErrorCode: ErrCodeInvalidBranchName}
	ErrWorktreeNotFound   = &APIError{Code: http.StatusNotFound, Msg: "ワークツリーが見つかりません", ErrorCode: ErrCodeWorktreeNotFound}
	ErrCannotDeleteMain   = &APIError{Code: http.StatusBadRequest, Msg: "メインワークツリーは削除できません", ErrorCode: ErrCodeCannotDeleteMain}
	ErrUncommittedChanges = &APIError{Code: http.StatusConflict, Msg: "コミットされていない変更があります。force=trueで強制削除できます。", ErrorCode: ErrCodeUncommittedChanges}
	ErrPathTraversal      = &APIError{Code: http.StatusBadRequest, Msg: "無効なパスです：許可されたディレクトリ外へのアクセスはできません", ErrorCode: ErrCodePathTraversal}
)

// ErrorResponse is the JSON structure for error responses
type ErrorResponse struct {
	Error   string    `json:"error"`             // User-facing message
	Code    ErrorCode `json:"code,omitempty"`    // Machine-readable code
	Details string    `json:"details,omitempty"` // Dev-mode only details
}

// devMode controls whether internal error details are exposed in responses
var devMode = false

// SetDevMode enables or disables development mode error details
func SetDevMode(enabled bool) {
	devMode = enabled
}

// writeErrorResponse writes a structured error response
func writeErrorResponse(w http.ResponseWriter, apiErr *APIError) {
	resp := ErrorResponse{
		Error: apiErr.Msg,
		Code:  apiErr.ErrorCode,
	}

	// Include internal details in dev mode only
	if devMode && apiErr.InternalErr != nil {
		resp.Details = apiErr.InternalErr.Error()
	}

	// Log internal error for debugging (always, regardless of mode)
	if apiErr.InternalErr != nil {
		slog.Error("API error",
			"code", apiErr.ErrorCode,
			"httpStatus", apiErr.Code,
			"userMessage", apiErr.Msg,
			"internalError", apiErr.InternalErr,
		)
	}

	jsonResponseWithStatus(w, apiErr.Code, resp)
}

// HandleAPIError writes an API error as JSON response and returns true if an error was handled
func HandleAPIError(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	var apiErr *APIError
	if errors.As(err, &apiErr) {
		writeErrorResponse(w, apiErr)
		return true
	}
	// Wrap unknown errors with safe generic message
	// SECURITY: Never expose raw error messages to users
	wrappedErr := NewInternalError(err, "内部エラーが発生しました")
	writeErrorResponse(w, wrappedErr)
	return true
}

// NewAPIError creates a new APIError with the given code and message
func NewAPIError(code int, msg string) *APIError {
	return &APIError{Code: code, Msg: msg, ErrorCode: ErrCodeInternal}
}

// NewInternalError creates an internal server error with safe message
func NewInternalError(internalErr error, userMsg string) *APIError {
	return &APIError{
		Code:        http.StatusInternalServerError,
		Msg:         userMsg,
		ErrorCode:   ErrCodeInternal,
		InternalErr: internalErr,
	}
}

// WrapAsNotFound wraps a "not found" error with context
func WrapAsNotFound(resource, identifier string) *APIError {
	return &APIError{
		Code:      http.StatusNotFound,
		Msg:       resource + "が見つかりません: " + identifier,
		ErrorCode: ErrCodeNotFound,
	}
}

// WrapServiceError maps service-layer errors to appropriate APIErrors
func WrapServiceError(err error, defaultMsg string) *APIError {
	if err == nil {
		return nil
	}

	// Check for known service errors and map to user-friendly messages
	switch {
	case errors.Is(err, services.ErrWorktreeNotFound):
		return &APIError{
			Code:        http.StatusNotFound,
			Msg:         "ワークツリーが見つかりません",
			ErrorCode:   ErrCodeWorktreeNotFound,
			InternalErr: err,
		}
	case errors.Is(err, services.ErrCannotDeleteMain):
		return &APIError{
			Code:        http.StatusBadRequest,
			Msg:         "メインワークツリーは削除できません",
			ErrorCode:   ErrCodeCannotDeleteMain,
			InternalErr: err,
		}
	case errors.Is(err, services.ErrUncommittedChanges):
		return &APIError{
			Code:        http.StatusConflict,
			Msg:         "コミットされていない変更があります。force=trueで強制削除できます。",
			ErrorCode:   ErrCodeUncommittedChanges,
			InternalErr: err,
		}
	case errors.Is(err, services.ErrPathTraversal):
		return &APIError{
			Code:        http.StatusBadRequest,
			Msg:         "無効なパスです：許可されたディレクトリ外へのアクセスはできません",
			ErrorCode:   ErrCodePathTraversal,
			InternalErr: err,
		}
	case errors.Is(err, services.ErrBranchRequired):
		return &APIError{
			Code:        http.StatusBadRequest,
			Msg:         "ブランチ名は必須です",
			ErrorCode:   ErrCodeBranchRequired,
			InternalErr: err,
		}
	case errors.Is(err, services.ErrInvalidBranchName):
		return &APIError{
			Code:        http.StatusBadRequest,
			Msg:         "無効なブランチ名です",
			ErrorCode:   ErrCodeInvalidBranchName,
			InternalErr: err,
		}
	case errors.Is(err, services.ErrFetchFailed):
		return &APIError{
			Code:        http.StatusInternalServerError,
			Msg:         "フェッチに失敗しました。ネットワーク接続を確認してください。",
			ErrorCode:   ErrCodeFetchFailed,
			InternalErr: err,
		}
	case errors.Is(err, services.ErrWorktreeAlreadyOpened):
		// Use the error message directly as it contains the client type
		return &APIError{
			Code:        http.StatusConflict,
			Msg:         err.Error(),
			ErrorCode:   ErrCodeWorktreeAlreadyOpened,
			InternalErr: err,
		}
	default:
		return NewInternalError(err, defaultMsg)
	}
}
