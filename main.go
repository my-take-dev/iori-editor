package main

import (
	"embed"
	"fmt"
	"log/slog"
	"os"
	"runtime"

	"iori-editor/internal/logger"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

const banner = `
  _____  ____   _____   _____
 |_   _|/ __ \ |  __ \ |_   _|
   | | | |  | || |__) |  | |
   | | | |  | ||  _  /   | |
  _| |_| |__| || | \ \  _| |_
 |_____|\_____||_|  \_\|_____|

    >> AI Native CLI Editor <<

`

func main() {
	// Initialize critical error logger
	if err := logger.Init(); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: Failed to initialize crash logger: %v\n", err)
	}
	defer logger.Close()

	// Setup panic recovery for the entire application
	defer func() {
		if r := recover(); r != nil {
			logger.Panic(r)
			fmt.Fprintf(os.Stderr, "FATAL: Application crashed. See crash.log for details.\n")
			os.Exit(1)
		}
	}()

	// Setup structured logging with a clean format
	slogger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(slogger)

	// Print the banner
	fmt.Print(banner)
	slogger.Info("Initializing application...",
		"os", runtime.GOOS,
		"arch", runtime.GOARCH,
		"go_version", runtime.Version(),
	)

	app := NewApp()

	// Configure application options
	appOptions := &options.App{
		Title:            fmt.Sprintf("IORI v%s", "0.0.1"),
		Width:            1400,
		Height:           900,
		DisableResize:    false,
		MinWidth:         1024,
		MinHeight:        768,
		BackgroundColour: &options.RGBA{R: 13, G: 17, B: 23, A: 255}, // GitHub Dimmed Dark
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		OnStartup:  app.startup,
		OnShutdown: app.shutdown,
		Bind: []interface{}{
			app,
		},
		// Windows specific modern features
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  true,         // Enable translucency for backdrop effects
			BackdropType:         windows.Mica, // Use Mica material (Win11)
			DisableWindowIcon:    false,
			Theme:                windows.Dark, // Force dark theme
			CustomTheme: &windows.ThemeSettings{
				DarkModeTitleBar:   windows.RGB(20, 20, 20),
				DarkModeTitleText:  windows.RGB(200, 200, 200),
				DarkModeBorder:     windows.RGB(50, 50, 50),
				LightModeTitleBar:  windows.RGB(200, 200, 200),
				LightModeTitleText: windows.RGB(20, 20, 20),
				LightModeBorder:    windows.RGB(200, 200, 200),
			},
		},
	}

	// Run the application
	if err := wails.Run(appOptions); err != nil {
		logger.Critical("Application failed to start", err)
		slogger.Error("Fatal error encountered", "error", err)
		os.Exit(1)
	}
}
