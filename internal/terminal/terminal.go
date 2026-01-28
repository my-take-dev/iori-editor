package terminal

import (
	"fmt"
	"io"
	"os"
	"sync"
)

// Terminal represents a pseudo-terminal instance using Windows ConPTY
type Terminal struct {
	ID      string
	WorkDir string
	cpty    *ConPty
	mu      sync.Mutex
	closed  bool
}

// New creates a new Terminal instance
func New(id string, workDir string) (*Terminal, error) {
	// Validate working directory
	if workDir != "" {
		if _, err := os.Stat(workDir); err != nil {
			return nil, fmt.Errorf("invalid working directory: %w", err)
		}
	}

	t := &Terminal{
		ID:      id,
		WorkDir: workDir,
	}

	if err := t.start(); err != nil {
		return nil, err
	}

	return t, nil
}

// start initializes the ConPTY and starts the shell process
func (t *Terminal) start() error {
	// Use PowerShell as default shell on Windows
	// -NoLogo: Skip the startup banner for cleaner output
	// -NoProfile: Skip loading user profile for faster startup
	shell := "powershell.exe -NoLogo -NoProfile"

	// Build ConPTY options
	opts := []ConPtyOption{
		ConPtyDimensions(120, 30),
	}

	// Set working directory if specified
	if t.WorkDir != "" {
		opts = append(opts, ConPtyWorkDir(t.WorkDir))
	}

	// Create ConPTY with options
	cpty, err := Start(shell, opts...)
	if err != nil {
		return fmt.Errorf("failed to start conpty: %w", err)
	}

	t.cpty = cpty
	return nil
}

// Read reads data from the terminal output
func (t *Terminal) Read(p []byte) (int, error) {
	t.mu.Lock()
	if t.closed {
		t.mu.Unlock()
		return 0, io.EOF
	}
	cpty := t.cpty
	t.mu.Unlock()

	if cpty == nil {
		return 0, io.EOF
	}

	return cpty.Read(p)
}

// Write writes data to the terminal input
func (t *Terminal) Write(p []byte) (int, error) {
	t.mu.Lock()
	if t.closed {
		t.mu.Unlock()
		return 0, io.EOF
	}
	cpty := t.cpty
	t.mu.Unlock()

	if cpty == nil {
		return 0, io.EOF
	}

	return cpty.Write(p)
}

// Resize changes the terminal dimensions
func (t *Terminal) Resize(cols, rows int) error {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.closed || t.cpty == nil {
		return fmt.Errorf("terminal is closed")
	}

	return t.cpty.Resize(cols, rows)
}

// Close terminates the terminal
func (t *Terminal) Close() error {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.closed {
		return nil
	}

	t.closed = true

	if t.cpty != nil {
		t.cpty.Close()
		t.cpty = nil
	}

	return nil
}

// IsClosed returns whether the terminal is closed
func (t *Terminal) IsClosed() bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.closed
}
