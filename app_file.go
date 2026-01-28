package main

import (
	"iori-editor/internal/services"
	"iori-editor/internal/session"
)

// PartialFileContent is re-exported for Wails binding
type PartialFileContent = services.PartialFileContent

// ReadFile reads a file's content
func (a *App) ReadFile(sessionID string, relativePath string) (string, error) {
	return a.fileService.ReadFile(sessionID, relativePath)
}

// GetFileInfo returns file metadata without reading content
func (a *App) GetFileInfo(sessionID string, relativePath string) (session.FileMetadata, error) {
	return a.fileService.GetFileInfo(sessionID, relativePath)
}

// ReadFilePartial reads only the first maxBytes of a file (for large file preview)
func (a *App) ReadFilePartial(sessionID string, relativePath string, maxBytes int64) (PartialFileContent, error) {
	return a.fileService.ReadFilePartial(sessionID, relativePath, maxBytes)
}

// WriteFile writes content to a file
func (a *App) WriteFile(sessionID string, relativePath string, content string) error {
	return a.fileService.WriteFile(sessionID, relativePath, content)
}

// RenameFile renames a file in the session
func (a *App) RenameFile(sessionID string, oldPath string, newPath string) error {
	return a.fileService.RenameFile(sessionID, oldPath, newPath)
}

// DeleteFile deletes a file in the session
func (a *App) DeleteFile(sessionID string, relativePath string) error {
	return a.fileService.DeleteFile(sessionID, relativePath)
}

// GetFileTree returns the file tree for a session
func (a *App) GetFileTree(sessionID string) ([]*session.FileNode, error) {
	return a.fileService.GetFileTree(sessionID)
}

// GetDirectoryChildren returns the children of a specific directory for lazy loading
func (a *App) GetDirectoryChildren(sessionID string, path string) ([]*session.FileNode, error) {
	return a.fileService.GetDirectoryChildren(sessionID, path)
}
