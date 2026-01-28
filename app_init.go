package main

import (
	"os"
	"path/filepath"

	"iori-editor/internal/history"
	"iori-editor/internal/logger"
)

// initializeApp initializes application directory and history manager
func initializeApp() (string, *history.Manager) {
	// Get application directory for history storage
	execPath, err := os.Executable()
	if err != nil {
		execPath = "."
	}
	execDir := filepath.Dir(execPath)

	// Initialize history manager
	historyMgr, err := history.NewManager(execDir)
	if err != nil {
		logger.Error("Failed to initialize history manager", err)
		// Continue without history - non-critical feature
	}

	return execDir, historyMgr
}
