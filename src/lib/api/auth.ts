/**
 * Shared auth helpers for API routes.
 *
 * E-08 usage (new):
 *   const auth = await requireAuth();
 *   if (auth.error) return auth.error;
 *   const { user, activeOrgId, platformRole, membership } = auth;
 *
 * Legacy usage (still supported, workspaceId is the caller's personal workspace):
 *   const { user, workspaceId } = auth;
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const ACTIVE_ORG_COOKIE = "xtract-active-org";
export const ADMIN_CONTEXT_COOKIE = "xtract-admin-context";

export type PlatformRole = "none" | "platform_support" | "platform_admin";
export type OrgRole = "org_admin" | "rig_manager" | "member";

export interface MembershipContext {
  organizationId: string;
  role: OrgRole;
  status: "active" | "invited" | "suspended";
}

export interface AdminContextState {
  targetOrganizationId: string;
  enteredAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
}

interface AuthSuccess {
  user: { id: string; email?: string };
  /** Legacy — the user's personal workspace id. Use activeOrgId for tenancy. */
  workspaceId: string;
  /** Active organisation for this request. Null means ambiguous → caller must pick. */
  activeOrgId: string | null;
  /** Platform-tier role (BridgingX level). 'none' for ordinary users. */
  platformRole: PlatformRole;
  /** User's membership in activeOrgId, if one exists. */
  membership: MembershipContext | null;
  /** Present when the user has entered admin-context for a non-member org. */
  adminContext: AdminContextState | null;
  error?: undefined;
}

interface AuthFailure {
  user?: undefined;
  workspaceId?: undefined;
  activeOrgId?: undefined;
  platformRole?: undefined;
  membership?: undefined;
  adminContext?: undefined;
  error: NextResponse;
}

export type AuthResult = AuthSuccess | AuthFailure;

/** Env flag that opens the platform-admin cross-tenant bypass. Dev only. */
function platformAdminBypassEnabled(): boolean {
  return process.env.XTRACT_PLATFORM_ADMIN_BYPASS === "true";
}

/**
 * Verify the caller is authenticated and resolve their org context.
 *
 * Org resolution:
 *   1. Read `xtract-active-org` cookie.
 *   2. If the user has a membership for that org → use it.
 *   3. If platform_role != 'none' AND admin-context cookie targets that org → use it.
 *   4. If platform_role != 'none' AND XTRACT_PLATFORM_ADMIN_BYPASS=true → use it (dev escape hatch).
 *   5. Otherwise fall back to the user's single active membership (if unambiguous).
 *   6. Otherwise activeOrgId is null — caller must prompt for org selection.
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // Profile — includes legacy workspace_id and E-08 platform_role.
  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id, platform_role, mfa_required")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return {
      error: NextResponse.json({ error: "No workspace" }, { status: 404 }),
    };
  }

  const platformRole: PlatformRole =
    (profile.platform_role as PlatformRole) ?? "none";

  // Admin-context cookie (JSON). Signed decoding isn't needed — this is a hint
  // only; RLS is the real enforcement via get_my_current_org_id().
  const cookieStore = await cookies();
  const adminContextRaw = cookieStore.get(ADMIN_CONTEXT_COOKIE)?.value;
  let adminContext: AdminContextState | null = null;
  if (adminContextRaw && platformRole !== "none") {
    try {
      const parsed = JSON.parse(adminContextRaw) as AdminContextState;
      if (new Date(parsed.expiresAt) > new Date()) {
        adminContext = parsed;
      }
    } catch {
      // malformed cookie — ignore
    }
  }

  const activeOrgCookie = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;

  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from("memberships")
    .select("organization_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active");

  const memberOrgIds = new Set(
    (memberships ?? []).map((m: { organization_id: string }) => m.organization_id)
  );

  let activeOrgId: string | null = null;

  // 1–2. Cookie points at an org the user is a member of.
  if (activeOrgCookie && memberOrgIds.has(activeOrgCookie)) {
    activeOrgId = activeOrgCookie;
  }

  // 3. Admin context for a non-member org, still in window.
  if (
    !activeOrgId &&
    adminContext &&
    platformRole !== "none" &&
    adminContext.targetOrganizationId === activeOrgCookie
  ) {
    activeOrgId = adminContext.targetOrganizationId;
  }

  // 4. Env-gated platform-admin bypass (dev only).
  if (
    !activeOrgId &&
    activeOrgCookie &&
    platformRole !== "none" &&
    platformAdminBypassEnabled()
  ) {
    activeOrgId = activeOrgCookie;
  }

  // 5. Single-membership fallback.
  if (!activeOrgId && memberships?.length === 1) {
    activeOrgId = memberships[0].organization_id;
  }

  const membership = activeOrgId
    ? (memberships ?? []).find(
        (m: { organization_id: string }) => m.organization_id === activeOrgId
      ) ?? null
    : null;

  return {
    user,
    workspaceId: profile.workspace_id,
    activeOrgId,
    platformRole,
    membership: membership
      ? {
          organizationId: membership.organization_id,
          role: membership.role as OrgRole,
          status: membership.status as MembershipContext["status"],
        }
      : null,
    adminContext,
  };
}

/**
 * Convenience: require that the caller has any platform role (admin OR support).
 * Returns an error response on mismatch.
 */
export async function requirePlatformRole(): Promise<AuthResult> {
  const auth = await requireAuth();
  if (auth.error) return auth;
  if (auth.platformRole === "none") {
    return {
      error: NextResponse.json(
        { error: "Platform role required" },
        { status: 403 }
      ),
    };
  }
  return auth;
}

/**
 * Convenience: require platform_admin specifically (write access across tenants).
 */
export async function requirePlatformAdmin(): Promise<AuthResult> {
  const auth = await requireAuth();
  if (auth.error) return auth;
  if (auth.platformRole !== "platform_admin") {
    return {
      error: NextResponse.json(
        { error: "Platform admin required" },
        { status: 403 }
      ),
    };
  }
  return auth;
}

/**
 * Convenience: require org_admin in the active org (or platform_admin in any context).
 */
export async function requireOrgAdmin(): Promise<AuthResult> {
  const auth = await requireAuth();
  if (auth.error) return auth;
  const isOrgAdmin = auth.membership?.role === "org_admin";
  const isPlatformAdmin = auth.platformRole === "platform_admin";
  if (!isOrgAdmin && !isPlatformAdmin) {
    return {
      error: NextResponse.json(
        { error: "Org admin required" },
        { status: 403 }
      ),
    };
  }
  return auth;
}

/**
 * Confirm that a workflow belongs to the caller's workspace.
 * Uses the admin client (bypasses RLS) so the check works regardless
 * of the caller's Supabase role.
 */
export async function verifyWorkflowOwnership(
  workflowId: string,
  workspaceId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("workflows")
    .select("id")
    .eq("id", workflowId)
    .eq("workspace_id", workspaceId)
    .single();

  return !!data;
}
