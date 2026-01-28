package services

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"iori-editor/internal/git"
	"iori-editor/internal/session"
	"iori-editor/internal/util"
)

// CreateWorktreeSession creates a new worktree session from a parent session
func (s *WorktreeService) CreateWorktreeSession(parentSessionID string, baseBranch string, customName string) (session.SessionInfo, error) {
	var cleanup cleanupStack
	defer cleanup.rollback()

	// Step 1: Get parent session and validate git repository
	parentSess, parentRepo, err := s.getParentSessionWithRepo(parentSessionID)
	if err != nil {
		return session.SessionInfo{}, err
	}

	// Step 2: Fetch from remote (continue on failure)
	s.fetchRemoteQuietly(parentRepo)

	// Step 3: Generate branch name and prepare path
	branchName := s.generateBranchName(baseBranch, customName)
	worktreePath, err := s.prepareWorktreePath(parentSess, branchName)
	if err != nil {
		return session.SessionInfo{}, err
	}

	// Step 4: Create git worktree
	if err := s.performGitWorktreeAdd(parentRepo, worktreePath, branchName, baseBranch); err != nil {
		return session.SessionInfo{}, err
	}
	cleanup.push(func() {
		parentRepo.RemoveWorktree(worktreePath)
		os.RemoveAll(worktreePath)
	})

	// Step 5: Create session and setup parent-child relationship
	wtSess, err := s.createWorktreeSession(branchName, worktreePath, parentRepo, parentSess)
	if err != nil {
		return session.SessionInfo{}, err
	}
	cleanup.push(func() {
		parentSess.RemoveWorktreeSession(wtSess.ID)
		s.sessionManager.DeleteSession(wtSess.ID)
	})

	// Step 6: Setup file watcher and event handlers
	s.setupSessionResources(wtSess)

	// Step 7: Initialize terminals and history
	if err := s.initializeSessionTerminals(wtSess); err != nil {
		return session.SessionInfo{}, err
	}

	// Success - skip cleanup
	cleanup.clear()
	s.emitLog("success", "Worktree作成完了", branchName)
	return wtSess.Info(), nil
}

// AttachExistingWorktree attaches an existing worktree as a new session
func (s *WorktreeService) AttachExistingWorktree(parentSessionID string, worktreePath string) (session.SessionInfo, error) {
	var cleanup cleanupStack
	defer cleanup.rollback()

	// Step 0: Check if worktree is already opened by another client
	existingSession := s.sessionManager.FindSessionByWorkDir(worktreePath)
	if existingSession != nil {
		clientTypeMsg := "別のクライアント"
		if existingSession.ClientType == session.ClientTypeBrowser {
			clientTypeMsg = "ブラウザ"
		} else if existingSession.ClientType == session.ClientTypeDesktop {
			clientTypeMsg = "アプリケーション"
		}
		return session.SessionInfo{}, &WorktreeAlreadyOpenedError{ClientType: clientTypeMsg}
	}

	// Step 1: Get parent session and validate git repository
	parentSess, parentRepo, err := s.getParentSessionWithRepo(parentSessionID)
	if err != nil {
		return session.SessionInfo{}, err
	}

	// Step 2: Open worktree repository and get branch name
	wtRepo, err := git.Open(worktreePath)
	if err != nil {
		return session.SessionInfo{}, fmt.Errorf("failed to open worktree: %w", err)
	}

	branchName, err := wtRepo.GetCurrentBranch()
	if err != nil {
		branchName = "unknown"
	}

	// Step 3: Create session
	wtSess, err := s.sessionManager.CreateSession(branchName, worktreePath)
	if err != nil {
		return session.SessionInfo{}, fmt.Errorf("failed to create worktree session: %w", err)
	}
	cleanup.push(func() {
		s.sessionManager.DeleteSession(wtSess.ID)
	})

	// Step 4: Setup worktree info and parent-child relationship
	wtSess.SetWorktreeInfo(parentRepo.GetPath(), parentSessionID)
	parentSess.AddWorktreeSession(wtSess.ID)
	cleanup.push(func() {
		parentSess.RemoveWorktreeSession(wtSess.ID)
	})

	// Step 5: Setup file watcher and event handlers
	s.setupSessionResources(wtSess)

	// Step 6: Initialize terminals and history
	if err := s.initializeSessionTerminals(wtSess); err != nil {
		return session.SessionInfo{}, err
	}

	// Success - skip cleanup
	cleanup.clear()
	s.emitLog("success", "Worktree接続完了", branchName)
	return wtSess.Info(), nil
}

