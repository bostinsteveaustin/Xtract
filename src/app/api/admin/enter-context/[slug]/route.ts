import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { requirePlatformRole, ACTIVE_ORG_COOKIE, ADMIN_CONTEXT_COOKIE, type AdminContextState } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent, auditActions } from "@/lib/api/audit";

/**
 * POST /api/admin/enter-context/:slug
 *
 * Platform role holder enters admin context for the target organisation.
 *   1. Sets xtract-active-org cookie to target org id.
 *   2. Sets xtract-admin-context cookie with { targetOrganizationId, enteredAt, expiresAt }.
 *   3. Writes an audit_log entry 'admin.context_entered' tagged admin_context_flag=true.
 *
 * Session is timeboxed to 60 minutes (E-08 §5.4). The cookie expiresAt is the
 * timestamp the banner and the requireAuth guard check against.
 */

const SESSION_TTL_MINUTES = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const auth = await requirePlatformRole();
  if (auth.error) return auth.error;

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();
  if (!org) {
    return NextResponse.json(
      { error: "Organisation not found" },
      { status: 404 }
    );
  }

  const enteredAt = new Date();
  const expiresAt = new Date(enteredAt.getTime() + SESSION_TTL_MINUTES * 60_000);

  const state: AdminContextState = {
    targetOrganizationId: org.id,
    enteredAt: enteredAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, org.id, {
    httpOnly: false, // read by client UI for active-org display
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  cookieStore.set(ADMIN_CONTEXT_COOKIE, JSON.stringify(state), {
    httpOnly: true, // state cookie — middleware + server reads only
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  await writeAuditEvent({
    action: auditActions.ADMIN_CONTEXT_ENTERED,
    resourceType: "organization",
    resourceId: org.id,
    targetOrganizationId: org.id,
    payload: {
      org_slug: org.slug,
      org_name: org.name,
      ttl_minutes: SESSION_TTL_MINUTES,
      expires_at: state.expiresAt,
    },
  });

  return NextResponse.json({
    ok: true,
    organization: { id: org.id, name: org.name, slug: org.slug },
    expiresAt: state.expiresAt,
  });
}
