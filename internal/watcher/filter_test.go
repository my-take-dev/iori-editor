package watcher

import (
	"os"
	"path/filepath"
	"testing"
)

func TestPathFilter_ShouldExclude_DefaultDirs(t *testing.T) {
	tmpDir := t.TempDir()

	tests := []struct {
		name     string
		relPath  string
		expected bool
	}{
		{"git dir", ".git/config", true},
		{"git root", ".git", true},
		{"node_modules", "node_modules/package/index.js", true},
		{"node_modules root", "node_modules", true},
		{"idea dir", ".idea/workspace.xml", true},
		{"vscode dir", ".vscode/settings.json", true},
		{"pycache", "__pycache__/module.pyc", true},
		{"cache dir", ".cache/files", true},
		{"dist dir", "dist/bundle.js", true},
		{"build dir", "build/output", true},
		{"vendor dir", "vendor/pkg", true},
		{"normal file", "src/main.go", false},
		{"nested normal", "src/pkg/utils.go", false},
		{"root file", "README.md", false},
		{"nested excluded", "foo/.git/bar", true},
		{"deep nested excluded", "a/b/c/node_modules/d", true},
	}

	f := NewPathFilter(FilterConfig{
		RootDir:     tmpDir,
		ExcludeDirs: DefaultExcludeDirs(),
	})

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := f.ShouldExclude(tt.relPath)
			if result != tt.expected {
				t.Errorf("ShouldExclude(%q) = %v, want %v", tt.relPath, result, tt.expected)
			}
		})
	}
}

func TestPathFilter_ShouldExclude_CustomExcludeDirs(t *testing.T) {
	tmpDir := t.TempDir()

	f := NewPathFilter(FilterConfig{
		RootDir:     tmpDir,
		ExcludeDirs: []string{"custom", "another"},
	})

	tests := []struct {
		name     string
		relPath  string
		expected bool
	}{
		{"custom dir", "custom/file.txt", true},
		{"another dir", "another/file.txt", true},
		{"git dir not excluded", ".git/config", false}, // Not in custom list
		{"normal file", "src/main.go", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := f.ShouldExclude(tt.relPath)
			if result != tt.expected {
				t.Errorf("ShouldExclude(%q) = %v, want %v", tt.relPath, result, tt.expected)
			}
		})
	}
}

func TestPathFilter_ShouldExclude_GitIgnore(t *testing.T) {
	tmpDir := t.TempDir()

	// Create .gitignore file
	gitignoreContent := `
*.log
*.tmp
logs/
secret.txt
`
	err := os.WriteFile(filepath.Join(tmpDir, ".gitignore"), []byte(gitignoreContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create .gitignore: %v", err)
	}

	f := NewPathFilter(FilterConfig{
		RootDir:     tmpDir,
		ExcludeDirs: []string{}, // Empty to test gitignore only
	})

	tests := []struct {
		name     string
		relPath  string
		expected bool
	}{
		{"log file", "app.log", true},
		{"nested log", "logs/app.log", true},
		{"tmp file", "temp.tmp", true},
		{"logs dir", "logs/debug.txt", true},
		{"secret file", "secret.txt", true},
		{"nested secret", "config/secret.txt", true},
		{"normal go file", "main.go", false},
		{"normal txt", "readme.txt", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := f.ShouldExclude(tt.relPath)
			if result != tt.expected {
				t.Errorf("ShouldExclude(%q) = %v, want %v", tt.relPath, result, tt.expected)
			}
		})
	}
}

func TestPathFilter_ShouldExclude_Cache(t *testing.T) {
	tmpDir := t.TempDir()

	f := NewPathFilter(FilterConfig{
		RootDir:      tmpDir,
		ExcludeDirs:  DefaultExcludeDirs(),
		CacheMaxSize: 100,
	})

	// First call - computes result
	result1 := f.ShouldExclude("src/main.go")
	if result1 != false {
		t.Errorf("First call: expected false, got %v", result1)
	}

	// Second call - should use cache
	result2 := f.ShouldExclude("src/main.go")
	if result2 != false {
		t.Errorf("Second call: expected false, got %v", result2)
	}

	// Verify cache has the entry
	f.cacheMu.RLock()
	_, cached := f.cache["src/main.go"]
	f.cacheMu.RUnlock()

	if !cached {
		t.Error("Expected path to be cached")
	}
}

func TestPathFilter_ShouldExclude_CacheEviction(t *testing.T) {
	tmpDir := t.TempDir()

	f := NewPathFilter(FilterConfig{
		RootDir:      tmpDir,
		ExcludeDirs:  DefaultExcludeDirs(),
		CacheMaxSize: 3, // Small cache to test eviction
	})

	// Fill cache
	f.ShouldExclude("file1.go")
	f.ShouldExclude("file2.go")
	f.ShouldExclude("file3.go")

	// Verify cache is full
	f.cacheMu.RLock()
	cacheSize := len(f.cache)
	f.cacheMu.RUnlock()

	if cacheSize != 3 {
		t.Errorf("Expected cache size 3, got %d", cacheSize)
	}

	// Add one more - should trigger eviction
	f.ShouldExclude("file4.go")

	// Cache should have been cleared and only new entry added
	f.cacheMu.RLock()
	newCacheSize := len(f.cache)
	_, hasFile4 := f.cache["file4.go"]
	f.cacheMu.RUnlock()

	if newCacheSize != 1 {
		t.Errorf("Expected cache size 1 after eviction, got %d", newCacheSize)
	}
	if !hasFile4 {
		t.Error("Expected file4.go to be in cache after eviction")
	}
}

