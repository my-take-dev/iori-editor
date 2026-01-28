package logger

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"
)

const (
	logFileName          = "crash.log"
	maxLogSize           = 10 * 1024 * 1024 // 10MB
	maxRotateCount       = 10               // 10世代保持
	stackTraceBufferSize = 4096             // Stack trace buffer size
)

var (
	logFile       *os.File
	logMutex      sync.Mutex
	logPath       string
	isInitialized bool
)

// Init initializes the critical error logger
func Init() error {
	logMutex.Lock()
	defer logMutex.Unlock()

	if isInitialized {
		return nil
	}

	// Get executable directory
	execPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}
	execDir := filepath.Dir(execPath)
	logPath = filepath.Join(execDir, logFileName)

	// Rotate log if too large
	if info, err := os.Stat(logPath); err == nil {
		if info.Size() > maxLogSize {
			rotateLogFiles(logPath)
		}
	}

	// Open log file (append mode)
	logFile, err = os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}

	isInitialized = true

	return nil
}

// rotateLogFiles performs log rotation with maxRotateCount generations
// crash.log.10 (oldest) is deleted
// crash.log.9 → crash.log.10
// ...
// crash.log.1 → crash.log.2
// crash.log → crash.log.1
func rotateLogFiles(basePath string) {
	// Delete the oldest log file
	oldestPath := fmt.Sprintf("%s.%d", basePath, maxRotateCount)
	if err := os.Remove(oldestPath); err != nil && !os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "logger: failed to remove oldest log: %v\n", err)
	}

	// Rotate existing log files (in reverse order)
	for i := maxRotateCount - 1; i >= 1; i-- {
		oldPath := fmt.Sprintf("%s.%d", basePath, i)
		newPath := fmt.Sprintf("%s.%d", basePath, i+1)
		if err := os.Rename(oldPath, newPath); err != nil && !os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "logger: failed to rotate log file %s: %v\n", oldPath, err)
		}
	}

	// Rename current log to .1
	newPath := fmt.Sprintf("%s.1", basePath)
	if err := os.Rename(basePath, newPath); err != nil {
		fmt.Fprintf(os.Stderr, "logger: failed to rotate current log file: %v\n", err)
	}
}

// Close closes the log file
func Close() {
	logMutex.Lock()
	defer logMutex.Unlock()

	if logFile != nil {
		if err := logFile.Sync(); err != nil {
			fmt.Fprintf(os.Stderr, "logger: failed to sync log file on close: %v\n", err)
		}
		if err := logFile.Close(); err != nil {
			fmt.Fprintf(os.Stderr, "logger: failed to close log file: %v\n", err)
		}
		logFile = nil
	}
	isInitialized = false
}

// Critical logs a critical error (syncs immediately to ensure data is written)
func Critical(message string, err error) {
	details := ""
	if err != nil {
		details = err.Error()
	}
	writeLog("CRITICAL", message, details, true)
}

// Error logs an error (deferred sync for performance)
func Error(message string, err error) {
	details := ""
	if err != nil {
		details = err.Error()
	}
	writeLog("ERROR", message, details, false)
}

// Warn logs a warning (deferred sync for performance)
func Warn(message string, err error) {
	details := ""
	if err != nil {
		details = err.Error()
	}
	writeLog("WARN", message, details, false)
}

// Panic logs a panic and stack trace (syncs immediately to ensure data is written)
func Panic(recovered interface{}) {
	// Get stack trace
	buf := make([]byte, stackTraceBufferSize)
	n := runtime.Stack(buf, false)
	stackTrace := string(buf[:n])

	message := fmt.Sprintf("PANIC: %v", recovered)
	writeLog("CRITICAL", message, stackTrace, true)
}

// writeLog writes a log entry with mutex protection
// sync parameter controls whether to immediately flush to disk
func writeLog(level, message, details string, sync bool) {
	logMutex.Lock()
	defer logMutex.Unlock()
	writeLogInternal(level, message, details, sync)
}

// writeLogInternal writes a log entry (must be called with mutex held)
// sync parameter controls whether to immediately flush to disk
func writeLogInternal(level, message, details string, sync bool) {
	timestamp := time.Now().Format("2006-01-02 15:04:05.000")

	entry := fmt.Sprintf("[%s] [%s] %s", timestamp, level, message)
	if details != "" {
		entry += fmt.Sprintf("\n  Details: %s", details)
	}
	entry += "\n"

	if logFile == nil {
		// Fall back to stderr when log file is not initialized
		fmt.Fprint(os.Stderr, "[LOGGER NOT INITIALIZED] "+entry)
		return
	}

	if _, err := logFile.WriteString(entry); err != nil {
		// Fall back to stderr when write fails
		fmt.Fprintf(os.Stderr, "[LOG WRITE FAILED: %v] %s", err, entry)
		return
	}

	if sync {
		if err := logFile.Sync(); err != nil {
			fmt.Fprintf(os.Stderr, "[LOG SYNC FAILED: %v] %s", err, entry)
		}
	}
}

// GetLogPath returns the path to the log file
func GetLogPath() string {
	return logPath
}
