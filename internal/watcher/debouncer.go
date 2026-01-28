package watcher

import (
	"context"
	"sync"
	"time"
)

// EventDebouncer collects events and flushes them in batches
// after a configurable debounce interval
type EventDebouncer struct {
	interval time.Duration
	handler  EventHandler

	pending   map[string]FileEvent
	pendingMu sync.Mutex

	ctx       context.Context
	cancel    context.CancelFunc
	started   bool
	startedMu sync.Mutex
}

// DebouncerConfig holds configuration for creating an EventDebouncer
type DebouncerConfig struct {
	Interval time.Duration // Debounce interval (default: 100ms)
	Handler  EventHandler  // Callback for flushed events
}

// NewEventDebouncer creates a new EventDebouncer with the given configuration
func NewEventDebouncer(cfg DebouncerConfig) *EventDebouncer {
	interval := cfg.Interval
	if interval == 0 {
		interval = defaultDebounceInterval
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &EventDebouncer{
		interval: interval,
		handler:  cfg.Handler,
		pending:  make(map[string]FileEvent),
		ctx:      ctx,
		cancel:   cancel,
	}
}

// Start begins the debouncer's flush goroutine
func (d *EventDebouncer) Start() {
	d.startedMu.Lock()
	if d.started {
		d.startedMu.Unlock()
		return
	}
	d.started = true
	d.startedMu.Unlock()

	go d.flushLoop()
}

// Stop stops the debouncer and flushes any remaining events
func (d *EventDebouncer) Stop() {
	d.startedMu.Lock()
	if !d.started {
		d.startedMu.Unlock()
		return
	}
	d.started = false
	d.startedMu.Unlock()

	d.cancel()

	// Flush remaining events
	d.flush()
}

// Add adds an event to the pending map
// Events for the same path are merged, with Create taking precedence over Write
func (d *EventDebouncer) Add(event FileEvent) {
	d.pendingMu.Lock()
	defer d.pendingMu.Unlock()

	if existing, ok := d.pending[event.Path]; ok {
		// Preserve "create" event type if a "write" follows
		// This ensures the frontend receives the create event for new files
		if existing.EventType == EventCreate && event.EventType == EventWrite {
			// Keep the create event, just update IsDir if needed
			d.pending[event.Path] = FileEvent{
				Path:      event.Path,
				EventType: EventCreate,
				IsDir:     event.IsDir,
			}
			return
		}
	}
	d.pending[event.Path] = event
}

// flushLoop runs the periodic flush cycle
func (d *EventDebouncer) flushLoop() {
	ticker := time.NewTicker(d.interval)
	defer ticker.Stop()

	for {
		select {
		case <-d.ctx.Done():
			return
		case <-ticker.C:
			d.flush()
		}
	}
}

// flush sends all pending events to the handler and clears the pending map
func (d *EventDebouncer) flush() {
	d.pendingMu.Lock()
	events := d.pending
	d.pending = make(map[string]FileEvent)
	d.pendingMu.Unlock()

	// Send all events in a single batch
	if len(events) > 0 && d.handler != nil {
		eventList := make([]FileEvent, 0, len(events))
		for _, event := range events {
			eventList = append(eventList, event)
		}
		d.handler(eventList)
	}
}

// PendingCount returns the number of pending events (for testing)
func (d *EventDebouncer) PendingCount() int {
	d.pendingMu.Lock()
	defer d.pendingMu.Unlock()
	return len(d.pending)
}
