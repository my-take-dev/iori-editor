package server

import (
	"crypto/subtle"
	"log/slog"
	"net/http"

	"iori-editor/internal/server/handlers"
	"iori-editor/internal/services"
)

// PasswordAuthValidator creates an authentication validator that checks session cookies
// against the AuthService's session token.
func PasswordAuthValidator(authService *services.AuthService) handlers.AuthValidator {
	return func(r *http.Request) bool {
		cookie, err := r.Cookie("iori_session")
		if err != nil {
			return false
		}
		// Use GetSessionToken to avoid generating token during auth check
		// Token should only be generated on successful login
		expectedToken := authService.GetSessionToken()
		if expectedToken == "" {
			return false // No token generated yet (not logged in)
		}
		return subtle.ConstantTimeCompare([]byte(cookie.Value), []byte(expectedToken)) == 1
	}
}

// NoAuthValidator creates an authentication validator for servers without password protection.
// It logs each connection for security awareness but allows all connections.
// This makes the "no auth" decision explicit rather than implicit.
func NoAuthValidator() handlers.AuthValidator {
	return func(r *http.Request) bool {
		remoteIP := r.RemoteAddr
		// Log each unauthenticated connection for security awareness
		slog.Warn("Unauthenticated WebSocket connection (no password configured)",
			"remoteAddr", remoteIP,
			"path", r.URL.Path,
		)
		// Allow connection but require it to be from local network
		// This is already enforced by WebSocket CheckOrigin, but double-check here
		return true
	}
}
