// IORI Server Mode - Terminal Connection Manager

/**
 * WebSocket connection manager for terminal communication
 */
class TerminalConnection {
    /**
     * @param {string} sessionId - Session identifier
     * @param {Terminal} terminal - xterm.js Terminal instance
     * @param {object} options - Configuration options
     * @param {function} options.onStatusChange - Callback for status changes (running/idle)
     * @param {function} options.onError - Callback for error messages
     * @param {function} options.onHistory - Callback when history is received
     * @param {boolean} options.autoReconnect - Enable auto-reconnect (default: true)
     * @param {number} options.reconnectDelay - Reconnect delay in ms (default: WS_RECONNECT_DELAY)
     * @param {boolean} options.autoScroll - Enable auto-scroll on output (default: true)
     */
    constructor(sessionId, terminal, options = {}) {
        this.sessionId = sessionId;
        this.terminal = terminal;
        this.ws = null;
        this.activityTimeout = null;

        // Callbacks
        this.onStatusChange = options.onStatusChange || (() => {});
        this.onError = options.onError || (() => {});
        this.onHistory = options.onHistory || (() => {});

        // Options
        this.autoReconnect = options.autoReconnect !== false;
        this.reconnectDelay = options.reconnectDelay || WS_RECONNECT_DELAY;
        this.autoScroll = options.autoScroll !== false;

        // View check callback for reconnect decision
        this.shouldReconnect = options.shouldReconnect || (() => true);
    }

    /**
     * Build WebSocket URL
     * @returns {string}
     */
    buildWsUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}/ws/terminal/${encodeURIComponent(this.sessionId)}/ai`;
    }

    /**
     * Connect to terminal WebSocket
     */
    connect() {
        if (!this.sessionId) {
            console.error('No session ID available for WebSocket connection');
            return;
        }

        // Close existing connection
        this.disconnect();

        const wsUrl = this.buildWsUrl();
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('AI terminal connected to session:', this.sessionId);
            // Send initial resize info
            if (this.terminal) {
                this.sendResize(this.terminal.cols, this.terminal.rows);
            }
        };

        this.ws.onmessage = (event) => {
            this.handleMessage(event);
        };

        this.ws.onclose = () => {
            console.log('AI terminal disconnected');
            if (this.autoReconnect && this.shouldReconnect()) {
                setTimeout(() => this.connect(), this.reconnectDelay);
            }
        };

        this.ws.onerror = (error) => {
            console.error('AI terminal error:', error);
        };
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        if (this.ws) {
            this.ws.onclose = null; // Prevent auto-reconnect
            this.ws.close(1000, 'Normal closure'); // Send proper close code
            this.ws = null;
        }
        if (this.activityTimeout) {
            clearTimeout(this.activityTimeout);
            this.activityTimeout = null;
        }
    }

    /**
     * Handle incoming WebSocket message
     * @param {MessageEvent} event
     */
    handleMessage(event) {
        try {
            const msg = JSON.parse(event.data);

            switch (msg.type) {
                case 'output':
                    if (this.terminal) {
                        this.terminal.write(msg.data);
                        if (this.autoScroll) {
                            this.terminal.scrollToBottom();
                        }
                        // AI activity detection
                        this.onStatusChange('running');
                        this.resetActivityTimeout();
                    }
                    break;

                case 'history':
                    if (this.terminal) {
                        this.terminal.write(msg.data);
                        if (this.autoScroll) {
                            this.terminal.scrollToBottom();
                        }
                        console.log('Received terminal history');
                        this.onHistory();
                    }
                    break;

                case 'status':
                    this.onStatusChange(msg.data);
                    break;

                case 'error':
                    console.error('Terminal error:', msg.data);
                    this.onError(msg.data);
                    break;

                default:
                    // Unknown message type
                    break;
            }
        } catch (e) {
            // Raw data (non-JSON)
            if (this.terminal) {
                this.terminal.write(event.data);
                if (this.autoScroll) {
                    this.terminal.scrollToBottom();
                }
            }
        }
    }

    /**
     * Reset activity timeout
     */
    resetActivityTimeout() {
        if (this.activityTimeout) {
            clearTimeout(this.activityTimeout);
        }
        this.activityTimeout = setTimeout(() => {
            this.onStatusChange('idle');
        }, AI_ACTIVITY_TIMEOUT);
    }

    /**
     * Check if WebSocket is connected
     * @returns {boolean}
     */
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Send message via WebSocket
     * @param {string} type - Message type
     * @param {*} data - Message data
     */
    send(type, data) {
        if (this.isConnected()) {
            this.ws.send(JSON.stringify({ type, data }));
        }
    }

    /**
     * Send terminal input
     * @param {string} data - Input data
     */
    sendInput(data) {
        this.send('input', data);
    }

    /**
     * Send resize event
     * @param {number} cols - Number of columns
     * @param {number} rows - Number of rows
     */
    sendResize(cols, rows) {
        this.send('resize', { cols, rows });
    }

    /**
     * Send special key
     * @param {string} key - Key name from KEY_MAP
     */
    sendKey(key) {
        const data = KEY_MAP[key];
        if (data) {
            this.sendInput(data);
        }
    }

    /**
     * Update auto-scroll setting
     * @param {boolean} enabled
     */
    setAutoScroll(enabled) {
        this.autoScroll = enabled;
    }
}
