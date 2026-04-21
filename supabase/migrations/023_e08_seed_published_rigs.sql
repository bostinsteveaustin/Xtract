-- Migration 023: E-08 §12.2, §13.1 — seed four draft Published rigs
--
-- Per §13.1 (recommended) all four initial rigs ship at the Published tier from
-- the outset, with BridgingX holding IP. They start in state 'draft' — not
-- yet bindable by workspaces — and are promoted to 'experimental' by the
-- platform-admin surface once the first real run completes.
--
-- For each rig we also seed a 0.1.0 draft rig_version row so the admin surface
-- has something to display. Composition fields are intentionally empty — real
-- composition is filled during authoring in /admin/rigs/[slug] (Phase 2 app
-- code) and, for Contract Intelligence, after E-02 has fully landed
-- (output_contract references the iCML relationship schema).
--
-- created_by_user_id is NULL here because there is no authenticated session
-- during a migration; the /admin UI surfaces this as "seeded" rather than
-- attributing to a person.
--
-- Idempotent: ON CONFLICT on the partial unique index for Published slugs.

-- ─── Seed rigs ──────────────────────────────────────────────────────────────
INSERT INTO rigs (tier, slug, name, category, current_state, current_version)
VALUES
  ('published', 'contract-intelligence',
   'Contract Intelligence Rig',
   'contract_intelligence', 'draft', '0.1.0'),
  ('published', 'controls-extraction',
   'Controls Extraction Rig',
   'controls_extraction', 'draft', '0.1.0'),
  ('published', 'ontology-building',
   'Ontology Building Rig',
   'ontology_building', 'draft', '0.1.0'),
  ('published', 'qa-review',
   'QA and Review Rig',
   'qa_review', 'draft', '0.1.0')
ON CONFLICT DO NOTHING;

-- ─── Seed an initial 0.1.0 draft version per rig ────────────────────────────
-- Each Rig needs at least one rig_versions row so the admin detail page has
-- something to show. pipeline_pattern is set to an intentionally conservative
-- default — 'single_pass' for the Ontology Building Rig (simplest) and
-- 'verified' for the others (two-stage with verification). These are draft
-- values and can be edited before release.
INSERT INTO rig_versions (
  rig_id, version, state, pipeline_pattern,
  methodology_statement
)
SELECT
  r.id,
  '0.1.0',
  'draft',
  CASE r.slug
    WHEN 'ontology-building' THEN 'single_pass'
    ELSE 'verified'
  END,
  CASE r.slug
    WHEN 'contract-intelligence' THEN 'Extracts typed contract objects (parties, obligations, financial terms, etc.) into the iCML output contract. Composition and output_contract are authored in /admin/rigs/contract-intelligence.'
    WHEN 'controls-extraction' THEN 'Extracts regulatory controls from framework documents and maps them to the organisation''s control library. Initial target: Pay.UK regulatory corpus.'
    WHEN 'ontology-building' THEN 'Constructs a typed ontology of domain concepts, relationships, and properties from a corpus. First validated against the C-Track highways domain.'
    WHEN 'qa-review' THEN 'Runs validation and quality checks against another Rig''s output; typically used as a second-stage Rig on a completed Run.'
  END
FROM rigs r
WHERE r.tier = 'published'
  AND r.slug IN ('contract-intelligence', 'controls-extraction', 'ontology-building', 'qa-review')
ON CONFLICT (rig_id, version) DO NOTHING;

-- ─── Audit seed event (platform-scope — target_organization_id is NULL) ─────
INSERT INTO audit_log (
  acting_user_id,
  acting_user_platform_role,
  target_organization_id,
  admin_context_flag,
  action,
  resource_type,
  payload
)
SELECT
  NULL,
  'platform_admin',
  NULL,
  false,
  'rig.seeded',
  'rig',
  jsonb_build_object(
    'migration', '023_e08_seed_published_rigs',
    'rig_slug', r.slug,
    'tier', r.tier,
    'category', r.category
  )
FROM rigs r
WHERE r.tier = 'published'
  AND r.slug IN ('contract-intelligence', 'controls-extraction', 'ontology-building', 'qa-review');
