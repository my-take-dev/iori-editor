package main

import (
	"iori-editor/internal/history"
	"iori-editor/internal/services"
)

// ActiveSessionInfo is re-exported for Wails binding
type ActiveSessionInfo = services.ActiveSessionInfo

// GetHistoryList returns the list of available history files
func (a *App) GetHistoryList() ([]history.HistoryInfo, error) {
	return a.historyService.GetHistoryList()
}

// GetHistoryContent returns the content of a specific history file
func (a *App) GetHistoryContent(filename string) (*history.TerminalHistory, error) {
	return a.historyService.GetHistoryContent(filename)
}

// DeleteHistory deletes a history file
func (a *App) DeleteHistory(filename string) error {
	return a.historyService.DeleteHistory(filename)
}

// FlushCurrentHistory flushes the current session's history to disk
func (a *App) FlushCurrentHistory(sessionID string) (string, error) {
	return a.historyService.FlushCurrentHistory(sessionID)
}

// IsActiveSessionHistory checks if a history file belongs to an active session
func (a *App) IsActiveSessionHistory(filename string) ActiveSessionInfo {
	return a.historyService.IsActiveSessionHistory(filename)
}

// GetHistoryContentWithFlush returns the content of a history file, flushing if it's the current session
func (a *App) GetHistoryContentWithFlush(filename string, currentSessionID string) (*history.TerminalHistory, error) {
	return a.historyService.GetHistoryContentWithFlush(filename, currentSessionID)
}

// GetHistoryChunk returns a chunk of history data with pagination
func (a *App) GetHistoryChunk(filename string, offset, limit int, currentSessionID string) (*history.HistoryChunk, error) {
	return a.historyService.GetHistoryChunk(filename, offset, limit, currentSessionID)
}

// StartHistoryStream starts streaming history data via Wails events
// Events emitted: history:chunk, history:end, history:error
func (a *App) StartHistoryStream(requestID, filename string, offset int, currentSessionID string) error {
	return a.historyService.StartHistoryStream(requestID, filename, offset, currentSessionID)
}

// StopHistoryStream stops an active history stream
func (a *App) StopHistoryStream(requestID string) {
	a.historyService.StopHistoryStream(requestID)
}
