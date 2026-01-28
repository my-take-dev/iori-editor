// IORI Server Mode - Alpine.js Application

/**
 * Create UI store for view state management
 */
function createUIStore() {
    return {
        view: 'list',
        tab: 'ai',
        modalOpen: false,
        mdViewerOpen: false,
        toastMessage: '',

        showToast(message) {
            this.toastMessage = message;
            setTimeout(() => {
                this.toastMessage = '';
            }, TOAST_DURATION);
        }
    };
}

/**
 * Create session store for session management
 */
function createSessionStore() {
    return {
        sessionId: '',
        baseBranch: '',
        repoPath: '',
        currentSessionId: '',
        currentBranch: '',
        currentWorktreePath: '',

        initFromBody() {
            const body = document.body;
            this.sessionId = body.dataset.sessionId || '';
            this.baseBranch = body.dataset.baseBranch || 'main';
            this.repoPath = body.dataset.repoPath || '';
            this.currentBranch = this.baseBranch;
        }
    };
}

/**
 * Create terminal store for terminal management
 */
function createTerminalStore() {
    return {
        aiTerminal: null,
        aiFitAddon: null,
        connection: null,
        aiRunning: false,
        autoScroll: true,

        toggleAutoScroll() {
            this.autoScroll = !this.autoScroll;
            if (this.connection) {
                this.connection.setAutoScroll(this.autoScroll);
            }
            return this.autoScroll;
        }
    };
}

/**
 * Create worktree store for worktree management
 */
function createWorktreeStore() {
    return {
        worktrees: [],
        deleteConfirmOpen: false,
        deleteTargetBranch: '',
        deleteBranchToo: false,

        openDeleteConfirm(branch) {
            this.deleteTargetBranch = branch;
            this.deleteBranchToo = false;
            this.deleteConfirmOpen = true;
        },

        cancelDelete() {
            this.deleteConfirmOpen = false;
            this.deleteTargetBranch = '';
            this.deleteBranchToo = false;
        },

        updateAiStatus(branch, status) {
            const wt = this.worktrees.find(w => w.branch === branch);
            if (wt) {
                wt.aiStatus = status;
            }
        }
    };
}

/**
 * Create modal store for modal state
 */
function createModalStore() {
    return {
        createType: 'new',
        newBranchName: '',
        selectedBranch: '',
        availableBranches: []
    };
}

/**
 * Create file explorer store
 */
function createFileStore() {
    return {
        fileTree: [],
        currentMdFile: { name: '', path: '', content: '' },
        renderedMdContent: '',
        expandedFolders: {} // Track expanded state by path
    };
}

/**
 * Main Alpine.js application
 */
