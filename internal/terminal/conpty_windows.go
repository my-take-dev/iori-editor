//go:build windows

package terminal

import (
	"errors"
	"fmt"
	"os"
	"unsafe"

	"golang.org/x/sys/windows"
)

// ErrConPtyUnsupported indicates ConPTY is not available on this Windows version
var ErrConPtyUnsupported = errors.New("ConPty is not available on this version of Windows")

// handleIO wraps a Windows handle for I/O operations
type handleIO struct {
	handle windows.Handle
}

func (h *handleIO) Read(p []byte) (int, error) {
	var numRead uint32
	err := windows.ReadFile(h.handle, p, &numRead, nil)
	return int(numRead), err
}

func (h *handleIO) Write(p []byte) (int, error) {
	var numWritten uint32
	err := windows.WriteFile(h.handle, p, &numWritten, nil)
	return int(numWritten), err
}

func (h *handleIO) Close() error {
	return windows.CloseHandle(h.handle)
}

// ConPty represents a Windows pseudo console
type ConPty struct {
	hpCon  _HPCON
	pi     *windows.ProcessInformation
	ptyIn  *handleIO
	ptyOut *handleIO
	cmdIn  *os.File
	cmdOut *os.File
}

// IsConPtyAvailable checks if ConPTY is supported on this Windows version
func IsConPtyAvailable() bool {
	return isConPtyAvailable()
}

// conPtyArgs holds configuration for ConPTY creation
type conPtyArgs struct {
	coord   _COORD
	workDir string
	env     []string
}

// ConPtyOption is a functional option for ConPTY configuration
type ConPtyOption func(*conPtyArgs)

// ConPtyDimensions sets the console dimensions
func ConPtyDimensions(width, height int) ConPtyOption {
	return func(args *conPtyArgs) {
		args.coord.X = int16(width)
		args.coord.Y = int16(height)
	}
}

// ConPtyWorkDir sets the working directory
func ConPtyWorkDir(workDir string) ConPtyOption {
	return func(args *conPtyArgs) {
		args.workDir = workDir
	}
}

// ConPtyEnv sets environment variables
func ConPtyEnv(env []string) ConPtyOption {
	return func(args *conPtyArgs) {
		args.env = env
	}
}

// Start creates a new ConPTY and starts a process
func Start(commandLine string, options ...ConPtyOption) (*ConPty, error) {
	if !IsConPtyAvailable() {
		return nil, ErrConPtyUnsupported
	}

	// Default configuration
	args := &conPtyArgs{
		coord: _COORD{X: 80, Y: 40},
	}
	for _, opt := range options {
		opt(args)
	}

	// Create pipes for PTY communication
	ptyInRead, ptyInWrite, ptyOutRead, ptyOutWrite, err := createPtyPipes()
	if err != nil {
		return nil, err
	}

	// Create pseudo console
	hpCon, err := createPseudoConsole(&args.coord, ptyInRead, ptyOutWrite)
	if err != nil {
		closeHandles(ptyInRead, ptyInWrite, ptyOutRead, ptyOutWrite)
		return nil, err
	}

	// Close handles that are now owned by the pseudo console
	windows.CloseHandle(ptyInRead)
	windows.CloseHandle(ptyOutWrite)

	// Initialize process thread attribute list
	attrList, err := initializeProcThreadAttrList()
	if err != nil {
		closePseudoConsole(hpCon)
		closeHandles(ptyInWrite, ptyOutRead)
		return nil, err
	}

	// Update attribute list with pseudo console handle
	if err := updateProcThreadAttrWithPseudoConsole(attrList, hpCon); err != nil {
		closePseudoConsole(hpCon)
		closeHandles(ptyInWrite, ptyOutRead)
		return nil, err
	}

	// Create process
	pi, err := createConPtyProcess(commandLine, args, attrList)
	if err != nil {
		closePseudoConsole(hpCon)
		closeHandles(ptyInWrite, ptyOutRead)
		return nil, err
	}

	return &ConPty{
		hpCon:  hpCon,
		pi:     pi,
		ptyIn:  &handleIO{handle: ptyInWrite},
		ptyOut: &handleIO{handle: ptyOutRead},
	}, nil
}

