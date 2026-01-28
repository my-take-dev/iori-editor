// IORI Server Mode - API Client

/**
 * Centralized API client with common error handling
 */
const api = {
    /**
     * Base request method with common error handling
     * @param {string} url - The API endpoint URL
     * @param {RequestInit} options - Fetch options
     * @returns {Promise<Response>}
     */
    async request(url, options = {}) {
        const response = await fetch(url, options);
        if (response.status === 401) {
            window.location.href = '/login';
            throw new Error('Unauthorized');
        }
        return response;
    },

    /**
     * GET request
     * @param {string} url - The API endpoint URL
     * @returns {Promise<Response>}
     */
    async get(url) {
        return this.request(url);
    },

    /**
     * POST request with JSON body
     * @param {string} url - The API endpoint URL
     * @param {object} body - Request body (will be JSON stringified)
     * @returns {Promise<Response>}
     */
    async post(url, body = null) {
        const options = {
            method: 'POST',
        };
        if (body !== null) {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(body);
        }
        return this.request(url, options);
    },

    /**
     * DELETE request
     * @param {string} url - The API endpoint URL
     * @returns {Promise<Response>}
     */
    async delete(url) {
        return this.request(url, { method: 'DELETE' });
    },

    /**
     * Parse JSON response with fallback
     * @param {Response} response - Fetch response
     * @returns {Promise<object>}
     */
    async parseJson(response) {
        try {
            return await response.json();
        } catch {
            return {};
        }
    },

    // Worktree API endpoints
    worktrees: {
        /**
         * List all worktrees
         * @returns {Promise<{worktrees: Array, warning?: string}>}
         */
        async list() {
            const response = await api.get('/api/worktrees');
            if (response.ok) {
                return await response.json();
            }
            throw await api.parseJson(response);
        },

        /**
         * Fetch from remote repository
         * @returns {Promise<{success: boolean, message?: string}>}
         */
        async fetch() {
            const response = await api.get('/api/worktrees/fetch');
            if (response.ok) {
                return await response.json();
            }
            throw new Error('Fetch failed');
        },

        /**
         * Create a new worktree
         * @param {object} body - Creation parameters
         * @returns {Promise<object>}
         */
        async create(body) {
            const response = await api.post('/api/worktrees', body);
            if (response.ok) {
                return await response.json();
            }
            throw await api.parseJson(response);
        },

        /**
         * Delete a worktree
         * @param {string} branch - Branch name
         * @param {boolean} deleteBranch - Also delete the branch
         * @returns {Promise<object>}
         */
        async remove(branch, deleteBranch = false) {
            const url = `/api/worktrees/${encodeURIComponent(branch)}${deleteBranch ? '?deleteBranch=true' : ''}`;
            const response = await api.delete(url);
            if (response.ok) {
                return await response.json();
            }
            throw await api.parseJson(response);
        },

        /**
         * Get or create session for a worktree
         * @param {string} branch - Branch name
         * @returns {Promise<{sessionId: string, terminalStatus: string}>}
         */
        async getSession(branch) {
            const response = await api.post(`/api/worktrees/${encodeURIComponent(branch)}/session`);
            if (response.ok) {
                return await response.json();
            }
            throw await api.parseJson(response);
        },

        /**
         * Commit and push changes
         * @param {string} branch - Branch name
         * @param {string} sessionId - Session ID
         * @param {string} message - Commit message
         * @returns {Promise<{success: boolean, error?: string}>}
         */
        async commitPush(branch, sessionId, message) {
            const response = await api.post(`/api/worktrees/${encodeURIComponent(branch)}/commit-push`, {
                sessionId,
                message
            });
            if (response.ok) {
                return await response.json();
            }
            throw await api.parseJson(response);
        },

        /**
         * Delete a session
         * @param {string} sessionId - Session ID
         * @returns {Promise<{success: boolean}>}
         */
        async deleteSession(sessionId) {
            const response = await api.delete(`/api/worktrees/session/${encodeURIComponent(sessionId)}`);
            if (response.ok) {
                return await response.json();
            }
            throw await api.parseJson(response);
        }
    },

    // Branch API endpoints
    branches: {
        /**
         * List all branches
         * @returns {Promise<{branches: Array}>}
         */
        async list() {
            const response = await api.get('/api/branches');
            if (response.ok) {
                return await response.json();
            }
            throw await api.parseJson(response);
        }
    },

    // File API endpoints
    files: {
        /**
         * List file tree
         * @param {string} worktreePath - Optional worktree path
         * @returns {Promise<{files: Array}>}
         */
        async list(worktreePath = '') {
            const url = worktreePath
                ? `/api/files?worktree=${encodeURIComponent(worktreePath)}`
                : '/api/files';
            const response = await api.get(url);
            if (response.ok) {
                return await response.json();
            }
            throw await api.parseJson(response);
        },

        /**
         * Get file content
         * @param {string} path - File path
         * @param {string} worktreePath - Optional worktree path
         * @returns {Promise<{content: string}>}
         */
        async get(path, worktreePath = '') {
            let url = `/api/files/${encodeURIComponent(path)}`;
            if (worktreePath) {
                url += `?worktree=${encodeURIComponent(worktreePath)}`;
            }
            const response = await api.get(url);
            if (response.ok) {
                return await response.json();
            }
            throw await api.parseJson(response);
        }
    },

    // Auth API endpoints
    auth: {
        /**
         * Logout
         * @returns {Promise<void>}
         */
        async logout() {
            const response = await api.post('/api/auth/logout');
            if (response.ok) {
                window.location.href = '/login';
                return;
            }
            throw new Error('Logout failed');
        }
    }
};
