package watcher

import "time"

// EventType represents the type of file system event
type EventType string

const (
	EventCreate EventType = "create"
	EventWrite  EventType = "write"
	EventRemove EventType = "remove"
	EventRename EventType = "rename"

	defaultDebounceInterval = 100 * time.Millisecond // File change debounce interval
)

// FileEvent represents a file system change event
type FileEvent struct {
	Path      string    `json:"path"`
	EventType EventType `json:"eventType"`
	IsDir     bool      `json:"isDir"`
}

// EventHandler is a callback function for file events (batch processing)
type EventHandler func(events []FileEvent)

// WatcherState represents the initialization state of the watcher
type WatcherState int32

const (
	StateCreated  WatcherState = iota // Initial state after New()
	StateScanning                     // filepath.Walk in progress
	StateReady                        // Ready to receive and process events
	StateStopped                      // Stopped
)

// String returns the string representation of WatcherState
func (s WatcherState) String() string {
	switch s {
	case StateCreated:
		return "created"
	case StateScanning:
		return "scanning"
	case StateReady:
		return "ready"
	case StateStopped:
		return "stopped"
	default:
		return "unknown"
	}
}
