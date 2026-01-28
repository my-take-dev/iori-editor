package handlers

import (
	"bytes"
	"embed"
	"html/template"
	"log/slog"
	"net/http"
)

// ViewConfig holds the configuration needed for view rendering
type ViewConfig struct {
	RepoPath    string
	BaseBranch  string
	HasPassword bool
	SessionID   string
}

// ViewHandler handles HTML page rendering
type ViewHandler struct {
	assets embed.FS
	config *ViewConfig
}

// NewViewHandler creates a new ViewHandler
func NewViewHandler(assets embed.FS, config *ViewConfig) *ViewHandler {
	return &ViewHandler{
		assets: assets,
		config: config,
	}
}

// HandleIndex serves the main HTML page
func (h *ViewHandler) HandleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	// Parse main template with partials
	tmpl, err := template.ParseFS(h.assets,
		"assets/templates/index.html",
		"assets/templates/partials/*.html")
	if err != nil {
		slog.Error("Failed to parse index template", "error", err)
		h.serveBasicPage(w, "IORI Server Mode", "Server is running. Template not yet configured.")
		return
	}

	// Template data
	data := map[string]interface{}{
		"Title":       "IORI Server Mode",
		"RepoPath":    h.config.RepoPath,
		"BaseBranch":  h.config.BaseBranch,
		"HasPassword": h.config.HasPassword,
		"SessionID":   h.config.SessionID,
	}

	// Buffer template output to prevent partial response on error
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		slog.Error("Template execution failed", "error", err, "template", "index")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if _, err := buf.WriteTo(w); err != nil {
		slog.Warn("Failed to write template response", "error", err)
	}
}

// HandleLoginPage serves the login page
func (h *ViewHandler) HandleLoginPage(w http.ResponseWriter, r *http.Request) {
	if !h.config.HasPassword {
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	tmplData, err := h.assets.ReadFile("assets/templates/login.html")
	if err != nil {
		// Serve basic login form
		slog.Warn("Login template not found, serving basic login page", "error", err)
		h.serveBasicLoginPage(w)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if _, err := w.Write(tmplData); err != nil {
		slog.Warn("Failed to write login page response", "error", err)
	}
}

// serveBasicPage serves a basic HTML page
func (h *ViewHandler) serveBasicPage(w http.ResponseWriter, title, message string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	html := `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>` + template.HTMLEscapeString(title) + `</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0d1117;
            color: #f0f6fc;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
        }
        .container {
            text-align: center;
            padding: 40px;
        }
        h1 { color: #58a6ff; }
        p { color: #8b949e; }
    </style>
</head>
<body>
    <div class="container">
        <h1>` + template.HTMLEscapeString(title) + `</h1>
        <p>` + template.HTMLEscapeString(message) + `</p>
    </div>
</body>
</html>`
	if _, err := w.Write([]byte(html)); err != nil {
		slog.Warn("Failed to write basic page response", "error", err)
	}
}

// serveBasicLoginPage serves a basic login page
func (h *ViewHandler) serveBasicLoginPage(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	html := `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>IORI - Login</title>
    <style>
        :root {
            --bg-primary: #0d1117;
            --bg-secondary: #161b22;
            --border-color: #30363d;
            --text-primary: #f0f6fc;
            --text-secondary: #8b949e;
            --accent-blue: #58a6ff;
            --accent-red: #f85149;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .login-box {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 32px;
            width: 90%;
            max-width: 340px;
        }
        h1 {
            font-size: 24px;
            margin-bottom: 8px;
            text-align: center;
        }
        .subtitle {
            color: var(--text-secondary);
            text-align: center;
            margin-bottom: 24px;
            font-size: 14px;
        }
        .form-group { margin-bottom: 16px; }
        label {
            display: block;
            font-size: 14px;
            margin-bottom: 8px;
            color: var(--text-secondary);
        }
        input[type="password"] {
            width: 100%;
            padding: 12px 16px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            color: var(--text-primary);
            font-size: 16px;
        }
        input[type="password"]:focus {
            outline: none;
            border-color: var(--accent-blue);
        }
        button {
            width: 100%;
            padding: 14px;
            background: var(--accent-blue);
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
        }
        button:active { opacity: 0.8; }
        .error {
            color: var(--accent-red);
            font-size: 14px;
            margin-bottom: 16px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="login-box">
        <h1>IORI</h1>
        <p class="subtitle">Server Mode</p>
        <form action="/api/auth/login" method="POST">
            <div class="form-group">
                <label for="password">パスワード</label>
                <input type="password" id="password" name="password" placeholder="パスワードを入力" autofocus>
            </div>
            <button type="submit">ログイン</button>
        </form>
    </div>
</body>
</html>`
	if _, err := w.Write([]byte(html)); err != nil {
		slog.Warn("Failed to write basic login page response", "error", err)
	}
}
