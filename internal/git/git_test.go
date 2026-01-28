package git

import (
	"testing"
)

func TestValidateBranchName(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		// Valid branch names
		{"valid simple", "feature-branch", false},
		{"valid with slash", "feature/add-auth", false},
		{"valid with numbers", "release-1.0.0", false},
		{"valid with underscore", "feature_branch", false},
		{"valid main", "main", false},
		{"valid master", "master", false},

		// Invalid branch names - starts with dash (injection risk)
		{"starts with dash", "-bad-branch", true},
		{"starts with double dash", "--orphan", true},

		// Invalid branch names - git check-ref-format rules
		{"contains double dot", "branch..name", true},
		{"contains tilde", "branch~name", true},
		{"contains caret", "branch^name", true},
		{"contains colon", "branch:name", true},
		{"contains question", "branch?name", true},
		{"contains asterisk", "branch*name", true},
		{"contains bracket", "branch[name", true},
		{"contains backslash", "branch\\name", true},
		{"contains at-brace", "branch@{name", true},
		{"contains space", "branch name", true},

		// Invalid suffixes
		{"ends with .lock", "branch.lock", true},
		{"ends with dot", "branch.", true},

		// Empty
		{"empty", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateBranchName(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateBranchName(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
			}
		})
	}
}

func TestValidateGitURL(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		// Valid URLs
		{"https github", "https://github.com/user/repo.git", false},
		{"https gitlab", "https://gitlab.com/user/repo.git", false},
		{"http", "http://example.com/repo.git", false},
		{"ssh protocol", "ssh://git@github.com/user/repo.git", false},
		{"git protocol", "git://github.com/repo.git", false},
		{"git@ scp style", "git@github.com:user/repo.git", false},
		{"git@ with ssh key", "git@bitbucket.org:team/repo.git", false},

		// Invalid URLs - injection risk
		{"starts with dash", "-malicious", true},
		{"starts with double dash", "--upload-pack=malicious", true},

		// Invalid URLs - wrong scheme
		{"file scheme", "file:///local/path", true},
		{"ftp scheme", "ftp://server/path", true},
		{"no scheme", "example.com/repo.git", true},
		{"just path", "/local/path/repo", true},

		// Empty
		{"empty", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateGitURL(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateGitURL(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
			}
		})
	}
}

func TestParseStatusZOutput(t *testing.T) {
	tests := []struct {
		name     string
		input    []byte
		expected []statusEntry
	}{
		{
			name:     "empty output",
			input:    []byte{},
			expected: nil,
		},
		{
			name:  "single modified file",
			input: []byte("M  file.txt\x00"),
			expected: []statusEntry{
				{StagingStatus: 'M', WorktreeStatus: ' ', Path: "file.txt"},
			},
		},
		{
			name:  "untracked file",
			input: []byte("?? newfile.txt\x00"),
			expected: []statusEntry{
				{StagingStatus: '?', WorktreeStatus: '?', Path: "newfile.txt"},
			},
		},
		{
			name:  "added file",
			input: []byte("A  added.go\x00"),
			expected: []statusEntry{
				{StagingStatus: 'A', WorktreeStatus: ' ', Path: "added.go"},
			},
		},
		{
			name:  "deleted file",
			input: []byte("D  deleted.go\x00"),
			expected: []statusEntry{
				{StagingStatus: 'D', WorktreeStatus: ' ', Path: "deleted.go"},
			},
		},
		{
			name:  "renamed file",
			input: []byte("R  old.txt\x00new.txt\x00"),
			expected: []statusEntry{
				{StagingStatus: 'R', WorktreeStatus: ' ', Path: "new.txt", OriginalPath: "old.txt"},
			},
		},
		{
			name:  "file with spaces in name",
			input: []byte("M  path with spaces/file name.txt\x00"),
			expected: []statusEntry{
				{StagingStatus: 'M', WorktreeStatus: ' ', Path: "path with spaces/file name.txt"},
			},
		},
		{
			name:  "file with arrow in name",
			input: []byte("M  file -> renamed.txt\x00"),
			expected: []statusEntry{
				{StagingStatus: 'M', WorktreeStatus: ' ', Path: "file -> renamed.txt"},
			},
		},
		{
			name:  "renamed file with arrow in name",
			input: []byte("R  old -> file.txt\x00new -> file.txt\x00"),
			expected: []statusEntry{
				{StagingStatus: 'R', WorktreeStatus: ' ', Path: "new -> file.txt", OriginalPath: "old -> file.txt"},
			},
		},
		{
			name:  "multiple files mixed statuses",
			input: []byte("M  modified.go\x00A  added.go\x00D  deleted.go\x00?? untracked.go\x00"),
			expected: []statusEntry{
				{StagingStatus: 'M', WorktreeStatus: ' ', Path: "modified.go"},
				{StagingStatus: 'A', WorktreeStatus: ' ', Path: "added.go"},
				{StagingStatus: 'D', WorktreeStatus: ' ', Path: "deleted.go"},
				{StagingStatus: '?', WorktreeStatus: '?', Path: "untracked.go"},
			},
		},
		{
			name:  "staged and unstaged modifications",
			input: []byte("MM both.go\x00"),
			expected: []statusEntry{
				{StagingStatus: 'M', WorktreeStatus: 'M', Path: "both.go"},
			},
		},
		{
			name:  "worktree only modification",
			input: []byte(" M worktree.go\x00"),
			expected: []statusEntry{
				{StagingStatus: ' ', WorktreeStatus: 'M', Path: "worktree.go"},
			},
		},
		{
			name:  "copied file",
			input: []byte("C  source.txt\x00copy.txt\x00"),
			expected: []statusEntry{
				{StagingStatus: 'C', WorktreeStatus: ' ', Path: "copy.txt", OriginalPath: "source.txt"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseStatusZOutput(tt.input)
			if len(result) != len(tt.expected) {
				t.Errorf("expected %d entries, got %d", len(tt.expected), len(result))
				return
			}
			for i, exp := range tt.expected {
				if result[i].StagingStatus != exp.StagingStatus {
					t.Errorf("entry %d: expected StagingStatus %c, got %c", i, exp.StagingStatus, result[i].StagingStatus)
				}
				if result[i].WorktreeStatus != exp.WorktreeStatus {
					t.Errorf("entry %d: expected WorktreeStatus %c, got %c", i, exp.WorktreeStatus, result[i].WorktreeStatus)
				}
				if result[i].Path != exp.Path {
					t.Errorf("entry %d: expected Path %q, got %q", i, exp.Path, result[i].Path)
				}
				if result[i].OriginalPath != exp.OriginalPath {
					t.Errorf("entry %d: expected OriginalPath %q, got %q", i, exp.OriginalPath, result[i].OriginalPath)
				}
			}
		})
	}
}
