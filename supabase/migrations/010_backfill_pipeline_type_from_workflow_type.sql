-- 010_backfill_pipeline_type_from_workflow_type.sql
--
-- Follow-up to 009. Migration 009 backfilled workflow_runs.pipeline_type
-- from workflows.template_id, but workspaces created before template_id
-- was reliably populated have template_id = NULL, leaving their runs
-- with pipeline_type = NULL (and rendering as "__UNKNOWN__" in the UI).
--
-- This migration infers a sensible pipeline_type from the workflow's
-- `type` column (populated by 009: contract / regulatory / knowhow /
-- custom) for any run still missing pipeline_type.
--
-- Idempotent: WHERE pipeline_type IS NULL means a second run is a no-op.
-- 'custom' workflows cannot be reliably inferred — those runs are left
-- NULL and render as "Uncategorised" via the UI fallback added in the
-- same release.

UPDATE workflow_runs wr
SET    pipeline_type = CASE w.type
           WHEN 'contract'   THEN 'contract-extraction-v1'
           WHEN 'regulatory' THEN 'ontology-v1'
           WHEN 'knowhow'    THEN 'ontology-v1'
           -- 'custom' and anything else: leave null
           ELSE NULL
       END
FROM   workflows w
WHERE  wr.workflow_id = w.id
  AND  wr.pipeline_type IS NULL
  AND  w.type IN ('contract', 'regulatory', 'knowhow');
