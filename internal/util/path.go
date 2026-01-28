package util

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"
)

var (
	// ErrPathTraversal is returned when a path traversal attack is detected
	ErrPathTraversal = errors.New("invalid path: path traversal not allowed")
	// ErrOutsideBase is returned when a path resolves outside the base directory
	ErrOutsideBase = errors.New("invalid path: outside base directory")
)

// SecureJoin safely joins a base directory path with a user-provided relative path.
// It prevents path traversal attacks by ensuring the resulting path is within the base directory.
//
// The function performs the following security checks:
// 1. Rejects absolute paths in userInputPath
// 2. Rejects paths starting with ".."
// 3. Verifies the joined path resolves within baseDir
// 4. On Windows, verifies the volume names match
//
// Parameters:
//   - baseDir: The trusted base directory (e.g., session WorkDir)
//   - userInputPath: The untrusted user-provided relative path
//
// Returns:
//   - The safely joined absolute path
//   - An error if the path is invalid or would escape the base directory
func SecureJoin(baseDir, userInputPath string) (string, error) {
	// Step 1: Clean the user input path
	cleanPath := filepath.Clean(userInputPath)

	// Step 2: Reject absolute paths or paths starting with ".."
	if strings.HasPrefix(cleanPath, "..") || filepath.IsAbs(cleanPath) {
		return "", ErrPathTraversal
	}

	// Step 3: Join paths
	fullPath := filepath.Join(baseDir, cleanPath)

	// Step 4: On Windows, verify volume names match
	if runtime.GOOS == "windows" {
		baseVolume := filepath.VolumeName(baseDir)
		fullVolume := filepath.VolumeName(fullPath)
		if !strings.EqualFold(baseVolume, fullVolume) {
			return "", ErrOutsideBase
		}
	}

	// Step 5: Verify the path is within baseDir using filepath.Rel
	rel, err := filepath.Rel(baseDir, fullPath)
	if err != nil || strings.HasPrefix(rel, "..") {
		return "", ErrOutsideBase
	}

	return fullPath, nil
}

// CheckWritePermission checks if the directory is writable by creating a test file.
// If the directory does not exist, it attempts to create it.
// Returns a user-friendly Japanese error message if permission is denied.
func CheckWritePermission(dir string) error {
	// ディレクトリが存在しない場合は作成を試みる
	if err := os.MkdirAll(dir, 0755); err != nil {
		if os.IsPermission(err) {
			return fmt.Errorf("フォルダ '%s' への書き込み権限がありません。別のフォルダに移動するか、管理者として実行してください", dir)
		}
		return fmt.Errorf("フォルダ '%s' を作成できません: %w", dir, err)
	}

	// テストファイルを作成して権限を確認
	testFile := filepath.Join(dir, ".write_test_"+strconv.FormatInt(time.Now().UnixNano(), 10))
	f, err := os.Create(testFile)
	if err != nil {
		if os.IsPermission(err) {
			return fmt.Errorf("フォルダ '%s' への書き込み権限がありません。別のフォルダに移動するか、管理者として実行してください", dir)
		}
		return fmt.Errorf("書き込み権限の確認に失敗しました: %w", err)
	}
	f.Close()
	os.Remove(testFile)

	return nil
}
