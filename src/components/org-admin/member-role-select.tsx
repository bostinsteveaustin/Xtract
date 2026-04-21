"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Role = "org_admin" | "rig_manager" | "member";

/**
 * Role dropdown for a single member row. Calls PATCH /api/org-admin/members
 * on change and refreshes the server-rendered list on success.
 */
export function MemberRoleSelect({
  userId,
  currentRole,
  disabled,
}: {
  userId: string;
  currentRole: Role;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(currentRole);
  const [isPending, startTransition] = useTransition();

  function onChange(next: Role) {
    if (next === role) return;
    startTransition(async () => {
      const previous = role;
      setRole(next);
      try {
        const res = await fetch("/api/org-admin/members", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, role: next }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          toast.error(body.error ?? "Role change failed");
          setRole(previous);
          return;
        }
        toast.success(`Role set to ${roleLabel(next)}`);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Role change failed"
        );
        setRole(previous);
      }
    });
  }

  return (
    <Select
      value={role}
      onValueChange={(v) => onChange(v as Role)}
      disabled={disabled || isPending}
    >
      <SelectTrigger className="h-8 w-36 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="member">Member</SelectItem>
        <SelectItem value="rig_manager">Rig manager</SelectItem>
        <SelectItem value="org_admin">Org admin</SelectItem>
      </SelectContent>
    </Select>
  );
}

function roleLabel(role: Role): string {
  return (
    {
      org_admin: "Org admin",
      rig_manager: "Rig manager",
      member: "Member",
    } as const
  )[role];
}
