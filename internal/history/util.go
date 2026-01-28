package history

import (
	"fmt"
	"path/filepath"
	"time"
)

// GenerateBasename creates a base filename (without extension) for a session
func GenerateBasename(sessionID string, startedAt time.Time) string {
	timestamp := startedAt.Format("2006-01-02T15-04-05")
	return fmt.Sprintf("%s_%s", sessionID, timestamp)
}

// GenerateFilename creates a filename (.meta.json) for a session
func GenerateFilename(sessionID string, startedAt time.Time) string {
	return GenerateBasename(sessionID, startedAt) + ".meta.json"
}

// BuildMetaPath constructs the full path for a metadata file
func BuildMetaPath(baseDir, basename string) string {
	return filepath.Join(baseDir, basename+".meta.json")
}

// BuildDataPath constructs the full path for a data file
func BuildDataPath(baseDir, basename string) string {
	return filepath.Join(baseDir, basename+".ndjson")
}
