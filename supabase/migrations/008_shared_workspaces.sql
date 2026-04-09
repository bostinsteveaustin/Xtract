-- Shared workspaces: multi-user support with invitation flow
-- Adds workspace_members junction table and workspace_invitations table

-- ─── Workspace Members ─────────────────────────────────────────────────────
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- ─── Workspace Invitations ─────────────────────────────────────────────────
CREATE TABLE workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspace_invitations_token ON workspace_invitations(token);
CREATE INDEX idx_workspace_invitations_email ON workspace_invitations(email);

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Members can see other members in their workspace
CREATE POLICY "workspace_members_select" ON workspace_members FOR SELECT
  USING (workspace_id = get_my_workspace_id());

CREATE POLICY "workspace_members_insert" ON workspace_members FOR INSERT
  WITH CHECK (workspace_id = get_my_workspace_id());

CREATE POLICY "workspace_members_delete" ON workspace_members FOR DELETE
  USING (workspace_id = get_my_workspace_id());

-- Invitations: workspace members can see invites for their workspace
CREATE POLICY "workspace_invitations_select" ON workspace_invitations FOR SELECT
  USING (workspace_id = get_my_workspace_id());

CREATE POLICY "workspace_invitations_insert" ON workspace_invitations FOR INSERT
  WITH CHECK (workspace_id = get_my_workspace_id());

CREATE POLICY "workspace_invitations_update" ON workspace_invitations FOR UPDATE
  USING (workspace_id = get_my_workspace_id());

-- ─── Update workspace access policy ────────────────────────────────────────
-- Replace owner-only with membership-based access
DROP POLICY "Users can view own workspace" ON workspaces;

CREATE POLICY "Users can view workspace via membership"
  ON workspaces FOR SELECT
  USING (
    id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid())
    OR owner_id = auth.uid()
  );

-- ─── Allow workspace members to see each other's profiles ──────────────────
DROP POLICY "Users can view own profile" ON profiles;

CREATE POLICY "Users can view workspace member profiles"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR workspace_id = get_my_workspace_id()
  );

-- ─── Backfill: insert existing workspace owners as members ─────────────────
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT w.id, w.owner_id, 'owner'
FROM workspaces w
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- ─── Update the signup trigger to check for pending invitations ────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  invite_record RECORD;
  new_workspace_id UUID;
BEGIN
  -- Check for a pending invitation for this email
  SELECT wi.workspace_id, wi.role, wi.id AS invitation_id
  INTO invite_record
  FROM workspace_invitations wi
  WHERE wi.email = NEW.email
    AND wi.status = 'pending'
    AND wi.expires_at > now()
  ORDER BY wi.created_at DESC
  LIMIT 1;

  IF invite_record IS NOT NULL THEN
    -- Join the invited workspace
    new_workspace_id := invite_record.workspace_id;

    -- Mark invitation as accepted
    UPDATE workspace_invitations
    SET status = 'accepted'
    WHERE id = invite_record.invitation_id;

    -- Add as workspace member
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, NEW.id, invite_record.role)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  ELSE
    -- No invitation — create a new personal workspace
    INSERT INTO workspaces (name, owner_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s workspace',
      NEW.id
    )
    RETURNING id INTO new_workspace_id;

    -- Add as owner
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, NEW.id, 'owner');
  END IF;

  -- Create profile pointing to the workspace
  INSERT INTO profiles (id, email, display_name, workspace_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    new_workspace_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
