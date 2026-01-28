package git

// statusEntry represents a single parsed git status entry
type statusEntry struct {
	StagingStatus  byte
	WorktreeStatus byte
	Path           string
	OriginalPath   string // For renames/copies only
}

// parseStatusZOutput parses git status -z output safely
// The -z format uses null bytes as separators:
//   - Normal: XY PATH\0
//   - Rename/Copy: XY ORIG_PATH\0NEW_PATH\0
func parseStatusZOutput(output []byte) []statusEntry {
	var entries []statusEntry

	i := 0
	for i < len(output) {
		// Need at least 4 bytes: XY SP PATH
		if i+3 >= len(output) {
			break
		}

		stagingStatus := output[i]
		worktreeStatus := output[i+1]
		// output[i+2] is always a space

		// Find the null terminator for path
		pathStart := i + 3
		pathEnd := pathStart
		for pathEnd < len(output) && output[pathEnd] != 0 {
			pathEnd++
		}

		path := string(output[pathStart:pathEnd])
		i = pathEnd + 1 // Move past the null byte

		entry := statusEntry{
			StagingStatus:  stagingStatus,
			WorktreeStatus: worktreeStatus,
			Path:           path,
		}

		// For renames/copies, there's a second path (the new path)
		if stagingStatus == 'R' || stagingStatus == 'C' {
			// The original path is what we just read
			// Now read the new path
			newPathStart := i
			newPathEnd := newPathStart
			for newPathEnd < len(output) && output[newPathEnd] != 0 {
				newPathEnd++
			}

			if newPathEnd > newPathStart {
				newPath := string(output[newPathStart:newPathEnd])
				entry.OriginalPath = path // First path was the original
				entry.Path = newPath      // Second path is the new name
				i = newPathEnd + 1
			}
		}

		entries = append(entries, entry)
	}

	return entries
}

// mapStatusToFileChange converts a statusEntry to a FileChange with proper status mapping
func mapStatusToFileChange(entry statusEntry) (FileChange, bool) {
	change := FileChange{
		Path:     entry.Path,
		Original: entry.OriginalPath, // Populated for renames
		Staged:   entry.StagingStatus != ' ' && entry.StagingStatus != '?',
	}

	// Determine status based on staging and worktree status
	switch {
	case entry.StagingStatus == '?' || entry.WorktreeStatus == '?':
		change.Status = StatusUntracked
	case entry.StagingStatus == 'A':
		change.Status = StatusAdded
	case entry.StagingStatus == 'D' || entry.WorktreeStatus == 'D':
		change.Status = StatusDeleted
	case entry.StagingStatus == 'R':
		change.Status = StatusRenamed
	case entry.StagingStatus == 'C':
		change.Status = StatusRenamed // Treat copy as rename for UI
	case entry.StagingStatus == 'M' || entry.WorktreeStatus == 'M':
		change.Status = StatusModified
	default:
		return change, false // No relevant change
	}

	return change, true
}
