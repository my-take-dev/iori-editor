package services

// GitSyncInfo contains sync status information
type GitSyncInfo struct {
	HasRemote bool `json:"hasRemote"`
	Ahead     int  `json:"ahead"`
	Behind    int  `json:"behind"`
}

// BranchInfo represents branch information for frontend
type BranchInfo struct {
	Name      string `json:"name"`
	IsCurrent bool   `json:"isCurrent"`
	IsRemote  bool   `json:"isRemote"`
}

// PullResult represents the result of a pull/fetch operation
type PullResult struct {
	Success  bool   `json:"success"`
	ErrorMsg string `json:"errorMsg,omitempty"`
}

// BatchOperationResult represents the result of a batch git operation
type BatchOperationResult struct {
	Succeeded []string          `json:"succeeded"`
	Failed    []BatchFailedItem `json:"failed"`
}

// BatchFailedItem represents a failed item in a batch operation
type BatchFailedItem struct {
	Path  string `json:"path"`
	Error string `json:"error"`
}
