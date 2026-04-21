"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Check, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export function OrgPendingInvites() {
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/org-admin/invitations");
      if (res.ok) {
        const data = await res.json();
        setInvites(
          (data.invitations ?? []).filter(
            (inv: Invitation) => inv.status === "pending"
          )
        );
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCopy(invite: Invitation) {
    const url = `${window.location.origin}/invite/${invite.token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(invite.id);
    toast.success("Invite link copied");
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function handleRevoke(invite: Invitation) {
    if (!confirm(`Revoke invitation for ${invite.email}?`)) return;
    setRevoking(invite.id);
    try {
      const res = await fetch("/api/org-admin/invitations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: invite.id }),
      });
      if (res.ok) {
        toast.success("Invitation revoked");
        setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Revoke failed");
      }
    } finally {
      setRevoking(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <p className="text-sm text-slate-500">No pending invitations.</p>
    );
  }

  return (
    <ul className="divide-y divide-slate-200">
      {invites.map((invite) => (
        <li
          key={invite.id}
          className="flex items-center justify-between gap-3 py-3"
        >
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-900">
              {invite.email}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
              <Badge variant="outline">{invite.role}</Badge>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                expires {new Date(invite.expires_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopy(invite)}
            >
              {copiedId === invite.id ? (
                <>
                  <Check className="mr-1 h-3 w-3" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3 w-3" /> Copy link
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRevoke(invite)}
              disabled={revoking === invite.id}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
