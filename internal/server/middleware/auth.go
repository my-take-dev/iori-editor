package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"
)

// TokenVerifier provides session token verification for authentication
type TokenVerifier interface {
	GetSessionToken() string
}

// AuthMiddleware creates authentication middleware that checks session tokens
// Requires a TokenVerifier to validate session cookies
func AuthMiddleware(tokenVerifier TokenVerifier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip auth for login page and static assets needed for login
			if r.URL.Path == "/login" ||
				r.URL.Path == "/api/auth/login" ||
				strings.HasPrefix(r.URL.Path, "/vendor/") ||
				strings.HasPrefix(r.URL.Path, "/static/") {
				next.ServeHTTP(w, r)
				return
			}

			// Check session cookie (timing-safe comparison to prevent timing attacks)
			// Use GetSessionToken to avoid generating token during auth check
			cookie, err := r.Cookie("iori_session")
			expectedToken := tokenVerifier.GetSessionToken()
			if err != nil || cookie == nil || expectedToken == "" || subtle.ConstantTimeCompare([]byte(cookie.Value), []byte(expectedToken)) != 1 {
				// Redirect to login page for HTML requests
				if r.Header.Get("Accept") == "" || r.Header.Get("Accept") == "text/html" || r.URL.Path == "/" {
					http.Redirect(w, r, "/login", http.StatusFound)
					return
				}
				// Return 401 for API requests
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