// getParentSessionWithRepo retrieves parent session and validates it has a git repository
func (s *WorktreeService) getParentSessionWithRepo(parentSessionID string) (*session.Session, *git.Repository, error) {
	parentSess, err := s.sessionManager.GetSession(parentSessionID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get parent session: %w", err)
	}

	parentRepo := parentSess.GetGitRepo()
	if parentRepo == nil {
		return nil, nil, fmt.Errorf("parent session is not a git repository")
	}

	return parentSess, parentRepo, nil
}

// fetchRemoteQuietly fetches from remote without blocking on failure
func (s *WorktreeService) fetchRemoteQuietly(repo *git.Repository) {
	s.emitLog("info", "リモートから最新情報を取得中...", "")
	if err := repo.Fetch(); err != nil {
		s.emitLog("warning", "Fetch失敗（オフラインの可能性）", err.Error())
	}
}

// generateBranchName creates a unique branch name
func (s *WorktreeService) generateBranchName(baseBranch string, customName string) string {
	uniqueID := fmt.Sprintf("%d", time.Now().UnixNano())
	return fmt.Sprintf("%s-%s-%s", baseBranch, customName, uniqueID)
}

// prepareWorktreePath calculates worktree path and checks write permission
func (s *WorktreeService) prepareWorktreePath(parentSess *session.Session, branchName string) (string, error) {
	var repoPath string
	if parentSess.IsWorktree {
		repoPath = parentSess.ParentRepoPath
	} else {
		repoPath = parentSess.WorkDir
	}

	repoName := filepath.Base(repoPath)
	parentDir := filepath.Dir(repoPath)
	worktreesDir := filepath.Join(parentDir, repoName+".worktrees")
	worktreePath := filepath.Join(worktreesDir, branchName)

	if err := util.CheckWritePermission(worktreesDir); err != nil {
		s.emitLog("error", "Worktree作成失敗", err.Error())
		return "", err
	}

	return worktreePath, nil
}

// performGitWorktreeAdd executes git worktree add command
func (s *WorktreeService) performGitWorktreeAdd(repo *git.Repository, worktreePath string, branchName string, baseBranch string) error {
	s.emitLog("info", "Worktree作成中...", branchName)
	if err := repo.CreateWorktree(worktreePath, branchName, baseBranch); err != nil {
		os.RemoveAll(worktreePath)
		s.emitLog("error", "Worktree作成失敗", err.Error())
		return fmt.Errorf("failed to create worktree: %w", err)
	}
	return nil
}

// createWorktreeSession creates a session and sets up parent-child relationship
func (s *WorktreeService) createWorktreeSession(branchName string, worktreePath string, parentRepo *git.Repository, parentSess *session.Session) (*session.Session, error) {
	wtSess, err := s.sessionManager.CreateSession(branchName, worktreePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create worktree session: %w", err)
	}

	wtSess.SetWorktreeInfo(parentRepo.GetPath(), parentSess.ID)
	parentSess.AddWorktreeSession(wtSess.ID)

	return wtSess, nil
}

// setupSessionResources sets up file watcher and event handlers
func (s *WorktreeService) setupSessionResources(sess *session.Session) {
	s.setupFileEventHandler(sess)
	s.startFileWatcherAsync(sess)
}

// initializeSessionTerminals starts terminals and history for a session
func (s *WorktreeService) initializeSessionTerminals(sess *session.Session) error {
	if err := sess.StartTerminal(session.TerminalTypeAI); err != nil {
		return fmt.Errorf("failed to start AI terminal: %w", err)
	}
	if err := sess.StartTerminal(session.TerminalTypeUser); err != nil {
		return fmt.Errorf("failed to start User terminal: %w", err)
	}

	go s.terminalService.StreamTerminalOutput(sess.ID, session.TerminalTypeAI)
	go s.terminalService.StreamTerminalOutput(sess.ID, session.TerminalTypeUser)

	if s.historyManager != nil {
		s.historyManager.StartSession(sess.ID, sess.Name, sess.WorkDir)
	}

	return nil
}
