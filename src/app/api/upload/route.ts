// POST /api/upload — Upload a file to Vercel Blob storage

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { MAX_FILE_SIZE, SUPPORTED_FILE_TYPES, MIME_TYPES } from "@/lib/utils/constants";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        },
        { status: 400 }
      );
    }

    // Determine file type from extension
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!SUPPORTED_FILE_TYPES.includes(extension as typeof SUPPORTED_FILE_TYPES[number])) {
      return NextResponse.json(
        {
          error: `Unsupported file type: .${extension}. Supported types: ${SUPPORTED_FILE_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const blob = await put(`uploads/${Date.now()}-${file.name}`, file, {
      access: "public",
      contentType: MIME_TYPES[extension] || "application/octet-stream",
    });

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
      fileType: extension,
      fileName: file.name,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
