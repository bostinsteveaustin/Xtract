"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Lock, Check } from "lucide-react";
import { AvatarUpload } from "./avatar-upload";

interface ProfilePageClientProps {
  userId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  workspaceName: string | null;
}

export function ProfilePageClient({
  userId,
  email,
  displayName: initialDisplayName,
  avatarUrl: initialAvatarUrl,
  workspaceName: initialWorkspaceName,
}: ProfilePageClientProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [workspaceName, setWorkspaceName] = useState(
    initialWorkspaceName ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges =
    displayName !== (initialDisplayName ?? "") ||
    avatarUrl !== initialAvatarUrl ||
    workspaceName !== (initialWorkspaceName ?? "");

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName || null,
          avatarUrl,
          workspaceName: workspaceName || null,
        }),
      });

      if (res.ok) {
        setSaved(true);
        // Refresh server components to pick up new data
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push("/workflows")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to workflows
      </button>

      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Photo</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            currentUrl={avatarUrl}
            displayName={displayName || null}
            email={email}
            userId={userId}
            onUpload={setAvatarUrl}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email
              <Lock className="inline h-3 w-3 ml-1.5 text-muted-foreground" />
            </Label>
            <Input id="email" value={email} disabled className="bg-muted" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="workspaceName">Workspace Name</Label>
            <Input
              id="workspaceName"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="My Workspace"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="min-w-[140px]"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving…
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Saved
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
        {!hasChanges && !saved && (
          <span className="text-xs text-muted-foreground">No changes</span>
        )}
      </div>
    </div>
  );
}
