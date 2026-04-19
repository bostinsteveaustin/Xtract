"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile: {
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function MemberList({ workspaceId }: { workspaceId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/workspaces/members");
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members ?? []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No members found.</p>
    );
  }

  const roleBadgeVariant = (role: string) => {
    if (role === "owner") return "default" as const;
    if (role === "admin") return "secondary" as const;
    return "outline" as const;
  };

  return (
    <div className="divide-y rounded-md border">
      {members.map((m) => {
        const name = m.profile?.display_name ?? m.profile?.email ?? "Unknown";
        const initials = name
          .split(/[\s@]/)
          .slice(0, 2)
          .map((s) => s.charAt(0).toUpperCase())
          .join("");

        return (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar className="h-8 w-8">
              {m.profile?.avatar_url && (
                <AvatarImage src={m.profile.avatar_url} />
              )}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {m.profile?.email}
              </div>
            </div>
            <Badge variant={roleBadgeVariant(m.role)} className="capitalize">
              {m.role}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
