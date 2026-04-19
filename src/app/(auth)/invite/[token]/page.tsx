"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface InviteInfo {
  valid: boolean;
  email: string;
  role: string;
  workspaceName: string;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);

  // Check invite validity and user session
  useEffect(() => {
    async function init() {
      try {
        // Check invite
        const res = await fetch(`/api/workspaces/invitations/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Invalid invitation");
          return;
        }

        setInvite(data);

        // Check if user is logged in
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch {
        setError("Failed to load invitation");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch(`/api/workspaces/invitations/${token}`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to accept invitation");
        setAccepting(false);
        return;
      }

      // Redirect to app
      router.push("/workflows");
    } catch {
      setError("Failed to accept invitation");
      setAccepting(false);
    }
  }

  function handleLogin() {
    // Redirect to login with invite token preserved in URL
    router.push(`/login?invite=${token}`);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading invitation...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Xtract</CardTitle>
          <CardDescription>
            {error
              ? "Invitation Error"
              : `You&apos;ve been invited to join a workspace`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="ghost" onClick={() => router.push("/login")}>
                Go to login
              </Button>
            </div>
          ) : invite ? (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm">
                  You&apos;ve been invited to join{" "}
                  <strong>{invite.workspaceName}</strong> as a{" "}
                  <strong>{invite.role}</strong>.
                </p>
                <p className="text-xs text-muted-foreground">
                  Invitation for {invite.email}
                </p>
              </div>

              {user ? (
                <Button
                  className="w-full"
                  onClick={handleAccept}
                  disabled={accepting}
                >
                  {accepting ? "Joining..." : "Accept & Join Workspace"}
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-center text-muted-foreground">
                    Sign in to accept this invitation
                  </p>
                  <Button className="w-full" onClick={handleLogin}>
                    Sign in with {invite.email}
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
