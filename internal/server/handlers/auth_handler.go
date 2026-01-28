package handlers

import (
	"crypto/subtle"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"time"
)

// AuthConfig holds the configuration needed for authentication
type AuthConfig struct {
	Password string
}

// RateLimiter defines the interface for login rate limiting
type RateLimiter interface {
	CheckLoginRateLimit(ip string) (allowed bool, lockoutRemaining time.Duration)
	RecordLoginFailure(ip string) time.Duration
	RecordLoginSuccess(ip string)
}

// TokenGenerator defines the interface for session token generation
type TokenGenerator interface {
	GenerateSessionToken() (string, error)
}

// AuthHandler handles authentication requests
type AuthHandler struct {
	config         *AuthConfig
	rateLimiter    RateLimiter
	tokenGenerator TokenGenerator
}

// NewAuthHandler creates a new AuthHandler
func NewAuthHandler(config *AuthConfig, rateLimiter RateLimiter, tokenGenerator TokenGenerator) *AuthHandler {
	return &AuthHandler{
		config:         config,
		rateLimiter:    rateLimiter,
		tokenGenerator: tokenGenerator,
	}
}

// getClientIP extracts the client IP address from the request
// SECURITY: Only uses RemoteAddr, not X-Forwarded-For, because X-Forwarded-For
// can be spoofed by clients to bypass rate limiting. For local network usage,
// RemoteAddr is sufficient and more secure.
func getClientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// HandleLogin processes login form
func (h *AuthHandler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	clientIP := getClientIP(r)

	// Check rate limiting
	allowed, lockoutRemaining := h.rateLimiter.CheckLoginRateLimit(clientIP)
	if !allowed {
		slog.Warn("Login attempt blocked by rate limit",
			"ip", clientIP,
			"lockoutRemaining", lockoutRemaining,
		)
		if r.Header.Get("HX-Request") == "true" {
			w.Header().Set("Content-Type", "text/html")
			w.WriteHeader(http.StatusTooManyRequests)
			seconds := int(lockoutRemaining.Seconds())
			errMsg := fmt.Sprintf(`<div class="error">ログイン試行回数が上限に達しました。%d秒後に再試行してください</div>`, seconds)
			if _, err := w.Write([]byte(errMsg)); err != nil {
				slog.Warn("Failed to write rate limit response", "error", err)
			}
			return
		}
		http.Error(w, fmt.Sprintf("Too many login attempts. Try again in %d seconds", int(lockoutRemaining.Seconds())), http.StatusTooManyRequests)
		return
	}

	password := r.FormValue("password")
	// Use constant-time comparison to prevent timing attacks
	if subtle.ConstantTimeCompare([]byte(password), []byte(h.config.Password)) == 1 {
		// Clear rate limit counter on successful login
		h.rateLimiter.RecordLoginSuccess(clientIP)

		// Generate session token with proper error handling
		token, err := h.tokenGenerator.GenerateSessionToken()
		if err != nil {
			slog.Error("Failed to generate session token", "error", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Set session cookie with security flags
		// Secure flag is set when behind HTTPS (detected via X-Forwarded-Proto or TLS)
		isSecure := r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"
		http.SetCookie(w, &http.Cookie{
			Name:     "iori_session",
			Value:    token,
			Path:     "/",
			HttpOnly: true,
			Secure:   isSecure,
			SameSite: http.SameSiteStrictMode, // Changed from Lax to Strict for better security
		})

		// Check if this is an htmx request
		if r.Header.Get("HX-Request") == "true" {
			w.Header().Set("HX-Redirect", "/")
			w.WriteHeader(http.StatusOK)
			return
		}

		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	// Wrong password - record failure
	lockoutDuration := h.rateLimiter.RecordLoginFailure(clientIP)

	// Respond with error
	if r.Header.Get("HX-Request") == "true" {
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusUnauthorized)
		var errMsg string
		if lockoutDuration > 0 {
			errMsg = fmt.Sprintf(`<div class="error">パスワードが正しくありません。ログイン試行回数が上限に達しました。%d秒後に再試行してください</div>`, int(lockoutDuration.Seconds()))
		} else {
			errMsg = `<div class="error">パスワードが正しくありません</div>`
		}
		if _, err := w.Write([]byte(errMsg)); err != nil {
			slog.Warn("Failed to write login error response", "error", err)
		}
		return
	}

	http.Redirect(w, r, "/login?error=1", http.StatusFound)
}

// HandleLogout clears the session
func (h *AuthHandler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:   "iori_session",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})

	http.Redirect(w, r, "/login", http.StatusFound)
}
