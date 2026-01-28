package watcher

import (
	"sync"
	"testing"
	"time"
)

func TestEventDebouncer_MergeEvents(t *testing.T) {
	var received []FileEvent
	var mu sync.Mutex

	d := NewEventDebouncer(DebouncerConfig{
		Interval: 50 * time.Millisecond,
		Handler: func(events []FileEvent) {
			mu.Lock()
			received = append(received, events...)
			mu.Unlock()
		},
	})
	d.Start()
	defer d.Stop()

	// Add multiple events for the same path
	d.Add(FileEvent{Path: "test.txt", EventType: EventWrite})
	d.Add(FileEvent{Path: "test.txt", EventType: EventWrite})
	d.Add(FileEvent{Path: "test.txt", EventType: EventWrite})

	// Wait for flush
	time.Sleep(100 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()

	if len(received) != 1 {
		t.Errorf("Expected 1 merged event, got %d", len(received))
	}
	if len(received) > 0 && received[0].Path != "test.txt" {
		t.Errorf("Expected path test.txt, got %s", received[0].Path)
	}
}

func TestEventDebouncer_PreserveCreate(t *testing.T) {
	var received []FileEvent
	var mu sync.Mutex

	d := NewEventDebouncer(DebouncerConfig{
		Interval: 50 * time.Millisecond,
		Handler: func(events []FileEvent) {
			mu.Lock()
			received = append(received, events...)
			mu.Unlock()
		},
	})
	d.Start()
	defer d.Stop()

	// Add create then write for same file
	d.Add(FileEvent{Path: "new.txt", EventType: EventCreate})
	d.Add(FileEvent{Path: "new.txt", EventType: EventWrite})
	d.Add(FileEvent{Path: "new.txt", EventType: EventWrite})

	// Wait for flush
	time.Sleep(100 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()

	if len(received) != 1 {
		t.Fatalf("Expected 1 event, got %d", len(received))
	}
	if received[0].EventType != EventCreate {
		t.Errorf("Expected EventCreate, got %s", received[0].EventType)
	}
}

func TestEventDebouncer_FlushInterval(t *testing.T) {
	flushCount := 0
	var mu sync.Mutex

	d := NewEventDebouncer(DebouncerConfig{
		Interval: 30 * time.Millisecond,
		Handler: func(events []FileEvent) {
			mu.Lock()
			flushCount++
			mu.Unlock()
		},
	})
	d.Start()
	defer d.Stop()

	// Add event
	d.Add(FileEvent{Path: "test.txt", EventType: EventWrite})

	// Should not flush immediately
	mu.Lock()
	immediate := flushCount
	mu.Unlock()
	if immediate != 0 {
		t.Errorf("Expected no immediate flush, got %d", immediate)
	}

	// Wait for flush interval
	time.Sleep(50 * time.Millisecond)

	mu.Lock()
	afterInterval := flushCount
	mu.Unlock()
	if afterInterval != 1 {
		t.Errorf("Expected 1 flush after interval, got %d", afterInterval)
	}
}

func TestEventDebouncer_MultiplePaths(t *testing.T) {
	var received []FileEvent
	var mu sync.Mutex

	d := NewEventDebouncer(DebouncerConfig{
		Interval: 50 * time.Millisecond,
		Handler: func(events []FileEvent) {
			mu.Lock()
			received = append(received, events...)
			mu.Unlock()
		},
	})
	d.Start()
	defer d.Stop()

	// Add events for different paths
	d.Add(FileEvent{Path: "file1.txt", EventType: EventCreate})
	d.Add(FileEvent{Path: "file2.txt", EventType: EventWrite})
	d.Add(FileEvent{Path: "file3.txt", EventType: EventRemove})

	// Wait for flush
	time.Sleep(100 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()

	if len(received) != 3 {
		t.Errorf("Expected 3 events, got %d", len(received))
	}

	// Check all paths are present
	paths := make(map[string]bool)
	for _, e := range received {
		paths[e.Path] = true
	}
	if !paths["file1.txt"] || !paths["file2.txt"] || !paths["file3.txt"] {
		t.Error("Not all paths were received")
	}
}

func TestEventDebouncer_Stop(t *testing.T) {
	var received []FileEvent
	var mu sync.Mutex

	d := NewEventDebouncer(DebouncerConfig{
		Interval: 100 * time.Millisecond, // Long interval
		Handler: func(events []FileEvent) {
			mu.Lock()
			received = append(received, events...)
			mu.Unlock()
		},
	})
	d.Start()

	// Add events
	d.Add(FileEvent{Path: "test.txt", EventType: EventWrite})

	// Stop immediately (before interval)
	d.Stop()

	// Events should be flushed on stop
	mu.Lock()
	defer mu.Unlock()

	if len(received) != 1 {
		t.Errorf("Expected 1 event flushed on stop, got %d", len(received))
	}
}

func TestEventDebouncer_Concurrent(t *testing.T) {
	var received []FileEvent
	var mu sync.Mutex

	d := NewEventDebouncer(DebouncerConfig{
		Interval: 50 * time.Millisecond,
		Handler: func(events []FileEvent) {
			mu.Lock()
			received = append(received, events...)
			mu.Unlock()
		},
	})
	d.Start()
	defer d.Stop()

	// Add events from multiple goroutines
	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				d.Add(FileEvent{
					Path:      "concurrent.txt",
					EventType: EventWrite,
				})
			}
		}(i)
	}
	wg.Wait()

	// Wait for flush
	time.Sleep(100 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()

	// All events for same path should be merged
	if len(received) != 1 {
		t.Errorf("Expected 1 merged event, got %d", len(received))
	}
}

func TestEventDebouncer_DefaultInterval(t *testing.T) {
	d := NewEventDebouncer(DebouncerConfig{
		Interval: 0, // Should use default
		Handler:  nil,
	})

	if d.interval != defaultDebounceInterval {
		t.Errorf("Expected default interval %v, got %v", defaultDebounceInterval, d.interval)
	}
}

func TestEventDebouncer_NoHandler(t *testing.T) {
	d := NewEventDebouncer(DebouncerConfig{
		Interval: 20 * time.Millisecond,
		Handler:  nil, // No handler
	})
	d.Start()
	defer d.Stop()

	// Should not panic with nil handler
	d.Add(FileEvent{Path: "test.txt", EventType: EventWrite})

	// Wait for flush
	time.Sleep(50 * time.Millisecond)

	// Test passes if no panic occurred
}

func TestEventDebouncer_PendingCount(t *testing.T) {
	d := NewEventDebouncer(DebouncerConfig{
		Interval: 1 * time.Second, // Long interval to prevent flush
		Handler:  nil,
	})
	// Don't start, just test Add

	if d.PendingCount() != 0 {
		t.Error("Expected 0 pending initially")
	}

	d.Add(FileEvent{Path: "file1.txt", EventType: EventWrite})
	d.Add(FileEvent{Path: "file2.txt", EventType: EventWrite})
	d.Add(FileEvent{Path: "file3.txt", EventType: EventWrite})

	if d.PendingCount() != 3 {
		t.Errorf("Expected 3 pending, got %d", d.PendingCount())
	}

	// Same path should merge
	d.Add(FileEvent{Path: "file1.txt", EventType: EventWrite})

	if d.PendingCount() != 3 {
		t.Errorf("Expected 3 pending after merge, got %d", d.PendingCount())
	}
}

func TestEventDebouncer_DoubleStart(t *testing.T) {
	d := NewEventDebouncer(DebouncerConfig{
		Interval: 50 * time.Millisecond,
		Handler:  nil,
	})

	// Start twice should not cause issues
	d.Start()
	d.Start()

	d.Stop()
	// Test passes if no panic occurred
}

func TestEventDebouncer_DoubleStop(t *testing.T) {
	d := NewEventDebouncer(DebouncerConfig{
		Interval: 50 * time.Millisecond,
		Handler:  nil,
	})
	d.Start()

	// Stop twice should not cause issues
	d.Stop()
	d.Stop()

	// Test passes if no panic occurred
}
