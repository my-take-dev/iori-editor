package git

import "fmt"

// Push pushes commits to remote
// Uses system git command to leverage Git Credential Manager
func (r *Repository) Push() error {
	_, err := r.runGitCommand("push")
	if err != nil {
		return err
	}
	return nil
}

// PushWithUpstream pushes and sets upstream for current branch
func (r *Repository) PushWithUpstream() error {
	branch, err := r.GetCurrentBranch()
	if err != nil {
		return fmt.Errorf("failed to get current branch: %w", err)
	}

	// Validate branch name to prevent argument injection
	if err := ValidateBranchName(branch); err != nil {
		return fmt.Errorf("invalid branch name: %w", err)
	}

	_, err = r.runGitCommand("push", "-u", "origin", branch)
	if err != nil {
		return err
	}
	return nil
}

// Pull pulls changes from remote
func (r *Repository) Pull() error {
	_, err := r.runGitCommand("pull")
	if err != nil {
		return err
	}
	return nil
}

// Fetch fetches changes from remote
func (r *Repository) Fetch() error {
	_, err := r.runGitCommand("fetch", "--all")
	if err != nil {
		return err
	}
	return nil
}

// PullBranch updates a specific branch to its latest state from remote
// For local branches: checkout -> pull -> return to original branch
// For remote branches: just fetch (remote refs are updated)
func (r *Repository) PullBranch(branchName string, isRemote bool) error {
	if err := ValidateBranchName(branchName); err != nil {
		return fmt.Errorf("invalid branch name: %w", err)
	}

	// For remote branches, just fetch to update refs
	if isRemote {
		_, err := r.runGitCommand("fetch", "--all")
		return err
	}

	// For local branches: checkout -> pull -> return to original
	// Save current branch
	currentBranch, err := r.GetCurrentBranch()
	if err != nil {
		return fmt.Errorf("failed to get current branch: %w", err)
	}

	// If already on the target branch, just pull
	if currentBranch == branchName {
		_, err := r.runGitCommand("pull")
		return err
	}

	// Checkout to target branch
	_, err = r.runGitCommand("checkout", branchName, "--")
	if err != nil {
		return fmt.Errorf("failed to checkout branch %s: %w", branchName, err)
	}

	// Pull the branch
	pullErr := func() error {
		_, err := r.runGitCommand("pull")
		return err
	}()

	// Always return to original branch, even if pull failed
	_, checkoutErr := r.runGitCommand("checkout", currentBranch, "--")
	if checkoutErr != nil {
		// If we can't return to original branch, this is a serious error
		if pullErr != nil {
			return fmt.Errorf("pull failed: %v, and failed to return to original branch: %w", pullErr, checkoutErr)
		}
		return fmt.Errorf("failed to return to original branch %s: %w", currentBranch, checkoutErr)
	}

	return pullErr
}

// GetRemoteURL returns the URL of the origin remote
func (r *Repository) GetRemoteURL() (string, error) {
	output, err := r.runGitCommand("remote", "get-url", "origin")
	if err != nil {
		return "", err
	}
	return output, nil
}

// HasRemote checks if the repository has a remote configured
func (r *Repository) HasRemote() bool {
	_, err := r.runGitCommand("remote", "get-url", "origin")
	return err == nil
}
