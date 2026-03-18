-- Persist CTX file content on pipeline run records
-- Allows retrieval of the generated .ctx file from run history

ALTER TABLE workflow_runs
  ADD COLUMN IF NOT EXISTS ctx_content TEXT;