func TestPathFilter_ReloadGitIgnore(t *testing.T) {
	tmpDir := t.TempDir()

	// Create initial .gitignore
	err := os.WriteFile(filepath.Join(tmpDir, ".gitignore"), []byte("*.log"), 0644)
	if err != nil {
		t.Fatalf("Failed to create .gitignore: %v", err)
	}

	f := NewPathFilter(FilterConfig{
		RootDir:     tmpDir,
		ExcludeDirs: []string{},
	})

	// Verify initial pattern works
	if !f.ShouldExclude("app.log") {
		t.Error("Expected app.log to be excluded initially")
	}
	if f.ShouldExclude("app.tmp") {
		t.Error("Expected app.tmp to NOT be excluded initially")
	}

	// Populate cache
	f.ShouldExclude("test.log")
	f.ShouldExclude("test.tmp")

	// Verify cache has entries
	f.cacheMu.RLock()
	cacheSizeBefore := len(f.cache)
	f.cacheMu.RUnlock()
	if cacheSizeBefore == 0 {
		t.Error("Expected cache to have entries before reload")
	}

	// Update .gitignore
	err = os.WriteFile(filepath.Join(tmpDir, ".gitignore"), []byte("*.tmp"), 0644)
	if err != nil {
		t.Fatalf("Failed to update .gitignore: %v", err)
	}

	// Reload
	f.ReloadGitIgnore()

	// Verify cache was cleared
	f.cacheMu.RLock()
	cacheSizeAfter := len(f.cache)
	f.cacheMu.RUnlock()
	if cacheSizeAfter != 0 {
		t.Errorf("Expected cache to be empty after reload, got %d entries", cacheSizeAfter)
	}

	// Verify new pattern works
	if f.ShouldExclude("app.log") {
		t.Error("Expected app.log to NOT be excluded after reload")
	}
	if !f.ShouldExclude("app.tmp") {
		t.Error("Expected app.tmp to be excluded after reload")
	}
}

func TestPathFilter_SetExcludeDirs(t *testing.T) {
	tmpDir := t.TempDir()

	f := NewPathFilter(FilterConfig{
		RootDir:     tmpDir,
		ExcludeDirs: []string{"old"},
	})

	// Verify initial exclude
	if !f.ShouldExclude("old/file.txt") {
		t.Error("Expected old/ to be excluded initially")
	}
	if f.ShouldExclude("new/file.txt") {
		t.Error("Expected new/ to NOT be excluded initially")
	}

	// Populate cache
	f.ShouldExclude("old/cached.txt")
	f.ShouldExclude("new/cached.txt")

	// Update exclude dirs
	f.SetExcludeDirs([]string{"new"})

	// Verify cache was cleared
	f.cacheMu.RLock()
	cacheSize := len(f.cache)
	f.cacheMu.RUnlock()
	if cacheSize != 0 {
		t.Errorf("Expected cache to be empty after SetExcludeDirs, got %d entries", cacheSize)
	}

	// Verify new exclude dirs work
	if f.ShouldExclude("old/file.txt") {
		t.Error("Expected old/ to NOT be excluded after update")
	}
	if !f.ShouldExclude("new/file.txt") {
		t.Error("Expected new/ to be excluded after update")
	}
}

func TestPathFilter_PathNormalization(t *testing.T) {
	tmpDir := t.TempDir()

	f := NewPathFilter(FilterConfig{
		RootDir:     tmpDir,
		ExcludeDirs: DefaultExcludeDirs(),
	})

	// Test with both forward and back slashes (Windows compatibility)
	tests := []struct {
		name     string
		relPath  string
		expected bool
	}{
		{"forward slash excluded", ".git/config", true},
		{"forward slash normal", "src/main.go", false},
		// Note: On Unix, backslash is a valid filename character
		// On Windows, filepath.ToSlash converts backslashes
		{"backslash excluded", ".git\\config", true},
		{"backslash normal", "src\\main.go", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := f.ShouldExclude(tt.relPath)
			if result != tt.expected {
				t.Errorf("ShouldExclude(%q) = %v, want %v", tt.relPath, result, tt.expected)
			}
		})
	}
}

func TestPathFilter_NoGitIgnore(t *testing.T) {
	tmpDir := t.TempDir()

	// No .gitignore file exists
	f := NewPathFilter(FilterConfig{
		RootDir:     tmpDir,
		ExcludeDirs: DefaultExcludeDirs(),
	})

	// Should still work with just exclude dirs
	if !f.ShouldExclude(".git/config") {
		t.Error("Expected .git/config to be excluded")
	}
	if f.ShouldExclude("src/main.go") {
		t.Error("Expected src/main.go to NOT be excluded")
	}
}
