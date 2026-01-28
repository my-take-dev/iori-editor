package validation

import "testing"

func TestIsValidBranchName(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		// Valid branch names
		{"simple name", "main", true},
		{"with hyphen", "feature-branch", true},
		{"with underscore", "feature_branch", true},
		{"with slash", "feature/new-feature", true},
		{"with dot", "v1.0.0", true},
		{"with numbers", "branch123", true},
		{"complex valid", "feature/JIRA-123_add-login", true},
		{"nested slashes", "team/member/feature", true},

		// Invalid - empty
		{"empty string", "", false},

		// Invalid - starts with problematic characters
		{"starts with dot", ".hidden", false},
		{"starts with hyphen", "-invalid", false},
		{"starts with slash", "/invalid", false},

		// Invalid - ends with problematic characters
		{"ends with slash", "invalid/", false},
		{"ends with dot", "invalid.", false},

		// Invalid - path traversal attempts
		{"double dot", "feature/../etc/passwd", false},
		{"double dot only", "..", false},
		{"starts with double dot", "../malicious", false},
		{"double dot middle", "feature/..hidden", false},

		// Invalid - consecutive slashes
		{"double slash", "feature//branch", false},

		// Invalid - lock file pattern
		{"ends with .lock", "branch.lock", false},
		{"nested .lock", "feature/branch.lock", false},

		// Invalid - special characters
		{"with space", "feature branch", false},
		{"with colon", "feature:branch", false},
		{"with asterisk", "feature*branch", false},
		{"with question mark", "feature?branch", false},
		{"with backslash", "feature\\branch", false},
		{"with tilde", "feature~branch", false},
		{"with caret", "feature^branch", false},
		{"with at sign", "feature@branch", false},
		{"with curly brace", "feature{branch}", false},

		// Edge cases
		{"single character", "a", true},
		{"single number", "1", true},
		{"single dot only", ".", false},
		{"single hyphen only", "-", false},
		{"single slash only", "/", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsValidBranchName(tt.input)
			if result != tt.expected {
				t.Errorf("IsValidBranchName(%q) = %v, expected %v", tt.input, result, tt.expected)
			}
		})
	}
}

func TestBranchNameRegex(t *testing.T) {
	// Test that the regex correctly matches allowed characters
	validPatterns := []string{
		"abc",
		"ABC",
		"123",
		"a.b",
		"a_b",
		"a-b",
		"a/b",
		"feature/JIRA-123_add-login.v2",
	}

	for _, pattern := range validPatterns {
		if !BranchNameRegex.MatchString(pattern) {
			t.Errorf("BranchNameRegex should match %q", pattern)
		}
	}

	invalidPatterns := []string{
		"a b",  // space
		"a:b",  // colon
		"a*b",  // asterisk
		"a?b",  // question mark
		"a\\b", // backslash
		"a~b",  // tilde
		"a^b",  // caret
		"a@b",  // at sign
		"a{b}", // curly braces
		"a[b]", // square brackets
		"a!b",  // exclamation
		"a#b",  // hash
		"a$b",  // dollar
		"a%b",  // percent
		"a&b",  // ampersand
		"a'b",  // single quote
		"a\"b", // double quote
		"a(b)", // parentheses
		"a+b",  // plus
		"a=b",  // equals
		"a;b",  // semicolon
		"a,b",  // comma
		"a<b>", // angle brackets
		"a|b",  // pipe
	}

	for _, pattern := range invalidPatterns {
		if BranchNameRegex.MatchString(pattern) {
			t.Errorf("BranchNameRegex should NOT match %q", pattern)
		}
	}
}

// TestPathTraversalPrevention specifically tests path traversal attack vectors
func TestPathTraversalPrevention(t *testing.T) {
	attackVectors := []string{
		"..",
		"../",
		"..\\",
		"../etc/passwd",
		"..\\windows\\system32",
		"foo/../bar",
		"foo/../../bar",
		"foo\\..\\bar",
		"....//",
		"..%2f",
		"..%5c",
		"%2e%2e/",
		"%2e%2e%2f",
		"..%252f",
		"..;/",
		"..%00/",
		"..%0d/",
		"..%0a/",
	}

	for _, vector := range attackVectors {
		if IsValidBranchName(vector) {
			t.Errorf("IsValidBranchName should reject path traversal attempt: %q", vector)
		}
	}
}

// TestSpecialCharacterInjection tests injection attack prevention
func TestSpecialCharacterInjection(t *testing.T) {
	injectionVectors := []string{
		"branch; rm -rf /",
		"branch && cat /etc/passwd",
		"branch | ls",
		"branch`whoami`",
		"$(whoami)",
		"branch\nmalicious",
		"branch\rmalicious",
		"branch\x00malicious",
	}

	for _, vector := range injectionVectors {
		if IsValidBranchName(vector) {
			t.Errorf("IsValidBranchName should reject injection attempt: %q", vector)
		}
	}
}
