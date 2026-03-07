"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X } from "lucide-react";

interface AvatarUploadProps {
  currentUrl: string | null;
  displayName: string | null;
  email: string;
  userId: string;
  onUpload: (url: string | null) => void;
}

export function AvatarUpload({
  currentUrl,
  displayName,
  email,
  userId,
  onUpload,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const initials = (displayName ?? email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type + size (max 2MB)
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) return;

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${userId}/avatar.${ext}`;

      // Upload to Supabase Storage — overwrite if exists
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      // Bust cache by appending timestamp
      const url = `${publicUrl}?t=${Date.now()}`;
      onUpload(url);
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setUploading(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onUpload(null);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative group">
        <Avatar className="h-20 w-20">
          {currentUrl && <AvatarImage src={currentUrl} />}
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>

        {/* Hover overlay */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              Uploading…
            </>
          ) : (
            "Upload photo"
          )}
        </Button>
        {currentUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleRemove}
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
