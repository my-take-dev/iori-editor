package watcher

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"

	"github.com/fsnotify/fsnotify"
	"iori-editor/internal/logger"
)

// Watcher watches a directory for file changes
type Watcher struct {
	rootDir   string
	watcher   *fsnotify.Watcher
	filter    Filter
	debouncer *EventDebouncer

	// State management for async initialization
	state     atomic.Int32  // WatcherState
	ready     chan struct{} // Closed when initialization is complete
	initErr   error         // Error from initialization, if any
	initErrMu sync.Mutex

	ctx    context.Context
	cancel context.CancelFunc
}

// WatcherOption is a functional option for configuring a Watcher
type WatcherOption func(*watcherConfig)

type watcherConfig struct {
	filter           Filter
	debounceInterval time.Duration
	excludeDirs      []string
}

// WithFilter sets a custom filter for the watcher
func WithFilter(filter Filter) WatcherOption {
	return func(cfg *watcherConfig) {
		cfg.filter = filter
	}
}

// WithDebounceInterval sets a custom debounce interval
func WithDebounceInterval(interval time.Duration) WatcherOption {
	return func(cfg *watcherConfig) {
		cfg.debounceInterval = interval
	}
}

// WithExcludeDirs sets custom directories to exclude
func WithExcludeDirs(dirs []string) WatcherOption {
	return func(cfg *watcherConfig) {
		cfg.excludeDirs = dirs
	}
}

// New creates a new file watcher
func New(rootDir string, handler EventHandler, opts ...WatcherOption) (*Watcher, error) {
	fsWatcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}

	// Apply options
	cfg := &watcherConfig{
		debounceInterval: defaultDebounceInterval,
		excludeDirs:      DefaultExcludeDirs(),
	}
	for _, opt := range opts {
		opt(cfg)
	}

	// Create filter if not provided
	filter := cfg.filter
	if filter == nil {
		filter = NewPathFilter(FilterConfig{
			RootDir:     rootDir,
			ExcludeDirs: cfg.excludeDirs,
		})
	}

	// Create debouncer
	debouncer := NewEventDebouncer(DebouncerConfig{
		Interval: cfg.debounceInterval,
		Handler:  handler,
	})

	ctx, cancel := context.WithCancel(context.Background())

	w := &Watcher{
		rootDir:   rootDir,
		watcher:   fsWatcher,
		filter:    filter,
		debouncer: debouncer,
		ready:     make(chan struct{}),
		ctx:       ctx,
		cancel:    cancel,
	}

	w.state.Store(int32(StateCreated))

	return w, nil
}

// Start begins watching the directory asynchronously
// Returns immediately; use WaitReady() to wait for initialization
func (w *Watcher) Start() error {
	// Validate state
	if WatcherState(w.state.Load()) != StateCreated {
		return fmt.Errorf("watcher: invalid state for Start, expected %s, got %s",
			StateCreated, WatcherState(w.state.Load()))
	}

	// Transition to Scanning
	w.state.Store(int32(StateScanning))

	// Start debouncer
	w.debouncer.Start()

	// Start event processing (events will queue until ready)
	go w.processEvents()

	// Start async directory scan
	go func() {
		err := w.scanDirectories()

		w.initErrMu.Lock()
		w.initErr = err
		w.initErrMu.Unlock()

		if err != nil {
			w.state.Store(int32(StateStopped))
		} else {
			w.state.Store(int32(StateReady))
		}

		// Signal ready (even on error, so waiters can check InitError)
		close(w.ready)
	}()

	return nil
}

// StartSync begins watching the directory synchronously
// Blocks until initialization is complete
func (w *Watcher) StartSync() error {
	if err := w.Start(); err != nil {
		return err
	}
	return w.WaitReady(0) // 0 = no timeout
}

