package services

import (
	"fmt"

	"iori-editor/internal/git"
	"iori-editor/internal/session"
)

// convertToBatchResult converts git.BatchResult to BatchOperationResult
func convertToBatchResult(result git.BatchResult) BatchOperationResult {
	batchResult := BatchOperationResult{
		Succeeded: result.Succeeded,
		Failed:    make([]BatchFailedItem, len(result.Failed)),
	}
	for i, f := range result.Failed {
		batchResult.Failed[i] = BatchFailedItem{Path: f.Path, Error: f.Error}
	}
	return batchResult
}

// logBatchResult logs the batch operation result and converts it to BatchOperationResult
func (s *GitService) logBatchResult(result git.BatchResult, successLevel, successAction, failAction string) BatchOperationResult {
	if len(result.Succeeded) > 0 {
		s.emitLog(successLevel, successAction, fmt.Sprintf("%d件のファイル", len(result.Succeeded)))
	}
	for _, failed := range result.Failed {
		s.emitLog("error", failAction, failed.Path+": "+failed.Error)
	}
	return convertToBatchResult(result)
}

// AcceptChanges stages multiple files at once (batch git add)
func (s *GitService) AcceptChanges(sessionID string, paths []string) (BatchOperationResult, error) {
	var batchResult BatchOperationResult
	err := s.withSession(sessionID, func(sess *session.Session) error {
		result, err := sess.StageFiles(paths)
		if err != nil {
			s.emitLog("error", "一括ステージング失敗", err.Error())
			return err
		}
		batchResult = s.logBatchResult(result, "info", "ステージング", "ステージング失敗")
		return nil
	})
	return batchResult, err
}

// UnstageChanges unstages multiple files at once (batch git restore --staged)
func (s *GitService) UnstageChanges(sessionID string, paths []string) (BatchOperationResult, error) {
	var batchResult BatchOperationResult
	err := s.withSession(sessionID, func(sess *session.Session) error {
		result, err := sess.UnstageFiles(paths)
		if err != nil {
			s.emitLog("error", "一括ステージ解除失敗", err.Error())
			return err
		}
		batchResult = s.logBatchResult(result, "info", "ステージ解除", "ステージ解除失敗")
		return nil
	})
	return batchResult, err
}

// RejectChanges restores multiple files to HEAD state at once (batch git restore)
func (s *GitService) RejectChanges(sessionID string, paths []string) (BatchOperationResult, error) {
	var batchResult BatchOperationResult
	err := s.withSession(sessionID, func(sess *session.Session) error {
		result, err := sess.RestoreFiles(paths)
		if err != nil {
			s.emitLog("error", "一括変更破棄失敗", err.Error())
			return err
		}
		batchResult = s.logBatchResult(result, "warning", "変更を破棄", "変更の破棄失敗")
		return nil
	})
	return batchResult, err
}
