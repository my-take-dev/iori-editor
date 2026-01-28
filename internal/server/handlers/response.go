package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// jsonResponse sends a JSON response with 200 OK status
func jsonResponse(w http.ResponseWriter, data interface{}) {
	jsonResponseWithStatus(w, http.StatusOK, data)
}

// jsonResponseWithStatus sends a JSON response with the specified status code
func jsonResponseWithStatus(w http.ResponseWriter, status int, data interface{}) {
	// Pre-encode to detect errors before sending headers
	jsonData, err := json.Marshal(data)
	if err != nil {
		slog.Error("Failed to encode JSON response", "error", err)
		http.Error(w, `{"error":"internal encoding error"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if _, err := w.Write(jsonData); err != nil {
		slog.Warn("Failed to write JSON response", "error", err)
	}
}

// jsonError sends a JSON error response
func jsonError(w http.ResponseWriter, message string, status int) {
	// Pre-encode to detect errors before sending headers (consistent with jsonResponse)
	jsonData, err := json.Marshal(map[string]string{"error": message})
	if err != nil {
		slog.Error("Failed to encode JSON error response", "error", err)
		http.Error(w, `{"error":"internal encoding error"}`, status)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if _, err := w.Write(jsonData); err != nil {
		slog.Warn("Failed to write JSON error response", "error", err)
	}
}
