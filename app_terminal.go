package main

// WriteToTerminal writes data to a terminal in a session
func (a *App) WriteToTerminal(sessionID string, terminalType string, data string) error {
	return a.terminalService.WriteToTerminal(sessionID, terminalType, data)
}

// ResizeTerminal resizes a terminal in a session
func (a *App) ResizeTerminal(sessionID string, terminalType string, cols int, rows int) error {
	return a.terminalService.ResizeTerminal(sessionID, terminalType, cols, rows)
}

// GetTerminalHistory returns the terminal output history for a session/terminal type
func (a *App) GetTerminalHistory(sessionID string, terminalType string) (string, error) {
	return a.terminalService.GetTerminalHistory(sessionID, terminalType)
}
