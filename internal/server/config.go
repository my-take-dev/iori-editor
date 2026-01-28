package server

import (
	"fmt"
	"log/slog"
	"net"
	"strconv"
	"strings"

	"iori-editor/internal/validation"
)

const (
	minPort           = 1024  // Minimum allowed port number
	maxPort           = 65535 // Maximum allowed port number
	minPasswordLength = 12    // Minimum password length for security
)

// Config holds the server configuration
type Config struct {
	IP          string `json:"ip"`          // Bind IP address (empty for all interfaces)
	Port        int    `json:"port"`        // Server port (1024-65535)
	BaseBranch  string `json:"baseBranch"`  // Base branch for worktree operations
	SessionID   string `json:"sessionId"`   // Target session ID
	Password    string `json:"password"`    // Authentication password (empty for no auth)
	RepoPath    string `json:"repoPath"`    // Repository path
	HasPassword bool   `json:"hasPassword"` // Whether password authentication is enabled (read-only, set by server)
}

// DefaultConfig returns a config with default values
func DefaultConfig() *Config {
	return &Config{
		IP:         "",
		Port:       8080,
		BaseBranch: "main",
		SessionID:  "",
		Password:   "",
		RepoPath:   "",
	}
}

// Validate checks if the configuration is valid
func (c *Config) Validate() error {
	// Port validation
	if c.Port < minPort || c.Port > maxPort {
		return fmt.Errorf("port must be between %d and %d, got %d", minPort, maxPort, c.Port)
	}

	// IP validation (if provided)
	if c.IP != "" && c.IP != "localhost" {
		ip := net.ParseIP(c.IP)
		if ip == nil {
			return fmt.Errorf("invalid IP address: %s", c.IP)
		}
	}

	// RepoPath validation
	if c.RepoPath == "" {
		return fmt.Errorf("repository path is required")
	}

	// BaseBranch validation (if provided)
	if c.BaseBranch != "" && !validation.IsValidBranchName(c.BaseBranch) {
		return fmt.Errorf("invalid base branch name: %s (must contain only alphanumeric characters, dots, underscores, hyphens, and slashes)", c.BaseBranch)
	}

	// Password validation (if provided)
	// Minimum characters for better security (modern best practice)
	if c.Password != "" && len(c.Password) < minPasswordLength {
		return fmt.Errorf("password must be at least %d characters for security", minPasswordLength)
	}

	return nil
}

// Address returns the bind address string
func (c *Config) Address() string {
	return net.JoinHostPort(c.IP, strconv.Itoa(c.Port))
}

// URL returns the server URL for the given IP
func (c *Config) URL(ip string) string {
	if ip == "" {
		ip = "localhost"
	}
	return fmt.Sprintf("http://%s:%d", ip, c.Port)
}

// GetLocalIPAddresses returns all local IP addresses
func GetLocalIPAddresses() ([]string, error) {
	var ips []string

	interfaces, err := net.Interfaces()
	if err != nil {
		return nil, fmt.Errorf("failed to get network interfaces: %w", err)
	}

	for _, iface := range interfaces {
		// Skip loopback and down interfaces
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			slog.Warn("Failed to get addresses for interface", "interface", iface.Name, "error", err)
			continue
		}

		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}

			// Skip non-IPv4 and loopback addresses
			if ip == nil || ip.IsLoopback() || ip.To4() == nil {
				continue
			}

			// Skip link-local addresses (169.254.x.x)
			if strings.HasPrefix(ip.String(), "169.254.") {
				continue
			}

			ips = append(ips, ip.String())
		}
	}

	// Add localhost as fallback
	if len(ips) == 0 {
		slog.Warn("No external IP addresses found, falling back to localhost. Mobile/tablet access may not work.")
		ips = append(ips, "127.0.0.1")
	}

	return ips, nil
}

// IsLocalhostOnly checks if the IP list only contains localhost addresses
// This indicates that external IPs were not found and mobile access may not work
func IsLocalhostOnly(ips []string) bool {
	if len(ips) == 0 {
		return false
	}
	for _, ip := range ips {
		if ip != "127.0.0.1" && ip != "localhost" && ip != "::1" {
			return false
		}
	}
	return true
}

// ServerStatus represents the current server status
type ServerStatus struct {
	Running   bool   `json:"running"`
	IP        string `json:"ip"`
	Port      int    `json:"port"`
	URL       string `json:"url"`
	Error     string `json:"error,omitempty"`
	Warning   string `json:"warning,omitempty"`
	SessionID string `json:"sessionId,omitempty"`
}