// createPtyPipes creates the input and output pipes for PTY communication
func createPtyPipes() (ptyInRead, ptyInWrite, ptyOutRead, ptyOutWrite windows.Handle, err error) {
	if err = windows.CreatePipe(&ptyInRead, &ptyInWrite, nil, 0); err != nil {
		return 0, 0, 0, 0, fmt.Errorf("failed to create input pipe: %w", err)
	}
	if err = windows.CreatePipe(&ptyOutRead, &ptyOutWrite, nil, 0); err != nil {
		windows.CloseHandle(ptyInRead)
		windows.CloseHandle(ptyInWrite)
		return 0, 0, 0, 0, fmt.Errorf("failed to create output pipe: %w", err)
	}
	return
}

// closeHandles closes all provided Windows handles
func closeHandles(handles ...windows.Handle) {
	for _, h := range handles {
		windows.CloseHandle(h)
	}
}

// createConPtyProcess creates a process attached to the pseudo console
func createConPtyProcess(commandLine string, args *conPtyArgs, attrList []byte) (*windows.ProcessInformation, error) {
	cmdLinePtr, err := windows.UTF16PtrFromString(commandLine)
	if err != nil {
		return nil, err
	}

	var workDirPtr *uint16
	if args.workDir != "" {
		workDirPtr, err = windows.UTF16PtrFromString(args.workDir)
		if err != nil {
			return nil, err
		}
	}

	var si windows.StartupInfo
	si.Cb = uint32(unsafe.Sizeof(si))
	si.Flags = windows.STARTF_USESTDHANDLES

	// Build extended startup info
	siEx := struct {
		StartupInfo   windows.StartupInfo
		AttributeList *byte
	}{
		StartupInfo:   si,
		AttributeList: &attrList[0],
	}
	siEx.StartupInfo.Cb = uint32(unsafe.Sizeof(siEx))

	var pi windows.ProcessInformation
	flags := uint32(windows.EXTENDED_STARTUPINFO_PRESENT)

	err = windows.CreateProcess(
		nil,
		cmdLinePtr,
		nil,
		nil,
		false,
		flags,
		createEnvBlock(args.env),
		workDirPtr,
		&siEx.StartupInfo,
		&pi,
	)
	if err != nil {
		return nil, fmt.Errorf("CreateProcess failed: %w", err)
	}

	return &pi, nil
}

// Read reads from the pseudo console output
func (c *ConPty) Read(p []byte) (int, error) {
	return c.ptyOut.Read(p)
}

// Write writes to the pseudo console input
func (c *ConPty) Write(p []byte) (int, error) {
	return c.ptyIn.Write(p)
}

// Resize changes the pseudo console dimensions
func (c *ConPty) Resize(width, height int) error {
	coord := &_COORD{X: int16(width), Y: int16(height)}
	return resizePseudoConsole(c.hpCon, coord)
}

// Close terminates the process and releases resources
func (c *ConPty) Close() error {
	closePseudoConsole(c.hpCon)

	if c.ptyIn != nil {
		c.ptyIn.Close()
	}
	if c.ptyOut != nil {
		c.ptyOut.Close()
	}
	if c.cmdIn != nil {
		c.cmdIn.Close()
	}
	if c.cmdOut != nil {
		c.cmdOut.Close()
	}

	if c.pi != nil {
		windows.TerminateProcess(c.pi.Process, 0)
		windows.CloseHandle(c.pi.Process)
		windows.CloseHandle(c.pi.Thread)
	}

	return nil
}

// Pid returns the process ID
func (c *ConPty) Pid() int {
	if c.pi == nil {
		return 0
	}
	return int(c.pi.ProcessId)
}
