-- Migration 016: E-08 §6.7, §9 — invite_tokens (organisation-scoped)
-- Supersedes workspace_invitations. New invites are scoped to an organisation,
-- carry an org-level role, and can optionally grant workspace access too.
-- Also rewrites handle_new_user() to consume invite_tokens instead of workspace_invitations.
-- Idempotent.

-- ─── invite_tokens table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('org_admin', 'rig_manager', 'member')),
  capability_flags JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  accepted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_email ON invite_tokens(email);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_org_status
  ON invite_tokens(organization_id, status)
  WHERE status = 'pending';

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- Org admins can see pending/accepted invites for their org.
DROP POLICY IF EXISTS "invite_tokens_select_org_admin" ON invite_tokens;
CREATE POLICY "invite_tokens_select_org_admin" ON invite_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = invite_tokens.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'org_admin'
        AND m.status = 'active'
    )
  );

-- Platform roles read everything.
DROP POLICY IF EXISTS "invite_tokens_select_platform" ON invite_tokens;
CREATE POLICY "invite_tokens_select_platform" ON invite_tokens FOR SELECT
  USING (has_platform_role());

-- Org admins can create / revoke invites for their own org.
DROP POLICY IF EXISTS "invite_tokens_insert_org_admin" ON invite_tokens;
CREATE POLICY "invite_tokens_insert_org_admin" ON invite_tokens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = invite_tokens.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'org_admin'
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "invite_tokens_update_org_admin" ON invite_tokens;
CREATE POLICY "invite_tokens_update_org_admin" ON invite_tokens FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = invite_tokens.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'org_admin'
        AND m.status = 'active'
    )
  );

-- Platform admin can mutate any invite (support/debug).
DROP POLICY IF EXISTS "invite_tokens_update_platform_admin" ON invite_tokens;
CREATE POLICY "invite_tokens_update_platform_admin" ON invite_tokens FOR UPDATE
  USING (is_platform_admin());

-- ─── Token lookup for unauthenticated /register landing ─────────────────────
-- The /register?token=X page needs to validate an invite before the user has
-- authenticated. RLS would block that lookup. This SECURITY DEFINER function
-- bypasses RLS for a single-purpose read: given a token, return the invite
-- iff it is pending and not expired.
CREATE OR REPLACE FUNCTION lookup_invite_by_token(t TEXT)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  organization_name TEXT,
  email TEXT,
  role TEXT,
  expires_at TIMESTAMPTZ
) AS $$
  SELECT
    it.id,
    it.organization_id,
    o.name,
    it.email,
    it.role,
    it.expires_at
  FROM invite_tokens it
  JOIN organizations o ON o.id = it.organization_id
  WHERE it.token = t
    AND it.status = 'pending'
    AND it.expires_at > now()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION lookup_invite_by_token(TEXT) TO anon, authenticated;

-- ─── handle_new_user() rewrite ──────────────────────────────────────────────
-- New signup flow under E-08:
--   1. If raw_user_meta_data.invite_token is present and valid → consume it,
--      create profile, create membership with the invite's role.
--   2. Else → fall back to a 'member' membership on the BridgingX organisation
--      and create a personal workspace. This fallback supports dev seeding and
--      platform-admin bootstrap. Production-grade invite-only enforcement happens
--      at the application layer by gating /register to require ?token=<...>.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  invite_token_text TEXT;
  invite_record     RECORD;
  bridgingx_org_id  UUID;
  target_org_id     UUID;
  target_role       TEXT;
  new_workspace_id  UUID;
  display_name_val  TEXT;
BEGIN
  display_name_val := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- 1. Try to consume an invite token if one was supplied during sign-up.
  invite_token_text := NEW.raw_user_meta_data->>'invite_token';

  IF invite_token_text IS NOT NULL AND invite_token_text <> '' THEN
    SELECT id, organization_id, role
      INTO invite_record
      FROM invite_tokens
     WHERE token = invite_token_text
       AND status = 'pending'
       AND expires_at > now()
     LIMIT 1;

    IF FOUND THEN
      target_org_id := invite_record.organization_id;
      target_role   := invite_record.role;

      UPDATE invite_tokens
         SET status              = 'accepted',
             accepted_at         = now(),
             accepted_by_user_id = NEW.id
       WHERE id = invite_record.id;
    END IF;
  END IF;

  -- 2. Fallback: dev / bootstrap path — attach to the BridgingX org as 'member'.
  IF target_org_id IS NULL THEN
    SELECT id INTO bridgingx_org_id FROM organizations WHERE slug = 'bridgingx';
    target_org_id := bridgingx_org_id;
    target_role   := 'member';
  END IF;

  -- 3. Create a personal workspace for the user (workspace-level concept is
  --    independent of org membership; everyone gets one for their own work).
  INSERT INTO workspaces (name, owner_id)
  VALUES (display_name_val || '''s workspace', NEW.id)
  RETURNING id INTO new_workspace_id;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- 4. Create org-level membership (if target_org_id is still NULL here, the
  --    BridgingX seed never ran — fail loudly rather than silently orphan the user).
  IF target_org_id IS NULL THEN
    RAISE EXCEPTION 'handle_new_user: no target organisation resolved for user %. BridgingX seed migration 015 missing?', NEW.email;
  END IF;

  INSERT INTO memberships (user_id, organization_id, role, status)
  VALUES (NEW.id, target_org_id, target_role, 'active')
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  -- 5. Create the profile row (extension of auth.users).
  INSERT INTO profiles (id, email, display_name, workspace_id, platform_role)
  VALUES (NEW.id, NEW.email, display_name_val, new_workspace_id, 'none')
  ON CONFLICT (id) DO NOTHING;

  -- 6. Audit.
  INSERT INTO audit_log (
    acting_user_id,
    acting_user_platform_role,
    target_organization_id,
    action,
    resource_type,
    resource_id,
    payload
  )
  VALUES (
    NEW.id,
    'none',
    target_org_id,
    CASE WHEN invite_record.id IS NOT NULL THEN 'user.registered_via_invite' ELSE 'user.registered_without_invite' END,
    'user',
    NEW.id,
    jsonb_build_object(
      'email', NEW.email,
      'invite_consumed_id', invite_record.id,
      'target_role', target_role
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger itself is already attached from migration 001 / rewritten in 008.
-- The CREATE OR REPLACE FUNCTION above updates the body in place.

-- ─── Deprecation notice on workspace_invitations ────────────────────────────
COMMENT ON TABLE workspace_invitations IS
  'DEPRECATED in E-08 — use invite_tokens (org-scoped). Retained for data preservation. Dropped in Phase 3 cleanup.';
