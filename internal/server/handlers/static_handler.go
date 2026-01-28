package handlers

import (
	"embed"
	"fmt"
	"io/fs"
	"log/slog"
	"net/http"
	"path"
	"path/filepath"
	"strings"
)

// StaticHandler handles static file serving
type StaticHandler struct {
	assets embed.FS
}

// NewStaticHandler creates a new StaticHandler
func NewStaticHandler(assets embed.FS) *StaticHandler {
	return &StaticHandler{
		assets: assets,
	}
}

// HandleStatic serves static files from assets/static/
func (h *StaticHandler) HandleStatic(w http.ResponseWriter, r *http.Request) {
	// Remove /static/ prefix and serve from assets/static/
	urlPath := strings.TrimPrefix(r.URL.Path, "/static/")

	// Path traversal protection - use path.Clean for cross-platform embed.FS compatibility
	// embed.FS always uses forward slashes regardless of OS
	cleanPath := path.Clean(urlPath)
	if strings.HasPrefix(cleanPath, "..") || path.IsAbs(cleanPath) {
		http.NotFound(w, r)
		return
	}

	h.serveEmbeddedFile(w, r, "assets/static/"+cleanPath)
}

// HandleVendor serves vendor files from assets/vendor/
func (h *StaticHandler) HandleVendor(w http.ResponseWriter, r *http.Request) {
	urlPath := strings.TrimPrefix(r.URL.Path, "/vendor/")

	// Path traversal protection - use path.Clean for cross-platform embed.FS compatibility
	// embed.FS always uses forward slashes regardless of OS
	cleanPath := path.Clean(urlPath)
	if strings.HasPrefix(cleanPath, "..") || path.IsAbs(cleanPath) {
		http.NotFound(w, r)
		return
	}

	h.serveEmbeddedFile(w, r, "assets/vendor/"+cleanPath)
}

// serveEmbeddedFile serves a file from the embedded filesystem
func (h *StaticHandler) serveEmbeddedFile(w http.ResponseWriter, r *http.Request, filePath string) {
	data, err := h.assets.ReadFile(filePath)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	// Set content type based on extension
	ext := filepath.Ext(filePath)
	contentType := getContentType(ext)
	w.Header().Set("Content-Type", contentType)

	if _, err := w.Write(data); err != nil {
		slog.Warn("Failed to write static file response", "error", err, "path", filePath)
	}
}

// getContentType returns the content type for a file extension
func getContentType(ext string) string {
	switch ext {
	case ".html":
		return "text/html; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	case ".js":
		return "application/javascript; charset=utf-8"
	case ".json":
		return "application/json; charset=utf-8"
	case ".png":
		return "image/png"
	case ".svg":
		return "image/svg+xml"
	case ".ico":
		return "image/x-icon"
	default:
		return "application/octet-stream"
	}
}

// GetAssetsFS returns the embedded assets filesystem for external use
func (h *StaticHandler) GetAssetsFS() (fs.FS, error) {
	subFS, err := fs.Sub(h.assets, "assets")
	if err != nil {
		return nil, fmt.Errorf("failed to access embedded assets: %w", err)
	}
	return subFS, nil
}

// GetAssetsEmbedFS returns the raw embed.FS for cases that need it directly
func (h *StaticHandler) GetAssetsEmbedFS() embed.FS {
	return h.assets
}
