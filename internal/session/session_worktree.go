package session

// AddWorktreeSession adds a worktree session ID to this session
func (s *Session) AddWorktreeSession(sessionID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.WorktreeSessions = append(s.WorktreeSessions, sessionID)
}

// RemoveWorktreeSession removes a worktree session ID from this session
func (s *Session) RemoveWorktreeSession(sessionID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, id := range s.WorktreeSessions {
		if id == sessionID {
			s.WorktreeSessions = append(s.WorktreeSessions[:i], s.WorktreeSessions[i+1:]...)
			break
		}
	}
}

// GetWorktreeSessions returns the list of worktree session IDs
func (s *Session) GetWorktreeSessions() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]string, len(s.WorktreeSessions))
	copy(result, s.WorktreeSessions)
	return result
}

// SetWorktreeInfo sets the worktree information for this session
func (s *Session) SetWorktreeInfo(parentRepoPath, parentSessionID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.IsWorktree = true
	s.ParentRepoPath = parentRepoPath
	s.ParentSessionID = parentSessionID
}
