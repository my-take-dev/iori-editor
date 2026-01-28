package terminal

import (
	"bytes"
	"fmt"
	"log/slog"
	"sync"
	"time"
)

// OutputBuffer buffers terminal output and flushes it at regular intervals
// to reduce the frequency of events sent to the frontend.
type OutputBuffer struct {
	mu            sync.RWMutex
	buffer        bytes.Buffer
	maxSize       int
	flushInterval time.Duration
	flushFunc     func(data []byte)
	ticker        *time.Ticker
	done          chan struct{}
	stopped       bool
	started       bool
}

// NewOutputBuffer creates a new OutputBuffer.
// maxSize: maximum buffer size before forced flush (e.g., 8192 bytes)
// interval: flush interval (e.g., 16ms for ~60fps)
// flushFunc: callback function called with buffered data on flush
// Returns error if parameters are invalid.
func NewOutputBuffer(maxSize int, interval time.Duration, flushFunc func([]byte)) (*OutputBuffer, error) {
	if maxSize <= 0 {
		return nil, fmt.Errorf("maxSize must be positive: got %d", maxSize)
	}
	if interval <= 0 {
		return nil, fmt.Errorf("interval must be positive: got %v", interval)
	}
	if flushFunc == nil {
		return nil, fmt.Errorf("flushFunc must not be nil")
	}
	return &OutputBuffer{
		maxSize:       maxSize,
		flushInterval: interval,
		flushFunc:     flushFunc,
	}, nil
}

// Write adds data to the buffer. If the buffer exceeds maxSize, it flushes immediately.
func (ob *OutputBuffer) Write(data []byte) {
	ob.mu.Lock()
	defer ob.mu.Unlock()

	if ob.stopped {
		return
	}

	ob.buffer.Write(data)

	// Flush immediately if buffer exceeds max size
	if ob.buffer.Len() >= ob.maxSize {
		ob.flushLocked()
	}
}

// Start begins the periodic flush goroutine.
// Can only be called once; subsequent calls are ignored.
func (ob *OutputBuffer) Start() {
	ob.mu.Lock()
	if ob.stopped || ob.started {
		ob.mu.Unlock()
		return
	}
	ob.started = true
	ob.ticker = time.NewTicker(ob.flushInterval)
	ob.done = make(chan struct{})
	ob.mu.Unlock()

	go func() {
		defer func() {
			if r := recover(); r != nil {
				slog.Error("OutputBuffer goroutine panic", "panic", r)
			}
		}()
		for {
			select {
			case <-ob.ticker.C:
				ob.flush()
			case <-ob.done:
				ob.flush() // Flush remaining data before exit
				return
			}
		}
	}()
}

// Stop stops the periodic flush and flushes any remaining data.
func (ob *OutputBuffer) Stop() {
	ob.mu.Lock()
	if ob.stopped {
		ob.mu.Unlock()
		return
	}
	ob.stopped = true
	if ob.ticker != nil {
		ob.ticker.Stop()
	}
	if ob.done != nil {
		close(ob.done)
	}
	ob.mu.Unlock()
}

// flush sends buffered data to the flush function.
func (ob *OutputBuffer) flush() {
	ob.mu.Lock()
	defer ob.mu.Unlock()
	ob.flushLocked()
}

// flushLocked sends buffered data to the flush function (caller must hold lock).
// Executes flushFunc synchronously to guarantee output order.
func (ob *OutputBuffer) flushLocked() {
	if ob.buffer.Len() == 0 {
		return
	}

	data := make([]byte, ob.buffer.Len())
	copy(data, ob.buffer.Bytes())
	ob.buffer.Reset()

	// Execute synchronously to maintain order
	ob.flushFunc(data)
}
