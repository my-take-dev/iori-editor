//go:build windows

package git

import (
	"os/exec"
	"syscall"
)

// hideWindow sets the SysProcAttr to hide the console window on Windows
func hideWindow(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow: true,
	}
}
