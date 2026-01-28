package handlers

import (
	"encoding/json"
	"net/http"
)

// Validatable is implemented by request structs that can validate themselves
type Validatable interface {
	Validate() error
}

// DecodeAndValidate decodes JSON request body and validates it
// Returns APIError on failure
func DecodeAndValidate[T Validatable](r *http.Request, req T) error {
	if err := json.NewDecoder(r.Body).Decode(req); err != nil {
		return &APIError{
			Code: http.StatusBadRequest,
			Msg:  "Invalid request body",
		}
	}
	if err := req.Validate(); err != nil {
		return err
	}
	return nil
}

// ValidateBranchParam validates a branch name from URL path parameter
// Returns the branch name if valid, or an error if invalid
func ValidateBranchParam(branch string) error {
	if branch == "" {
		return ErrBranchRequired
	}
	return nil
}

// ParseBoolQueryParam parses a boolean query parameter with a default value
func ParseBoolQueryParam(r *http.Request, key string, defaultValue bool) bool {
	value := r.URL.Query().Get(key)
	if value == "" {
		return defaultValue
	}
	return value == "true"
}
