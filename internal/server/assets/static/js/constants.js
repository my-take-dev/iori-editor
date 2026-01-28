// IORI Server Mode - Constants

/**
 * xterm.js terminal theme configuration
 */
const TERMINAL_THEME = {
    background: '#0d1117',
    foreground: '#c9d1d9',
    cursor: '#ffffff',
    cursorAccent: '#0d1117',
    selectionBackground: '#264f78',
    black: '#0d1117',
    red: '#f85149',
    green: '#56d364',
    yellow: '#e3b341',
    blue: '#58a6ff',
    magenta: '#bc8cff',
    cyan: '#39c5cf',
    white: '#b1bac4',
    brightBlack: '#6e7681',
    brightRed: '#ffa198',
    brightGreen: '#7ee787',
    brightYellow: '#d29922',
    brightBlue: '#79c0ff',
    brightMagenta: '#d2a8ff',
    brightCyan: '#56d4dd',
    brightWhite: '#f0f6fc',
};

/**
 * xterm.js terminal options
 */
const TERMINAL_OPTIONS = {
    theme: TERMINAL_THEME,
    fontSize: 14,
    fontFamily: 'Consolas, "SF Mono", Monaco, "Courier New", monospace',
    cursorBlink: true,
    scrollback: 500,
    convertEol: true,
    // スクロール速度改善
    scrollSensitivity: 30,
    fastScrollSensitivity: 50,
};

/**
 * ANSI escape sequences for special keys (mobile control buttons)
 */
const KEY_MAP = {
    'up':       '\x1b[A',    // ↑
    'down':     '\x1b[B',    // ↓
    'right':    '\x1b[C',    // →
    'left':     '\x1b[D',    // ←
    'enter':    '\r',        // Enter
    'tab':      '\t',        // Tab
    'shifttab': '\x1b[Z',    // Shift+Tab (reverse tab / backtab)
    'escape':   '\x1b',      // Escape
    'ctrlc':    '\x03',      // Ctrl+C
};

/**
 * AI status display texts
 */
const AI_STATUS_TEXTS = {
    'idle': 'AI Idle',
    'running': 'AI Running',
    'error': 'Error',
    'none': 'No Terminal'
};

/**
 * AI activity detection timeout (ms)
 */
const AI_ACTIVITY_TIMEOUT = 500;

/**
 * WebSocket reconnect delay (ms)
 */
const WS_RECONNECT_DELAY = 3000;

/**
 * Toast notification duration (ms)
 */
const TOAST_DURATION = 2000;
