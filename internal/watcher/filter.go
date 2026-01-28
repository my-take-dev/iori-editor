package watcher

import (
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"

	ignore "github.com/sabhiram/go-gitignore"
)

// Filter determines whether a path should be excluded from watching
type Filter interface {
	// ShouldExclude returns true if the path should be excluded
	// relPath should be relative to the root directory
	ShouldExclude(relPath string) bool

	// ReloadGitIgnore reloads the .gitignore patterns
	ReloadGitIgnore()

	// SetExcludeDirs sets the directories to exclude from watching
	SetExcludeDirs(dirs []string)
}

// FilterConfig holds configuration for creating a PathFilter
type FilterConfig struct {
	RootDir      string
	ExcludeDirs  []string
	CacheMaxSize int // Maximum cache entries, 0 = default (10000)
}

// PathFilter implements Filter with caching for optimized performance
type PathFilter struct {
	rootDir      string
	excludeDirs  map[string]bool
	gitIgnore    *ignore.GitIgnore
	cache        map[string]bool // relPath -> shouldExclude result
	cacheMu      sync.RWMutex
	cacheMaxSize int
	mu           sync.RWMutex // For gitIgnore and excludeDirs access
}

// DefaultExcludeDirs returns the default directories to exclude
func DefaultExcludeDirs() []string {
	return []string{
		".git",
		"node_modules",
		".idea",
		".vscode",
		"__pycache__",
		".cache",
		"dist",
		"build",
		"vendor",
	}
}

// NewPathFilter creates a new PathFilter with the given configuration
func NewPathFilter(cfg FilterConfig) *PathFilter {
	excludeDirs := make(map[string]bool)
	dirs := cfg.ExcludeDirs
	if len(dirs) == 0 {
		dirs = DefaultExcludeDirs()
	}
	for _, dir := range dirs {
		excludeDirs[dir] = true
	}

	cacheMaxSize := cfg.CacheMaxSize
	if cacheMaxSize == 0 {
		cacheMaxSize = 10000 // Default cache size
	}

	f := &PathFilter{
		rootDir:      cfg.RootDir,
		excludeDirs:  excludeDirs,
		cache:        make(map[string]bool),
		cacheMaxSize: cacheMaxSize,
	}

	// Load .gitignore patterns
	f.loadGitIgnore()

	return f
}

// loadGitIgnore loads the .gitignore file from the root directory
func (f *PathFilter) loadGitIgnore() {
	gitignorePath := filepath.Join(f.rootDir, ".gitignore")
	gi, err := ignore.CompileIgnoreFile(gitignorePath)
	if err != nil {
		// Distinguish between file not found (expected) and parse errors (should warn)
		if os.IsNotExist(err) {
			slog.Debug("filter: no .gitignore found", "path", gitignorePath)
		} else {
			// Parse error or other I/O error - user should know their patterns won't be applied
			slog.Warn("filter: failed to parse .gitignore, patterns will not be applied",
				"path", gitignorePath, "error", err)
		}
		f.mu.Lock()
		f.gitIgnore = nil
		f.mu.Unlock()
		return
	}
	f.mu.Lock()
	f.gitIgnore = gi
	f.mu.Unlock()
	slog.Info("filter: loaded .gitignore", "path", gitignorePath)
}

// ShouldExclude checks if a relative path should be excluded from watching
// It uses caching to optimize repeated checks for the same path
func (f *PathFilter) ShouldExclude(relPath string) bool {
	// Check cache first
	f.cacheMu.RLock()
	if result, ok := f.cache[relPath]; ok {
		f.cacheMu.RUnlock()
		return result
	}
	f.cacheMu.RUnlock()

	// Compute result
	result := f.computeExclude(relPath)

	// Store in cache (with size limit check)
	f.cacheMu.Lock()
	if len(f.cache) < f.cacheMaxSize {
		f.cache[relPath] = result
	} else {
		// Simple eviction: clear cache when full
		f.cache = make(map[string]bool)
		f.cache[relPath] = result
	}
	f.cacheMu.Unlock()

	return result
}

// computeExclude performs the actual exclusion check
func (f *PathFilter) computeExclude(relPath string) bool {
	// Normalize path separators for consistent matching
	normalizedPath := filepath.ToSlash(relPath)

	// Check default exclude list and .gitignore patterns under read lock
	f.mu.RLock()
	excludeDirs := f.excludeDirs
	gi := f.gitIgnore
	f.mu.RUnlock()

	// Check default exclude list (match any directory component)
	parts := strings.Split(normalizedPath, "/")
	for _, part := range parts {
		if excludeDirs[part] {
			return true
		}
	}

	// Check .gitignore patterns
	if gi != nil && gi.MatchesPath(normalizedPath) {
		return true
	}

	return false
}

// ReloadGitIgnore reloads the .gitignore file and clears the cache
func (f *PathFilter) ReloadGitIgnore() {
	slog.Info("filter: reloading .gitignore")
	f.loadGitIgnore()

	// Clear cache since gitignore patterns changed
	f.cacheMu.Lock()
	f.cache = make(map[string]bool)
	f.cacheMu.Unlock()
}

// SetExcludeDirs sets the directories to exclude from watching and clears the cache
func (f *PathFilter) SetExcludeDirs(dirs []string) {
	f.mu.Lock()
	f.excludeDirs = make(map[string]bool)
	for _, dir := range dirs {
		f.excludeDirs[dir] = true
	}
	f.mu.Unlock()

	// Clear cache since exclude dirs changed
	f.cacheMu.Lock()
	f.cache = make(map[string]bool)
	f.cacheMu.Unlock()
}
