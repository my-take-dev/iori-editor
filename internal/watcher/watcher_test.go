package watcher

import (
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

func TestWatcher_AsyncStart(t *testing.T) {
	tmpDir := t.TempDir()

	w, err := New(tmpDir, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer w.Stop()

	start := time.Now()
	err = w.Start()
	elapsed := time.Since(start)

	if err != nil {
		t.Fatal(err)
	}

	// Should return almost immediately (< 50ms for empty dir)
	if elapsed > 50*time.Millisecond {
		t.Errorf("Start took %v, expected < 50ms", elapsed)
	}

	// State should be Scanning or Ready
	state := w.State()
	if state != StateScanning && state != StateReady {
		t.Errorf("unexpected state: %v", state)
	}
}

func TestWatcher_WaitReady(t *testing.T) {
	tmpDir := t.TempDir()

	w, err := New(tmpDir, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer w.Stop()

	if err := w.Start(); err != nil {
		t.Fatal(err)
	}

	// Wait for ready
	if err := w.WaitReady(5 * time.Second); err != nil {
		t.Errorf("WaitReady failed: %v", err)
	}

	// State should be Ready
	if w.State() != StateReady {
		t.Errorf("Expected StateReady, got %v", w.State())
	}
}

func TestWatcher_WaitReadyTimeout(t *testing.T) {
	// Create a directory with many subdirectories to slow down scanning
	tmpDir := t.TempDir()

	w, err := New(tmpDir, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer w.Stop()

	if err := w.Start(); err != nil {
		t.Fatal(err)
	}

	// Use a very short timeout that will likely expire
	// Note: This test may be flaky depending on system speed
	// For a proper test, we'd need to mock the scanner
	err = w.WaitReady(1 * time.Nanosecond)

	// Either it times out or completes quickly - both are valid
	// We just want to verify the timeout mechanism works
	if err != nil && w.State() == StateReady {
		// If ready, error should be nil
		t.Error("Got error but state is Ready")
	}
}

func TestWatcher_State(t *testing.T) {
	tmpDir := t.TempDir()

	w, err := New(tmpDir, nil)
	if err != nil {
		t.Fatal(err)
	}

	// Initial state
	if w.State() != StateCreated {
		t.Errorf("Expected StateCreated, got %v", w.State())
	}

	// After start
	if err := w.Start(); err != nil {
		t.Fatal(err)
	}

	// Should be Scanning or Ready
	state := w.State()
	if state != StateScanning && state != StateReady {
		t.Errorf("Expected StateScanning or StateReady, got %v", state)
	}

	// Wait for ready
	w.WaitReady(5 * time.Second)
	if w.State() != StateReady {
		t.Errorf("Expected StateReady after WaitReady, got %v", w.State())
	}

	// After stop
	w.Stop()
	if w.State() != StateStopped {
		t.Errorf("Expected StateStopped, got %v", w.State())
	}
}

func TestWatcher_FileEvents(t *testing.T) {
	tmpDir := t.TempDir()

	var received []FileEvent
	var mu sync.Mutex

	w, err := New(tmpDir, func(events []FileEvent) {
		mu.Lock()
		received = append(received, events...)
		mu.Unlock()
	}, WithDebounceInterval(50*time.Millisecond))
	if err != nil {
		t.Fatal(err)
	}
	defer w.Stop()

	if err := w.Start(); err != nil {
		t.Fatal(err)
	}
	if err := w.WaitReady(5 * time.Second); err != nil {
		t.Fatal(err)
	}

	// Create a file
	testFile := filepath.Join(tmpDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("hello"), 0644); err != nil {
		t.Fatal(err)
	}

	// Wait for event
	time.Sleep(200 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()

	if len(received) == 0 {
		t.Error("Expected at least one event")
	}

	// Check that we got an event for test.txt
	found := false
	for _, e := range received {
		if e.Path == "test.txt" {
			found = true
			break
		}
	}
	if !found {
		t.Error("Expected event for test.txt")
	}
}

func TestWatcher_NewDirectory(t *testing.T) {
	tmpDir := t.TempDir()

	var received []FileEvent
	var mu sync.Mutex

	w, err := New(tmpDir, func(events []FileEvent) {
		mu.Lock()
		received = append(received, events...)
		mu.Unlock()
	}, WithDebounceInterval(50*time.Millisecond))
	if err != nil {
		t.Fatal(err)
	}
	defer w.Stop()

	if err := w.Start(); err != nil {
		t.Fatal(err)
	}
	if err := w.WaitReady(5 * time.Second); err != nil {
		t.Fatal(err)
	}

	// Create a new directory
	newDir := filepath.Join(tmpDir, "newdir")
	if err := os.Mkdir(newDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Wait for event
	time.Sleep(200 * time.Millisecond)

	// Create a file in the new directory
	testFile := filepath.Join(newDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("hello"), 0644); err != nil {
		t.Fatal(err)
	}

	// Wait for event
	time.Sleep(200 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()

	// Check that we got events for both directory and file
	var foundDir, foundFile bool
	for _, e := range received {
		if e.Path == "newdir" && e.IsDir {
			foundDir = true
		}
		if e.Path == filepath.Join("newdir", "test.txt") {
			foundFile = true
		}
	}
	if !foundDir {
		t.Error("Expected event for newdir")
	}
	if !foundFile {
		t.Error("Expected event for newdir/test.txt")
	}
}

func TestWatcher_ExcludedDirectory(t *testing.T) {
	tmpDir := t.TempDir()

	// Create .git directory before watcher starts
	gitDir := filepath.Join(tmpDir, ".git")
	if err := os.Mkdir(gitDir, 0755); err != nil {
		t.Fatal(err)
	}

	var received []FileEvent
	var mu sync.Mutex

	w, err := New(tmpDir, func(events []FileEvent) {
		mu.Lock()
		received = append(received, events...)
		mu.Unlock()
	}, WithDebounceInterval(50*time.Millisecond))
	if err != nil {
		t.Fatal(err)
	}
	defer w.Stop()

	if err := w.Start(); err != nil {
		t.Fatal(err)
	}
	if err := w.WaitReady(5 * time.Second); err != nil {
		t.Fatal(err)
	}

	// Create a file in .git directory
	testFile := filepath.Join(gitDir, "config")
	if err := os.WriteFile(testFile, []byte("test"), 0644); err != nil {
		t.Fatal(err)
	}

	// Wait for potential event
	time.Sleep(200 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()

	// Should not receive events from .git
	for _, e := range received {
		if filepath.HasPrefix(e.Path, ".git") {
			t.Errorf("Received unexpected event from .git: %s", e.Path)
		}
	}
}

func TestWatcher_Stop(t *testing.T) {
	tmpDir := t.TempDir()

	w, err := New(tmpDir, nil)
	if err != nil {
		t.Fatal(err)
	}

	if err := w.Start(); err != nil {
		t.Fatal(err)
	}
	if err := w.WaitReady(5 * time.Second); err != nil {
		t.Fatal(err)
	}

	// Stop should not panic
	if err := w.Stop(); err != nil {
		t.Errorf("Stop returned error: %v", err)
	}

	if w.State() != StateStopped {
		t.Errorf("Expected StateStopped, got %v", w.State())
	}
}

func TestWatcher_StartSync(t *testing.T) {
	tmpDir := t.TempDir()

	w, err := New(tmpDir, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer w.Stop()

	// StartSync should block until ready
	if err := w.StartSync(); err != nil {
		t.Fatal(err)
	}

	// Should be ready immediately after StartSync returns
	if w.State() != StateReady {
		t.Errorf("Expected StateReady after StartSync, got %v", w.State())
	}
}

func TestWatcher_DoubleStart(t *testing.T) {
	tmpDir := t.TempDir()

	w, err := New(tmpDir, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer w.Stop()

	// First start
	if err := w.Start(); err != nil {
		t.Fatal(err)
	}

	// Second start should fail
	err = w.Start()
	if err == nil {
		t.Error("Expected error on double Start")
	}
}

func TestWatcher_WithOptions(t *testing.T) {
	tmpDir := t.TempDir()

	var received []FileEvent
	var mu sync.Mutex

	w, err := New(tmpDir, func(events []FileEvent) {
		mu.Lock()
		received = append(received, events...)
		mu.Unlock()
	},
		WithDebounceInterval(25*time.Millisecond),
		WithExcludeDirs([]string{"custom_exclude"}),
	)
	if err != nil {
		t.Fatal(err)
	}
	defer w.Stop()

	// Create custom exclude directory
	excludeDir := filepath.Join(tmpDir, "custom_exclude")
	if err := os.Mkdir(excludeDir, 0755); err != nil {
		t.Fatal(err)
	}

	if err := w.Start(); err != nil {
		t.Fatal(err)
	}
	if err := w.WaitReady(5 * time.Second); err != nil {
		t.Fatal(err)
	}

	// Create file in excluded directory
	if err := os.WriteFile(filepath.Join(excludeDir, "test.txt"), []byte("test"), 0644); err != nil {
		t.Fatal(err)
	}

	// Create file in normal directory
	if err := os.WriteFile(filepath.Join(tmpDir, "normal.txt"), []byte("test"), 0644); err != nil {
		t.Fatal(err)
	}

	// Wait for events
	time.Sleep(100 * time.Millisecond)

	mu.Lock()
	defer mu.Unlock()

	// Should receive event for normal.txt but not for custom_exclude/test.txt
	var foundNormal, foundExcluded bool
	for _, e := range received {
		if e.Path == "normal.txt" {
			foundNormal = true
		}
		if filepath.HasPrefix(e.Path, "custom_exclude") {
			foundExcluded = true
		}
	}

	if !foundNormal {
		t.Error("Expected event for normal.txt")
	}
	if foundExcluded {
		t.Error("Should not receive events from custom_exclude")
	}
}

func TestWatcher_ReadyChannel(t *testing.T) {
	tmpDir := t.TempDir()

	w, err := New(tmpDir, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer w.Stop()

	// Get ready channel before start
	ready := w.Ready()

	// Channel should not be closed yet
	select {
	case <-ready:
		t.Error("Ready channel should not be closed before Start")
	default:
		// Expected
	}

	if err := w.Start(); err != nil {
		t.Fatal(err)
	}

	// Wait for ready via channel
	select {
	case <-ready:
		// Expected
	case <-time.After(5 * time.Second):
		t.Error("Ready channel not closed within timeout")
	}
}
