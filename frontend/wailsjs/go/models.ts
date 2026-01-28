export namespace git {
	
	export class FileChange {
	    path: string;
	    status: string;
	    staged: boolean;
	    added: number;
	    removed: number;
	    original?: string;
	    modified?: string;
	
	    static createFrom(source: any = {}) {
	        return new FileChange(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.status = source["status"];
	        this.staged = source["staged"];
	        this.added = source["added"];
	        this.removed = source["removed"];
	        this.original = source["original"];
	        this.modified = source["modified"];
	    }
	}

}

export namespace history {
	
	export class HistoryChunk {
	    data: string;
	    startIndex: number;
	    endIndex: number;
	    fileSize: number;
	    hasMore: boolean;
	
	    static createFrom(source: any = {}) {
	        return new HistoryChunk(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = source["data"];
	        this.startIndex = source["startIndex"];
	        this.endIndex = source["endIndex"];
	        this.fileSize = source["fileSize"];
	        this.hasMore = source["hasMore"];
	    }
	}
	export class HistoryInfo {
	    filename: string;
	    sessionId: string;
	    sessionName: string;
	    // Go type: time
	    startedAt: any;
	    // Go type: time
	    endedAt: any;
	    workDir: string;
	    entryCount: number;
	
	    static createFrom(source: any = {}) {
	        return new HistoryInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filename = source["filename"];
	        this.sessionId = source["sessionId"];
	        this.sessionName = source["sessionName"];
	        this.startedAt = this.convertValues(source["startedAt"], null);
	        this.endedAt = this.convertValues(source["endedAt"], null);
	        this.workDir = source["workDir"];
	        this.entryCount = source["entryCount"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TerminalHistoryEntry {
	    // Go type: time
	    timestamp: any;
	    terminalType: string;
	    data: string;
	
	    static createFrom(source: any = {}) {
	        return new TerminalHistoryEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.timestamp = this.convertValues(source["timestamp"], null);
	        this.terminalType = source["terminalType"];
	        this.data = source["data"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TerminalHistory {
	    sessionId: string;
	    sessionName: string;
	    // Go type: time
	    startedAt: any;
	    // Go type: time
	    endedAt?: any;
	    workDir: string;
	    entries: TerminalHistoryEntry[];
	
	    static createFrom(source: any = {}) {
	        return new TerminalHistory(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sessionId = source["sessionId"];
	        this.sessionName = source["sessionName"];
	        this.startedAt = this.convertValues(source["startedAt"], null);
	        this.endedAt = this.convertValues(source["endedAt"], null);
	        this.workDir = source["workDir"];
	        this.entries = this.convertValues(source["entries"], TerminalHistoryEntry);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace main {
	
	export class RecentFolder {
	    path: string;
	    name: string;
	    date: string;
	
	    static createFrom(source: any = {}) {
	        return new RecentFolder(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.date = source["date"];
	    }
	}
	export class ResourceUsage {
	    cpuPercent: number;
	    memoryMB: number;
	    memoryPercent: number;
	
	    static createFrom(source: any = {}) {
	        return new ResourceUsage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cpuPercent = source["cpuPercent"];
	        this.memoryMB = source["memoryMB"];
	        this.memoryPercent = source["memoryPercent"];
	    }
	}

}

export namespace server {
	
	export class Config {
	    ip: string;
	    port: number;
	    baseBranch: string;
	    sessionId: string;
	    password: string;
	    repoPath: string;
	    hasPassword: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ip = source["ip"];
	        this.port = source["port"];
	        this.baseBranch = source["baseBranch"];
	        this.sessionId = source["sessionId"];
	        this.password = source["password"];
	        this.repoPath = source["repoPath"];
	        this.hasPassword = source["hasPassword"];
	    }
	}
	export class ServerStatus {
	    running: boolean;
	    ip: string;
	    port: number;
	    url: string;
	    error?: string;
	    warning?: string;
	    sessionId?: string;
	
	    static createFrom(source: any = {}) {
	        return new ServerStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.running = source["running"];
	        this.ip = source["ip"];
	        this.port = source["port"];
	        this.url = source["url"];
	        this.error = source["error"];
	        this.warning = source["warning"];
	        this.sessionId = source["sessionId"];
	    }
	}

}

export namespace services {
	
	export class ActiveSessionInfo {
	    isActive: boolean;
	    sessionId: string;
	
	    static createFrom(source: any = {}) {
	        return new ActiveSessionInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.isActive = source["isActive"];
	        this.sessionId = source["sessionId"];
	    }
	}
	export class BatchFailedItem {
	    path: string;
	    error: string;
	
	    static createFrom(source: any = {}) {
	        return new BatchFailedItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.error = source["error"];
	    }
	}
	export class BatchOperationResult {
	    succeeded: string[];
	    failed: BatchFailedItem[];
	
	    static createFrom(source: any = {}) {
	        return new BatchOperationResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.succeeded = source["succeeded"];
	        this.failed = this.convertValues(source["failed"], BatchFailedItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class BranchInfo {
	    name: string;
	    isCurrent: boolean;
	    isRemote: boolean;
	
	    static createFrom(source: any = {}) {
	        return new BranchInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.isCurrent = source["isCurrent"];
	        this.isRemote = source["isRemote"];
	    }
	}
	export class GitSyncInfo {
	    hasRemote: boolean;
	    ahead: number;
	    behind: number;
	
	    static createFrom(source: any = {}) {
	        return new GitSyncInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hasRemote = source["hasRemote"];
	        this.ahead = source["ahead"];
	        this.behind = source["behind"];
	    }
	}
	export class PartialFileContent {
	    content: string;
	    isTruncated: boolean;
	
	    static createFrom(source: any = {}) {
	        return new PartialFileContent(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.content = source["content"];
	        this.isTruncated = source["isTruncated"];
	    }
	}
	export class PullResult {
	    success: boolean;
	    errorMsg?: string;
	
	    static createFrom(source: any = {}) {
	        return new PullResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.errorMsg = source["errorMsg"];
	    }
	}
	export class WorktreeInfo {
	    path: string;
	    branch: string;
	    isMain: boolean;
	    isDetached: boolean;
	    isOpened: boolean;
	
	    static createFrom(source: any = {}) {
	        return new WorktreeInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.branch = source["branch"];
	        this.isMain = source["isMain"];
	        this.isDetached = source["isDetached"];
	        this.isOpened = source["isOpened"];
	    }
	}

}

export namespace session {
	
	export class FileMetadata {
	    path: string;
	    size: number;
	    isDir: boolean;
	
	    static createFrom(source: any = {}) {
	        return new FileMetadata(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.size = source["size"];
	        this.isDir = source["isDir"];
	    }
	}
	export class FileNode {
	    name: string;
	    path: string;
	    isDir: boolean;
	    hasChildren?: boolean;
	    children?: FileNode[];
	
	    static createFrom(source: any = {}) {
	        return new FileNode(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.isDir = source["isDir"];
	        this.hasChildren = source["hasChildren"];
	        this.children = this.convertValues(source["children"], FileNode);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SessionInfo {
	    id: string;
	    name: string;
	    workDir: string;
	    createdAt: string;
	    isActive: boolean;
	    isGitRepo: boolean;
	    branch: string;
	    clientType: string;
	    isWorktree: boolean;
	    parentRepoPath: string;
	    parentSessionId: string;
	    worktreeSessions: string[];
	
	    static createFrom(source: any = {}) {
	        return new SessionInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.workDir = source["workDir"];
	        this.createdAt = source["createdAt"];
	        this.isActive = source["isActive"];
	        this.isGitRepo = source["isGitRepo"];
	        this.branch = source["branch"];
	        this.clientType = source["clientType"];
	        this.isWorktree = source["isWorktree"];
	        this.parentRepoPath = source["parentRepoPath"];
	        this.parentSessionId = source["parentSessionId"];
	        this.worktreeSessions = source["worktreeSessions"];
	    }
	}

}

