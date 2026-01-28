package main

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v3/process"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// RecentFolder represents a recently opened folder
type RecentFolder struct {
	Path string `json:"path"`
	Name string `json:"name"`
	Date string `json:"date"`
}

// ResourceUsage contains CPU and memory usage information
type ResourceUsage struct {
	CPUPercent    float64 `json:"cpuPercent"`
	MemoryMB      float64 `json:"memoryMB"`
	MemoryPercent float64 `json:"memoryPercent"`
}

// recentFolders stores the list of recent folders (in-memory for now)
var recentFolders []RecentFolder

// SelectDirectory opens a directory selection dialog
func (a *App) SelectDirectory() (string, error) {
	result, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Project Folder",
	})
	if err != nil {
		return "", fmt.Errorf("failed to open directory dialog: %w", err)
	}
	return result, nil
}

// GetRecentFolders returns the list of recently opened folders
func (a *App) GetRecentFolders() []RecentFolder {
	return recentFolders
}

// AddRecentFolder adds a folder to the recent list
func (a *App) AddRecentFolder(path string) {
	name := path
	// Extract folder name from path
	if idx := max(strings.LastIndex(path, "/"), strings.LastIndex(path, "\\")); idx >= 0 {
		name = path[idx+1:]
	}

	// Remove if already exists
	filtered := make([]RecentFolder, 0)
	for _, f := range recentFolders {
		if f.Path != path {
			filtered = append(filtered, f)
		}
	}

	// Add to front
	t := time.Now()
	recentFolders = append([]RecentFolder{{
		Path: path,
		Name: name,
		Date: fmt.Sprintf("%d-%02d-%02d", t.Year(), int(t.Month()), t.Day()),
	}}, filtered...)

	// Keep only last 10
	if len(recentFolders) > 10 {
		recentFolders = recentFolders[:10]
	}
}

// GetResourceUsage returns the current resource usage of this application
func (a *App) GetResourceUsage() (ResourceUsage, error) {
	pid := int32(os.Getpid())
	proc, err := process.NewProcess(pid)
	if err != nil {
		return ResourceUsage{}, fmt.Errorf("failed to get process: %w", err)
	}

	cpuPercent, err := proc.CPUPercent()
	if err != nil {
		cpuPercent = 0
	}

	memInfo, err := proc.MemoryInfo()
	if err != nil {
		return ResourceUsage{CPUPercent: cpuPercent}, nil
	}

	memoryMB := float64(memInfo.RSS) / 1024 / 1024

	memPercent, err := proc.MemoryPercent()
	if err != nil {
		memPercent = 0
	}

	return ResourceUsage{
		CPUPercent:    cpuPercent,
		MemoryMB:      memoryMB,
		MemoryPercent: float64(memPercent),
	}, nil
}
