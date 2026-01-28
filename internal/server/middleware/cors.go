package middleware

import (
	"net"
	"net/http"
	"strings"
)

// CORSMiddleware adds CORS headers for local network access
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		// Only allow CORS for local network origins
		if origin != "" && isLocalNetworkOrigin(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// isLocalNetworkOrigin checks if the origin is from a local network address
func isLocalNetworkOrigin(origin string) bool {
	if len(origin) < 7 {
		return false
	}
	host := origin
	if idx := strings.Index(origin, "://"); idx != -1 {
		host = origin[idx+3:]
	}
	if idx := strings.Index(host, ":"); idx != -1 {
		host = host[:idx]
	}
	if host == "localhost" || host == "127.0.0.1" || host == "::1" {
		return true
	}
	ip := net.ParseIP(host)
	if ip == nil {
		return false
	}
	return ip.IsPrivate() || ip.IsLoopback()
}
