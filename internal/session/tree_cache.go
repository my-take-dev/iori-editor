package session

import (
	"strings"
	"sync"
	"time"
)

// TreeCache caches file tree nodes to reduce filesystem I/O
type TreeCache struct {
	mu      sync.RWMutex
	entries map[string]*CachedEntry
	ttl     time.Duration
}

// CachedEntry represents a cached file tree entry
type CachedEntry struct {
	nodes     []*FileNode
	timestamp time.Time
}

// NewTreeCache creates a new TreeCache with the specified TTL
func NewTreeCache(ttl time.Duration) *TreeCache {
	return &TreeCache{
		entries: make(map[string]*CachedEntry),
		ttl:     ttl,
	}
}

// Get retrieves cached nodes for a path, returns nil and false if not found or expired
func (c *TreeCache) Get(path string) ([]*FileNode, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	entry, ok := c.entries[path]
	if !ok {
		return nil, false
	}

	// Check TTL expiration
	if time.Since(entry.timestamp) > c.ttl {
		return nil, false
	}

	return entry.nodes, true
}

// Set stores nodes in the cache for a path
func (c *TreeCache) Set(path string, nodes []*FileNode) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.entries[path] = &CachedEntry{
		nodes:     nodes,
		timestamp: time.Now(),
	}
}

// Invalidate removes cache entries for a path and all its descendants
func (c *TreeCache) Invalidate(path string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Normalize path for comparison
	normalizedPath := strings.TrimSuffix(path, "/")

	// If root path is invalidated, clear entire cache
	if normalizedPath == "" {
		c.entries = make(map[string]*CachedEntry)
		return
	}

	for key := range c.entries {
		// Delete the path itself and any children
		if key == normalizedPath || strings.HasPrefix(key, normalizedPath+"/") {
			delete(c.entries, key)
		}
	}
}

// InvalidateAll clears the entire cache
func (c *TreeCache) InvalidateAll() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.entries = make(map[string]*CachedEntry)
}

// Size returns the number of cached entries
func (c *TreeCache) Size() int {
	c.mu.RLock()
	defer c.mu.RUnlock()

	return len(c.entries)
}
