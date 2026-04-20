-- Migration 015: E-08 consolidation seed — single BridgingX organisation
-- Per Stephen's direction (2026-04-20), existing workspaces consolidate into
-- ONE organisation rather than each becoming its own org. This matches reality:
-- current workspaces are internal/dev workspaces of the BridgingX team, not
-- separate tenants.
--
-- Seed:
--   1. Insert the BridgingX organisation (idempotent by slug).
--   2. For every distinct user referenced in workspace_members, insert a
--      membership row on BridgingX. Role mapping from workspace_members.role:
--        owner  → org_admin
--        admin  → org_admin (E-08 has no 'org_editor' tier; tighten later)
--        member → member
--   3. For every user with a profile but no workspace_members row (edge case —
--      seeded admins, pre-008 users), insert a member-role membership.
--
-- Future onboarding (Pay.UK, GHD, etc.) creates new organisations via the
-- platform admin UI or API; it does NOT consolidate into BridgingX.

-- ─── 1. BridgingX organisation ──────────────────────────────────────────────
INSERT INTO organizations (name, slug, status)
VALUES ('BridgingX', 'bridgingx', 'active')
ON CONFLICT (slug) DO NOTHING;

-- ─── 2. Memberships from workspace_members ─────────────────────────────────
-- One org-level membership per user. A user with mixed workspace roles
-- (e.g. owner of one workspace + member of another) collapses to the highest
-- role via the DISTINCT ON ... ORDER BY.
WITH bridgingx AS (
  SELECT id FROM organizations WHERE slug = 'bridgingx'
),
user_roles AS (
  SELECT DISTINCT ON (wm.user_id)
    wm.user_id,
    CASE
      WHEN wm.role IN ('owner', 'admin') THEN 'org_admin'
      ELSE 'member'
    END AS org_role
  FROM workspace_members wm
  ORDER BY wm.user_id,
    CASE wm.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'member' THEN 3 END
)
INSERT INTO memberships (user_id, organization_id, role, status)
SELECT ur.user_id, b.id, ur.org_role, 'active'
FROM user_roles ur, bridgingx b
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- ─── 3. Backfill users with profiles but no workspace_members row ───────────
-- Edge case: users seeded before migration 008 (which created workspace_members)
-- or created without an invitation. Give them a baseline 'member' membership so
-- they have an active-org to land in under the new model.
WITH bridgingx AS (
  SELECT id FROM organizations WHERE slug = 'bridgingx'
)
INSERT INTO memberships (user_id, organization_id, role, status)
SELECT p.id, b.id, 'member', 'active'
FROM profiles p, bridgingx b
WHERE NOT EXISTS (
  SELECT 1 FROM memberships m
  WHERE m.user_id = p.id
)
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- ─── 4. Audit seed event ────────────────────────────────────────────────────
-- Record the consolidation as a platform action for traceability.
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
  NULL,                  -- system action, no acting user
  'platform_admin',
  o.id,
  false,
  'organization.seeded',
  'organization',
  jsonb_build_object(
    'migration', '015_e08_seed_bridgingx_org',
    'memberships_created', (SELECT count(*) FROM memberships WHERE organization_id = o.id)
  )
FROM organizations o
WHERE o.slug = 'bridgingx';
