/**
 * E-08 §9.4 audit trail.
 *
 * Every security-relevant mutation calls writeAuditEvent(). The audit_log
 * table is append-only (UPDATE / DELETE grants revoked in migration 014),
 * so a successful write is permanent.
 *
 * The helper resolves acting user, platform role, admin-context flag, IP, and
 * user-agent from the current request context. Callers supply only the event
 * shape.
 *
 * Canonical action names live in auditActions below — extend that union when
 * a new event type is introduced so all call sites share the same vocabulary.
 */

import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACTIVE_ORG_COOKIE, ADMIN_CONTEXT_COOKIE } from "@/lib/api/auth";

/**
 * Canonical audit action names. Keep this list in sync with the Cortx-side
 * spec in E-08_cortx_side_changes.md §Item 4. Add new entries at the bottom
 * of the relevant group; don't rename existing entries.
 */
export const auditActions = {
  // Auth
  USER_LOGIN: "user.login",
  USER_LOGIN_FAILED: "user.login_failed",
  USER_LOGOUT: "user.logout",
  USER_PASSWORD_RESET_REQUESTED: "user.password_reset_requested",
  USER_PASSWORD_RESET_COMPLETED: "user.password_reset_completed",
  USER_MFA_ENROLLED: "user.mfa_enrolled",
  USER_MFA_VERIFIED: "user.mfa_verified",
  USER_MFA_BACKUP_USED: "user.mfa_backup_used",
  USER_REGISTERED_VIA_INVITE: "user.registered_via_invite",
  USER_REGISTERED_WITHOUT_INVITE: "user.registered_without_invite",

  // Organisations
  ORG_CREATED: "org.created",
  ORG_SETTINGS_UPDATED: "org.settings_updated",
  ORG_SUSPENDED: "org.suspended",
  ORG_ARCHIVED: "org.archived",

  // Memberships
  MEMBERSHIP_INVITED: "membership.invited",
  MEMBERSHIP_ACCEPTED: "membership.accepted",
  MEMBERSHIP_ROLE_CHANGED: "membership.role_changed",
  MEMBERSHIP_REVOKED: "membership.revoked",

  // Invite tokens
  INVITE_TOKEN_CREATED: "invite_token.created",
  INVITE_TOKEN_CONSUMED: "invite_token.consumed",
  INVITE_TOKEN_REVOKED: "invite_token.revoked",

  // Admin context
  ADMIN_CONTEXT_ENTERED: "admin.context_entered",
  ADMIN_CONTEXT_EXITED: "admin.context_exited",

  // Platform role
  PLATFORM_ROLE_ASSIGNED: "platform_role.assigned",
  PLATFORM_ROLE_REMOVED: "platform_role.removed",

  // Rigs (E-08 §4)
  RIG_CREATED: "rig.created",
  RIG_VERSION_CREATED: "rig_version.created",
  RIG_VERSION_RELEASED: "rig_version.released",             // draft → experimental
  RIG_VERSION_VALIDATED: "rig_version.validated",           // experimental → validated
  RIG_VERSION_DEPRECATED: "rig_version.deprecated",         // * → deprecated
  RIG_FORKED: "rig.forked",
  CALIBRATION_EVIDENCE_ATTACHED: "calibration_evidence.attached",
  RIG_ENTITLEMENT_GRANTED: "rig_entitlement.granted",
  RIG_ENTITLEMENT_REVOKED: "rig_entitlement.revoked",
} as const;

export type AuditAction =
  | (typeof auditActions)[keyof typeof auditActions]
  | (string & Record<never, never>); // allow future strings without compile errors

export interface AuditEvent {
  action: AuditAction;
  resourceType?: string;
  resourceId?: string | null;
  payload?: Record<string, unknown>;
  /** Defaults to the user's active org if not supplied. */
  targetOrganizationId?: string | null;
}

/**
 * Write one audit row. Resolves actor context from the current request.
 *
 * Never throws — audit writes are best-effort. A failure is logged to the
 * server console but does not cascade into the calling request. This is a
 * deliberate trade: failing a mutation because the audit write failed would
 * make the audit trail a denial-of-service surface.
 */
export async function writeAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // System actions without an authenticated user (e.g. webhooks) should
      // use writeSystemAuditEvent instead. Refuse silently.
      return;
    }

    // Actor context — platform role + admin-context flag.
    const { data: profile } = await admin
      .from("profiles")
      .select("platform_role")
      .eq("id", user.id)
      .single();
    const actingPlatformRole =
      (profile?.platform_role as string | undefined) ?? "none";

    const cookieStore = await cookies();
    const adminContextRaw = cookieStore.get(ADMIN_CONTEXT_COOKIE)?.value;
    let adminContextFlag = false;
    if (adminContextRaw && actingPlatformRole !== "none") {
      try {
        const parsed = JSON.parse(adminContextRaw) as { expiresAt: string };
        adminContextFlag = new Date(parsed.expiresAt) > new Date();
      } catch {
        // malformed cookie — treat as no admin context
      }
    }

    // Target organisation — explicit param, else fall back to cookie.
    const targetOrgId =
      event.targetOrganizationId ??
      cookieStore.get(ACTIVE_ORG_COOKIE)?.value ??
      null;

    // Request context — IP and UA from headers.
    const headerList = await headers();
    const ip = extractClientIp(headerList);
    const userAgent = headerList.get("user-agent");

    // Write via admin client so we're not subject to our own RLS during audit.
    const { error } = await admin.from("audit_log").insert({
      acting_user_id: user.id,
      acting_user_platform_role: actingPlatformRole,
      target_organization_id: targetOrgId,
      admin_context_flag: adminContextFlag,
      action: event.action,
      resource_type: event.resourceType ?? null,
      resource_id: event.resourceId ?? null,
      payload: (event.payload ?? null) as never,
      ip_address: ip,
      user_agent: userAgent,
    });

    if (error) {
      console.error("[audit] insert failed", {
        action: event.action,
        error: error.message,
      });
    }
  } catch (err) {
    console.error("[audit] unexpected failure", err);
  }
}

/**
 * System-action audit write — used by webhook handlers and background jobs
 * that don't have an authenticated user session. actingUserId is optional;
 * supply it when a specific user triggered the system action.
 */
export async function writeSystemAuditEvent(event: {
  action: AuditAction;
  actingUserId?: string | null;
  targetOrganizationId?: string | null;
  resourceType?: string;
  resourceId?: string | null;
  payload?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("audit_log").insert({
      acting_user_id: event.actingUserId ?? null,
      acting_user_platform_role: "none", // system actions are not platform-tier
      target_organization_id: event.targetOrganizationId ?? null,
      admin_context_flag: false,
      action: event.action,
      resource_type: event.resourceType ?? null,
      resource_id: event.resourceId ?? null,
      payload: (event.payload ?? null) as never,
      ip_address: event.ip ?? null,
      user_agent: event.userAgent ?? null,
    });
    if (error) {
      console.error("[audit] system insert failed", {
        action: event.action,
        error: error.message,
      });
    }
  } catch (err) {
    console.error("[audit] system unexpected failure", err);
  }
}

function extractClientIp(headerList: Headers): string | null {
  // Vercel → x-forwarded-for, first entry wins.
  const xff = headerList.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return headerList.get("x-real-ip") ?? null;
}
