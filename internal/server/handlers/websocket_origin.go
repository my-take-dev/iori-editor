package handlers

import (
	"net"
	"net/http"
	"net/url"

	"github.com/gorilla/websocket"
)

const (
	wsReadBufferSize  = 1024 // WebSocket read buffer size
	wsWriteBufferSize = 1024 // WebSocket write buffer size
)

// upgrader is the WebSocket upgrader with origin checking
var upgrader = websocket.Upgrader{
	ReadBufferSize:  wsReadBufferSize,
	WriteBufferSize: wsWriteBufferSize,
	CheckOrigin: func(r *http.Request) bool {
		// Allow same-origin requests (no Origin header)
		origin := r.Header.Get("Origin")
		if origin == "" {
			return true
		}
		// Allow local network origins for mobile/tablet access
		// This is acceptable because the server requires authentication
		// via session cookie for all requests
		return isLocalNetworkOrigin(origin)
	},
}

// isLocalNetworkOrigin checks if the origin is from a local network address
func isLocalNetworkOrigin(origin string) bool {
	host, err := parseOriginHost(origin)
	if err != nil {
		return false
	}

	// Allow localhost
	if host == "localhost" || host == "127.0.0.1" || host == "::1" {
		return true
	}

	return isPrivateOrLoopback(host)
}

// parseOriginHost extracts the host from an origin URL using proper parsing
func parseOriginHost(origin string) (string, error) {
	parsedURL, err := url.Parse(origin)
	if err != nil || parsedURL.Host == "" {
		return "", err
	}

	host := parsedURL.Host

	// Remove port if present using net.SplitHostPort
	// This correctly handles IPv6 addresses like [::1]:8080
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	// Note: SplitHostPort returns error if no port is present,
	// in which case we use the host as-is

	return host, nil
}

// isPrivateOrLoopback checks if an IP address is private or loopback
func isPrivateOrLoopback(host string) bool {
	ip := net.ParseIP(host)
	if ip == nil {
		return false
	}

	// Private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
	return ip.IsPrivate() || ip.IsLoopback()
}