function app() {
    // Initialize stores
    const ui = createUIStore();
    const session = createSessionStore();
    const terminal = createTerminalStore();
    const worktree = createWorktreeStore();
    const modal = createModalStore();
    const file = createFileStore();

    return {
        // Spread stores (flat structure for Alpine.js compatibility)
        ...ui,
        ...session,
        ...terminal,
        ...worktree,
        ...modal,
        ...file,

        // Loading states
        commitPushLoading: false,
        createWorktreeLoading: false,

        // xterm.js options (reference external constant)
        terminalOptions: TERMINAL_OPTIONS,

        // Initialize application
        async init() {
            // Store reference for global access (used by dynamically rendered HTML)
            window.appInstance = this;

            await this.clearAllCaches();
            session.initFromBody.call(this);
            await this.loadBranches();
            await this.loadWorktrees();
        },

        // ========================================
        // Worktree Operations
        // ========================================

        async loadWorktrees() {
            try {
                const data = await api.worktrees.list();
                this.worktrees = data.worktrees || [];
                if (data.warning) {
                    this.showToast('Warning: ' + data.warning);
                }
            } catch (error) {
                console.error('Failed to load worktrees:', error);
                this.showToast(error.error || 'Network error: Failed to load worktrees');
            }
        },

        async fetchRemote() {
            try {
                const data = await api.worktrees.fetch();
                if (data.success) {
                    this.showToast('Fetch completed');
                    await this.loadWorktrees();
                } else {
                    this.showToast(data.message || 'Fetch failed');
                }
            } catch (error) {
                console.error('Fetch failed:', error);
                this.showToast('Fetch failed');
            }
        },

        async selectWorktree(wt) {
            this.currentBranch = wt.branch;

            try {
                const data = await api.worktrees.getSession(wt.branch);
                this.currentSessionId = data.sessionId;
                this.currentWorktreePath = data.path || '';
                console.log('Session ready:', data.sessionId, 'Terminal status:', data.terminalStatus, 'Path:', data.path);
            } catch (error) {
                console.error('Failed to get session:', error);
                this.showToast(error.error || 'Network error: Failed to connect to terminal');
                return;
            }

            // Reset tab to AI terminal and clear old file tree when switching branches
            this.tab = 'ai';
            this.fileTree = [];

            this.view = 'terminal';
            this.$nextTick(() => {
                this.initAiTerminal();
                this.aiTerminal?.focus();
            });
        },

        async createWorktree() {
            if (this.createWorktreeLoading) return;

            let requestBody;

            if (this.createType === 'new') {
                requestBody = {
                    baseBranch: this.baseBranch,
                    customName: this.newBranchName || 'work',
                    createNew: true
                };
            } else {
                if (!this.selectedBranch) {
                    this.showToast('Please select a branch');
                    return;
                }
                requestBody = {
                    branch: this.selectedBranch,
                    createNew: false
                };
            }

            this.createWorktreeLoading = true;

            try {
                await api.worktrees.create(requestBody);
                this.modalOpen = false;
                this.newBranchName = '';
                this.selectedBranch = '';
                this.loadWorktrees();
                this.showToast('Worktree created');
            } catch (error) {
                console.error('Create failed:', error);
                this.showToast(error.error || 'Create failed');
            } finally {
                this.createWorktreeLoading = false;
            }
        },

        async confirmDelete() {
            const branch = this.deleteTargetBranch;
            const deleteBranch = this.deleteBranchToo;

            try {
                const data = await api.worktrees.remove(branch, deleteBranch);
                this.worktrees = this.worktrees.filter(wt => wt.branch !== branch);

                if (deleteBranch && data.branchDeleted) {
                    this.showToast('Worktree and branch deleted');
                } else if (deleteBranch && data.branchDeleteError) {
                    this.showToast('Worktree deleted, but branch deletion failed');
                } else {
                    this.showToast('Worktree deleted');
                }
            } catch (error) {
                console.error('Delete failed:', error);
                this.showToast(error.error || 'Network error: Delete failed');
            } finally {
                this.cancelDelete();
            }
        },

        openDeleteConfirm(branch) {
            worktree.openDeleteConfirm.call(this, branch);
        },

        cancelDelete() {
            worktree.cancelDelete.call(this);
        },

        updateWorktreeAiStatus(branch, status) {
            worktree.updateAiStatus.call(this, branch, status);
        },

        // ========================================
        // Branch Operations
        // ========================================

        async loadBranches() {
            try {
                const data = await api.branches.list();
                this.availableBranches = data.branches || [];
            } catch (error) {
                console.error('Failed to load branches:', error);
                this.showToast(error.error || 'Network error: Failed to load branches');
            }
        },

        // ========================================
        // Terminal Operations
        // ========================================

        switchTab(newTab) {
            this.tab = newTab;
            if (newTab === 'ai') {
                this.$nextTick(() => {
                    this.fitTerminal();
                });
            }
            if (newTab === 'explorer') {
                this.loadFileTree();
            }
        },

        initAiTerminal() {
            const container = this.$refs.aiTerminalContainer;
            if (!container || typeof Terminal === 'undefined') return;

            if (!this.aiTerminal) {
                this.aiTerminal = new Terminal(this.terminalOptions);
                this.aiFitAddon = new FitAddon.FitAddon();
                this.aiTerminal.loadAddon(this.aiFitAddon);
                this.aiTerminal.open(container);
                // ==========================================
                // 【追加箇所】 iPhone Chrome 秘匿情報バー対策
                // ==========================================
                const xtermTextarea = container.querySelector('.xterm-helper-textarea');
                if (xtermTextarea) {
                    xtermTextarea.setAttribute('autocomplete', 'off');
                    // 念のため type="search" も設定しておくとより確実です
                    xtermTextarea.setAttribute('type', 'search');
                }
                // Handle direct keyboard input
                this.aiTerminal.onData((data) => {
                    if (this.connection && this.connection.isConnected()) {
                        this.connection.sendInput(data);
                    }
                });

                window.addEventListener('resize', () => {
                    if (this.aiFitAddon && this.tab === 'ai') {
                        this.aiFitAddon.fit();
                    }
                });

                // カスタムタッチスクロールハンドラー（scrollLines API使用）
                const termContainer = this.aiTerminal.element;
                if (termContainer) {
                    let touchStartY = 0;
                    const terminal = this.aiTerminal;

                    termContainer.addEventListener('touchstart', (e) => {
                        touchStartY = e.touches[0].clientY;
                    }, { passive: true });

                    termContainer.addEventListener('touchmove', (e) => {
                        const touchEndY = e.touches[0].clientY;
                        const diff = touchStartY - touchEndY;

                        // 感度調整: 15pxごとに1行スクロール
                        if (Math.abs(diff) > 10) {
                            const lines = Math.floor(diff / 10);
                            if (lines !== 0) {
                                terminal.scrollLines(lines);
                                touchStartY = touchEndY;
                            }
                        }
                    }, { passive: true });
                }
            }

            // Clear terminal for new session
            this.aiTerminal.clear();

            setTimeout(() => {
                this.aiFitAddon.fit();
                this.connectTerminalWs();
                this.aiTerminal.focus();
            }, 100);
        },

        fitTerminal() {
            if (this.aiFitAddon) {
                this.aiFitAddon.fit();
            }
        },

        disconnectTerminalWs() {
            if (this.connection) {
                this.connection.disconnect();
                this.connection = null;
            }
        },

        connectTerminalWs() {
            if (!this.currentSessionId) {
                console.error('No session ID available for WebSocket connection');
                return;
            }

            this.disconnectTerminalWs();

            this.connection = new TerminalConnection(
                this.currentSessionId,
                this.aiTerminal,
                {
                    autoScroll: this.autoScroll,
                    onStatusChange: (status) => {
                        this.aiRunning = status === 'running';
                        this.updateWorktreeAiStatus(this.currentBranch, status);
                    },
                    onError: (message) => {
                        this.showToast(message);
                    },
                    shouldReconnect: () => {
                        return this.view === 'terminal' && this.currentSessionId;
                    }
                }
            );

            this.connection.connect();
        },

        sendKey(key) {
            if (this.connection && this.connection.isConnected()) {
                this.connection.sendKey(key);
            }
        },

        async pasteFromClipboard() {
            if (this.connection && this.connection.isConnected()) {
                let text = null;

                // 1. クリップボードAPIを試す
                try {
                    text = await navigator.clipboard.readText();
                } catch (error) {
                    console.log('Clipboard API not available, using prompt fallback');
                }

                // 2. フォールバック: promptでテキスト入力を求める
                if (!text) {
                    text = prompt('Paste text here:');
                }

                // 3. テキストを送信
                if (text) {
                    this.connection.sendInput(text);
                }
            }
        },

        toggleAutoScroll() {
            this.autoScroll = terminal.toggleAutoScroll.call(this);
            this.showToast(this.autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF');
        },

        async disconnectAndGoBack() {
            // Delete session via API first
            if (this.currentSessionId) {
                try {
                    await api.worktrees.deleteSession(this.currentSessionId);
                } catch (error) {
                    console.error('Failed to delete session:', error);
                }
            }

            // Disconnect WebSocket
            this.disconnectTerminalWs();

            // Update worktree status to 'none' (No Terminal)
            if (this.currentBranch) {
                this.updateWorktreeAiStatus(this.currentBranch, 'none');
            }
            this.currentSessionId = '';
            this.currentBranch = '';
            this.view = 'list';
            this.showToast('Terminal disconnected');
        },

        // ========================================
        // Commit & Push
        // ========================================

        async commitAndPush() {
            if (this.commitPushLoading) return;

            if (!this.currentSessionId) {
                this.showToast('セッションが選択されていません');
                return;
            }

            this.commitPushLoading = true;

            try {
                const message = `Update from mobile (${new Date().toLocaleString('ja-JP')})`;
                const data = await api.worktrees.commitPush(this.currentBranch, this.currentSessionId, message);
                if (data.success) {
                    this.showToast('コミット＆プッシュ完了');
                } else {
                    this.showToast(data.error || 'コミット＆プッシュ失敗');
                }
            } catch (error) {
                console.error('Commit and push failed:', error);
                this.showToast('ネットワークエラー: ' + (error.message || '接続に失敗しました'));
            } finally {
                this.commitPushLoading = false;
            }
        },

        // ========================================
        // File Explorer
        // ========================================

        async loadFileTree() {
            try {
                const data = await api.files.list(this.currentWorktreePath);
                this.fileTree = data.files || [];
                // Reset expanded state when loading new tree
                this.expandedFolders = {};
            } catch (error) {
                console.error('Failed to load file tree:', error);
                this.showToast(error.error || 'Network error: Failed to load file tree');
            }
        },

        async openMdViewer(file) {
            try {
                const data = await api.files.get(file.path, this.currentWorktreePath);
                this.currentMdFile = file;
                this.renderedMdContent = this.renderMarkdown(data.content);
                this.mdViewerOpen = true;
            } catch (error) {
                console.error('Failed to load file:', error);
                this.showToast(error.error || 'Network error: Failed to load file');
            }
        },

        renderMarkdown(text) {
            if (!text) return '';
            let html = text
                .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                .replace(/- \[x\] (.+)/g, '&#x2705; $1<br>')
                .replace(/- \[ \] (.+)/g, '&#x2B1C; $1<br>')
                .replace(/^- (.+)$/gm, '&#x2022; $1<br>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>');
            return '<p>' + html + '</p>';
        },

        /**
         * Toggle folder expanded state
         * @param {string} path - Folder path
         */
        toggleFolder(path) {
            this.expandedFolders[path] = !this.expandedFolders[path];
            // Force re-render by updating fileTree reference
            this.fileTree = [...this.fileTree];
        },

        /**
         * Check if folder is expanded
         * @param {string} path - Folder path
         * @returns {boolean}
         */
        isFolderExpanded(path) {
            return !!this.expandedFolders[path];
        },

        /**
         * Render file tree item recursively (unlimited depth)
         * @param {Object} item - File tree item
         * @param {number} level - Current nesting level
         * @returns {string} HTML string
         */
        renderTreeItem(item, level = 0) {
            const escapedPath = item.path.replace(/'/g, "\\'").replace(/"/g, '&quot;');

            if (item.type === 'file') {
                return `
                    <div class="tree-item tree-file"
                         onclick="window.appInstance.openMdViewer({name: '${this.escapeHtml(item.name).replace(/'/g, "\\'")}', path: '${escapedPath}', type: 'file'})">
                        <span class="tree-icon">&#x1F4C4;</span>
                        <span class="tree-name">${this.escapeHtml(item.name)}</span>
                        <button class="copy-path-btn"
                                onclick="event.stopPropagation(); window.appInstance.copyPathToClipboard('${escapedPath}')">&#x1F4CB;</button>
                    </div>
                `;
            }

            // Folder
            const isExpanded = this.isFolderExpanded(item.path);
            const folderIcon = isExpanded ? '&#x1F4C2;' : '&#x1F4C1;';
            const toggleIcon = isExpanded ? '&#x25BC;' : '&#x25B6;';
            const childrenDisplay = isExpanded ? 'block' : 'none';

            const childrenHtml = (item.children || [])
                .map(child => this.renderTreeItem(child, level + 1))
                .join('');

            return `
                <div class="tree-folder-container">
                    <div class="tree-item tree-folder">
                        <div class="folder-info" onclick="window.appInstance.toggleFolder('${escapedPath}')">
                            <span class="tree-icon">${folderIcon}</span>
                            <span class="tree-name">${this.escapeHtml(item.name)}</span>
                            <span class="tree-toggle">${toggleIcon}</span>
                        </div>
                        <button class="copy-path-btn"
                                onclick="event.stopPropagation(); window.appInstance.copyPathToClipboard('${escapedPath}')">&#x1F4CB;</button>
                    </div>
                    <div class="tree-children" style="display: ${childrenDisplay}">
                        ${childrenHtml}
                    </div>
                </div>
            `;
        },

        /**
         * Render entire file tree
         * @returns {string} HTML string
         */
        renderFileTree() {
            return this.fileTree.map(item => this.renderTreeItem(item, 0)).join('');
        },

        /**
         * Escape HTML special characters
         * @param {string} text
         * @returns {string}
         */
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        async copyPathToClipboard(path) {
            try {
                const basePath = this.currentWorktreePath || this.repoPath || '';
                let fullPath = path;

                if (basePath) {
                    const trimmedBasePath = basePath.replace(/[\\/]+$/, '');
                    const trimmedPath = path.replace(/^[\\/]+/, '');
                    fullPath = trimmedPath ? `${trimmedBasePath}/${trimmedPath}` : trimmedBasePath;
                }

                if (basePath && (basePath.includes('\\') || /^[a-zA-Z]:[\\/]/.test(basePath))) {
                    fullPath = fullPath.replace(/\//g, '\\');
                }

                // Clipboard API が利用可能な場合
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(fullPath);
                } else {
                    // フォールバック: execCommand を使用
                    const textarea = document.createElement('textarea');
                    textarea.value = fullPath;
                    textarea.style.position = 'fixed';
                    textarea.style.left = '-9999px';
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                }
                this.showToast('Path copied to clipboard');
            } catch (err) {
                console.error('Failed to copy:', err);
                this.showToast('Failed to copy path');
            }
            if (this.mdViewerOpen) {
                this.mdViewerOpen = false;
            }
        },

        // ========================================
        // Utility Functions
        // ========================================

        getAiStatusText(status) {
            return AI_STATUS_TEXTS[status] || '';
        },

        showToast(message) {
            ui.showToast.call(this, message);
        },

        async logout() {
            try {
                // Disconnect terminal first
                this.disconnectTerminalWs();
                await api.auth.logout();
            } catch (error) {
                console.error('Logout failed:', error);
                this.showToast('Logout failed');
            }
        },

        async clearAllCaches() {
            try {
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                        await registration.unregister();
                        console.log('Service Worker unregistered');
                    }
                }

                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    for (const cacheName of cacheNames) {
                        await caches.delete(cacheName);
                        console.log('Cache deleted:', cacheName);
                    }
                }

                sessionStorage.clear();
                console.log('sessionStorage cleared');

                const keysToPreserve = ['commit-templates'];
                const allKeys = Object.keys(localStorage);
                for (const key of allKeys) {
                    if (!keysToPreserve.includes(key)) {
                        localStorage.removeItem(key);
                    }
                }
                console.log('localStorage cleared (preserving user data)');

            } catch (error) {
                console.error('Failed to clear caches:', error);
            }
        }
    };
}
