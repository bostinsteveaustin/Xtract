-- Pipeline run audit trail with per-step token tracking
-- Extends the existing workflow_runs table with structured step logs

-- Add per-step token tracking columns to workflow_runs
ALTER TABLE workflow_runs
  ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS step_token_log JSONB DEFAULT '[]'::JSONB;

-- step_token_log format:
-- [
--   {
--     "stepId": "ctx-production",
--     "stepLabel": "CTX Production",
--     "promptTokens": 1234,
--     "completionTokens": 567,
--     "totalTokens": 1801,
--     "startedAt": "2026-03-17T10:00:00Z",
--     "completedAt": "2026-03-17T10:00:15Z"
--   },
--   ...
-- ]

-- Index for querying run history per workflow
CREATE INDEX IF NOT EXISTS idx_workflow_runs_started_at
  ON workflow_runs(workflow_id, started_at DESC);
