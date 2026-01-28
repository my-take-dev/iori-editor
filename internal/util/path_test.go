package util

import (
	"path/filepath"
	"runtime"
	"testing"
)

func TestSecureJoin(t *testing.T) {
	var baseDir string
	if runtime.GOOS == "windows" {
		baseDir = "C:\\Users\\user\\project"
	} else {
		baseDir = "/home/user/project"
	}

	tests := []struct {
		name     string
		baseDir  string
		userPath string
		wantErr  error
		wantPath string
	}{
		// Valid cases
		{
			name:     "simple file",
			baseDir:  baseDir,
			userPath: "file.txt",
			wantErr:  nil,
			wantPath: filepath.Join(baseDir, "file.txt"),
		},
		{
			name:     "nested path",
			baseDir:  baseDir,
			userPath: "src/main.go",
			wantErr:  nil,
			wantPath: filepath.Join(baseDir, "src", "main.go"),
		},
		{
			name:     "with dot prefix",
			baseDir:  baseDir,
			userPath: "./file.txt",
			wantErr:  nil,
			wantPath: filepath.Join(baseDir, "file.txt"),
		},
		{
			name:     "deep nesting",
			baseDir:  baseDir,
			userPath: "a/b/c/d.txt",
			wantErr:  nil,
			wantPath: filepath.Join(baseDir, "a", "b", "c", "d.txt"),
		},
		{
			name:     "dot only",
			baseDir:  baseDir,
			userPath: ".",
			wantErr:  nil,
			wantPath: baseDir,
		},

		// Path traversal attempts
		{
			name:     "parent dir",
			baseDir:  baseDir,
			userPath: "../secret.txt",
			wantErr:  ErrPathTraversal,
			wantPath: "",
		},
		{
			name:     "double parent",
			baseDir:  baseDir,
			userPath: "../../etc/passwd",
			wantErr:  ErrPathTraversal,
			wantPath: "",
		},
		{
			name:     "hidden traversal",
			baseDir:  baseDir,
			userPath: "foo/../../bar",
			wantErr:  ErrPathTraversal, // filepath.Clean("foo/../../bar") = "../bar"
			wantPath: "",
		},
	}

	// Add OS-specific test cases
	if runtime.GOOS == "windows" {
		tests = append(tests, []struct {
			name     string
			baseDir  string
			userPath string
			wantErr  error
			wantPath string
		}{
			{
				name:     "absolute windows path",
				baseDir:  baseDir,
				userPath: "C:\\Windows\\System32",
				wantErr:  ErrPathTraversal,
				wantPath: "",
			},
			// Note: On Windows, "/etc/passwd" is NOT an absolute path (no drive letter)
			// so it would be treated as a relative path and joined with baseDir
		}...)
	} else {
		tests = append(tests, []struct {
			name     string
			baseDir  string
			userPath string
			wantErr  error
			wantPath string
		}{
			{
				name:     "absolute unix path",
				baseDir:  baseDir,
				userPath: "/etc/passwd",
				wantErr:  ErrPathTraversal,
				wantPath: "",
			},
		}...)
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := SecureJoin(tt.baseDir, tt.userPath)

			if tt.wantErr != nil {
				if err != tt.wantErr {
					t.Errorf("SecureJoin() error = %v, wantErr %v", err, tt.wantErr)
				}
				return
			}

			if err != nil {
				t.Errorf("SecureJoin() unexpected error = %v", err)
				return
			}

			if got != tt.wantPath {
				t.Errorf("SecureJoin() = %v, want %v", got, tt.wantPath)
			}
		})
	}
}

func TestSecureJoin_EmptyPath(t *testing.T) {
	var baseDir string
	if runtime.GOOS == "windows" {
		baseDir = "C:\\Users\\user\\project"
	} else {
		baseDir = "/home/user/project"
	}

	// Empty string is cleaned to "." by filepath.Clean
	got, err := SecureJoin(baseDir, "")
	if err != nil {
		t.Errorf("SecureJoin() with empty path should not error, got: %v", err)
	}
	if got != baseDir {
		t.Errorf("SecureJoin() with empty path = %v, want %v", got, baseDir)
	}
}
