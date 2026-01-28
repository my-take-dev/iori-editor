package main

import (
	"encoding/base64"
	"fmt"

	"github.com/skip2/go-qrcode"

	"iori-editor/internal/server"
)

// ServerConfig is the configuration for server mode (re-exported for Wails binding)
type ServerConfig = server.Config

// ServerStatus is the status of the server (re-exported for Wails binding)
type ServerStatus = server.ServerStatus

// StartServer starts the embedded HTTP server for mobile access
func (a *App) StartServer(config ServerConfig) error {
	a.mu.Lock()
	if a.server == nil {
		a.initServer()
	}
	srv := a.server
	a.mu.Unlock()

	if err := srv.Start(&config); err != nil {
		a.emitLog("error", "Failed to start server", err.Error())
		return fmt.Errorf("start server: %w", err)
	}

	status := srv.GetStatus()
	a.emitLog("success", "Server started", status.URL)

	return nil
}

// StopServer stops the embedded HTTP server
func (a *App) StopServer() error {
	a.mu.Lock()
	srv := a.server
	a.mu.Unlock()

	if srv == nil {
		return nil
	}

	if err := srv.Stop(); err != nil {
		a.emitLog("error", "Failed to stop server", err.Error())
		return fmt.Errorf("stop server: %w", err)
	}

	a.emitLog("info", "Server stopped", "")
	return nil
}

// GetServerStatus returns the current server status
func (a *App) GetServerStatus() ServerStatus {
	a.mu.RLock()
	srv := a.server
	a.mu.RUnlock()

	if srv == nil {
		return ServerStatus{Running: false}
	}

	return srv.GetStatus()
}

// GetLocalIPAddresses returns all local IP addresses for server binding
func (a *App) GetLocalIPAddresses() ([]string, error) {
	return server.GetLocalIPAddresses()
}

// GetDefaultServerConfig returns default server configuration
func (a *App) GetDefaultServerConfig() ServerConfig {
	config := server.DefaultConfig()

	// Set repository path from active session if available
	if sess := a.sessionManager.GetActiveSession(); sess != nil {
		config.RepoPath = sess.WorkDir
		config.SessionID = sess.ID
	}

	return *config
}

// GenerateQRCode generates a QR code for the given URL and returns it as a base64 encoded PNG
func (a *App) GenerateQRCode(url string) (string, error) {
	// Generate QR code with medium recovery level, 256x256 pixels
	png, err := qrcode.Encode(url, qrcode.Medium, 256)
	if err != nil {
		return "", fmt.Errorf("failed to generate QR code: %w", err)
	}

	// Encode to base64
	base64Str := base64.StdEncoding.EncodeToString(png)

	// Return as data URL for direct use in img src
	return "data:image/png;base64," + base64Str, nil
}

// initServer initializes the server instance (called lazily)
func (a *App) initServer() {
	a.server = server.New(
		a.sessionManager,
		a.terminalService,
		a.worktreeService,
		a.fileService,
		a.gitService,
	)
}
