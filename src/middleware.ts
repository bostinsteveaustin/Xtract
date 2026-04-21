import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Route gates:
 *   /admin/*      → requires platform_role != 'none' AND MFA enrolled
 *   /org-admin/*  → requires membership.role = 'org_admin' in active org
 *                   (or platform_admin, which bypasses this check)
 *   /settings/mfa-setup → always reachable by authenticated users (self-service MFA)
 *
 * MFA enforcement: any user with platform_role != 'none' and no verified TOTP
 * factor is redirected to /settings/mfa-setup for any non-auth/non-MFA route.
 */

const MFA_SETUP_PATH = "/settings/mfa-setup";

function isAuthRoute(path: string): boolean {
  return path.startsWith("/login") || path.startsWith("/auth");
}

function isMfaSetupRoute(path: string): boolean {
  return path.startsWith(MFA_SETUP_PATH);
}

function isAdminRoute(path: string): boolean {
  return path.startsWith("/admin");
}

function isOrgAdminRoute(path: string): boolean {
  return path.startsWith("/org-admin");
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Unauthenticated users can only access auth routes.
  if (!user && !isAuthRoute(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated user hitting /login → bounce to app.
  if (user && path.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/workflows";
    return NextResponse.redirect(url);
  }

  // From here on we need the user's platform_role and MFA state for gating.
  if (user && !isAuthRoute(path)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("platform_role, mfa_required")
      .eq("id", user.id)
      .single();

    const platformRole = (profile?.platform_role as string | undefined) ?? "none";
    const hasPlatformRole = platformRole !== "none";

    // MFA enforcement for platform-role holders.
    // Supabase exposes MFA factors on the user object. A factor counts iff
    // status === 'verified' (enrolled but unverified factors don't protect).
    if (hasPlatformRole && !isMfaSetupRoute(path)) {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedTotp = (factorsData?.totp ?? []).some(
        (f) => f.status === "verified"
      );
      if (!verifiedTotp) {
        const url = request.nextUrl.clone();
        url.pathname = MFA_SETUP_PATH;
        return NextResponse.redirect(url);
      }
    }

    // /admin/* route gate.
    if (isAdminRoute(path) && !hasPlatformRole) {
      const url = request.nextUrl.clone();
      url.pathname = "/workflows";
      return NextResponse.redirect(url);
    }

    // /org-admin/* route gate.
    if (isOrgAdminRoute(path)) {
      // Need to check the caller's active org membership role. Cookie-based.
      const activeOrgId = request.cookies.get("xtract-active-org")?.value;
      let allowed = false;

      if (platformRole === "platform_admin") {
        // Platform admin is allowed on any /org-admin/* page in admin context.
        allowed = true;
      } else if (activeOrgId) {
        const { data: membership } = await supabase
          .from("memberships")
          .select("role")
          .eq("user_id", user.id)
          .eq("organization_id", activeOrgId)
          .eq("status", "active")
          .maybeSingle();
        allowed = membership?.role === "org_admin";
      } else {
        // No active org cookie → fall back to the single-membership heuristic.
        const { data: memberships } = await supabase
          .from("memberships")
          .select("role")
          .eq("user_id", user.id)
          .eq("status", "active");
        allowed =
          memberships?.length === 1 && memberships[0].role === "org_admin";
      }

      if (!allowed) {
        const url = request.nextUrl.clone();
        url.pathname = "/workflows";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Exclude static assets, images, and all /api/ routes.
    // API routes handle their own auth (or are called from authenticated pages).
    // Redirecting POST /api/* to /login returns HTML and breaks JSON clients.
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