// scanDirectories walks the directory tree and adds directories to the watcher
func (w *Watcher) scanDirectories() error {
	walkStart := time.Now()
	var dirCount int

	err := filepath.Walk(w.rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			logger.Warn("watcher: failed to access path during walk: "+path, err)
			return nil // Continue walking
		}

		if info.IsDir() {
			// Check if directory should be excluded
			relPath, relErr := filepath.Rel(w.rootDir, path)
			if relErr != nil {
				relPath = info.Name()
			}
			if w.filter.ShouldExclude(relPath) {
				return filepath.SkipDir
			}

			dirCount++

			// Add directory to watcher
			if err := w.watcher.Add(path); err != nil {
				logger.Warn("watcher: failed to add directory to watch: "+path, err)
				return nil // Continue walking
			}
		}
		return nil
	})

	slog.Info("[Perf] Watcher.Start filepath.Walk completed",
		"duration_ms", time.Since(walkStart).Milliseconds(),
		"dir_count", dirCount,
		"rootDir", w.rootDir)

	return err
}

// Stop stops the watcher
func (w *Watcher) Stop() error {
	w.cancel()
	w.debouncer.Stop()
	w.state.Store(int32(StateStopped))
	return w.watcher.Close()
}

// Ready returns a channel that is closed when initialization is complete
func (w *Watcher) Ready() <-chan struct{} {
	return w.ready
}

// WaitReady blocks until initialization is complete or timeout expires
// A timeout of 0 means wait indefinitely
func (w *Watcher) WaitReady(timeout time.Duration) error {
	if timeout == 0 {
		<-w.ready
		return w.InitError()
	}

	select {
	case <-w.ready:
		return w.InitError()
	case <-time.After(timeout):
		return fmt.Errorf("watcher: initialization timeout after %v", timeout)
	}
}

// State returns the current state of the watcher
func (w *Watcher) State() WatcherState {
	return WatcherState(w.state.Load())
}

// InitError returns the initialization error, if any
func (w *Watcher) InitError() error {
	w.initErrMu.Lock()
	defer w.initErrMu.Unlock()
	return w.initErr
}

// processEvents handles file system events
func (w *Watcher) processEvents() {
	for {
		select {
		case <-w.ctx.Done():
			return
		case event, ok := <-w.watcher.Events:
			if !ok {
				return
			}
			w.handleEvent(event)
		case err, ok := <-w.watcher.Errors:
			if !ok {
				return
			}
			logger.Error("watcher: file system watcher error", err)
		}
	}
}

// handleEvent processes a single file system event
func (w *Watcher) handleEvent(event fsnotify.Event) {
	// Get relative path
	relPath, err := filepath.Rel(w.rootDir, event.Name)
	if err != nil {
		relPath = event.Name
	}

	// Check if .gitignore was modified and reload it
	if filepath.Base(event.Name) == ".gitignore" && filepath.Dir(event.Name) == w.rootDir {
		if event.Op&fsnotify.Write == fsnotify.Write || event.Op&fsnotify.Create == fsnotify.Create {
			w.ReloadGitIgnore()
		}
	}

	// Skip excluded paths
	if w.filter.ShouldExclude(relPath) {
		return
	}

	// Determine event type
	var eventType EventType
	switch {
	case event.Op&fsnotify.Create == fsnotify.Create:
		eventType = EventCreate
		// If it's a new directory, add it to the watcher (only if not excluded)
		if info, err := os.Stat(event.Name); err == nil && info.IsDir() {
			if !w.filter.ShouldExclude(relPath) {
				if err := w.watcher.Add(event.Name); err != nil {
					logger.Warn("watcher: failed to add new directory to watch: "+event.Name, err)
				}
			}
		}
	case event.Op&fsnotify.Write == fsnotify.Write:
		eventType = EventWrite
	case event.Op&fsnotify.Remove == fsnotify.Remove:
		eventType = EventRemove
	case event.Op&fsnotify.Rename == fsnotify.Rename:
		eventType = EventRename
	default:
		return
	}

	// Check if it's a directory
	isDir := false
	if info, err := os.Stat(event.Name); err == nil {
		isDir = info.IsDir()
	}

	// Add to debouncer
	w.debouncer.Add(FileEvent{
		Path:      relPath,
		EventType: eventType,
		IsDir:     isDir,
	})
}

// SetExcludeDirs sets the directories to exclude from watching
func (w *Watcher) SetExcludeDirs(dirs []string) {
	w.filter.SetExcludeDirs(dirs)
}

// ReloadGitIgnore reloads the .gitignore file
// This is called automatically when .gitignore is modified
func (w *Watcher) ReloadGitIgnore() {
	slog.Info("watcher: reloading .gitignore")
	w.filter.ReloadGitIgnore()
}
