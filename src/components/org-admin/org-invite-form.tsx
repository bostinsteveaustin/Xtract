"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function OrgInviteForm({ onInvited }: { onInvited?: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"org_admin" | "rig_manager" | "member">(
    "member"
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/org-admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Invitation created", {
          description: `Share the invite link with ${email}`,
        });
        setEmail("");
        setRole("member");
        onInvited?.();
      } else {
        toast.error(data.error ?? "Invite failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@example.com"
        />
      </div>
      <div className="w-40">
        <Label htmlFor="invite-role">Role</Label>
        <Select
          value={role}
          onValueChange={(v) =>
            setRole(v as "org_admin" | "rig_manager" | "member")
          }
        >
          <SelectTrigger id="invite-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="rig_manager">Rig manager</SelectItem>
            <SelectItem value="org_admin">Org admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Inviting…" : "Send invite"}
      </Button>
    </form>
  );
}
