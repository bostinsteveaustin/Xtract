"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCtxLibrary } from "@/hooks/use-ctx-library";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useCreateExtraction } from "@/hooks/use-extractions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Upload,
  FileText,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";

type Step = 1 | 2 | 3;

interface UploadedFile {
  fileName: string;
  fileType: string;
  fileSize: number;
  blobUrl: string;
}

export default function NewExtractionPage() {
  const router = useRouter();
  const { ctxFiles, loading: ctxLoading } = useCtxLibrary();
  const { uploadFile, uploading } = useFileUpload();
  const { create, loading: creating } = useCreateExtraction();

  const [step, setStep] = useState<Step>(1);
  const [selectedCtxId, setSelectedCtxId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [extractionName, setExtractionName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedCtx = ctxFiles.find((c) => c.id === selectedCtxId);

  const handleFileUpload = async (file: File) => {
    setError(null);
    try {
      const result = await uploadFile(file);
      setUploadedFile({
        fileName: result.fileName,
        fileType: result.fileType,
        fileSize: result.size,
        blobUrl: result.url,
      });
      // Auto-generate extraction name
      if (!extractionName) {
        setExtractionName(
          `${result.fileName.replace(/\.[^.]+$/, "")} — ${selectedCtx?.name ?? "Extraction"}`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleStart = async () => {
    if (!selectedCtxId || !uploadedFile) return;
    setError(null);

    try {
      const extraction = await create({
        name: extractionName || `Extraction — ${new Date().toLocaleDateString()}`,
        mode: "mode2",
        ctxFileId: selectedCtxId,
        files: [uploadedFile],
      });

      router.push(`/dashboard/extractions/${extraction.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create extraction");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Extraction</h1>
        <p className="text-sm text-muted-foreground">
          Select a CTX, upload a document, and start extracting
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                s < step
                  ? "bg-primary text-primary-foreground"
                  : s === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
            <span
              className={`text-sm ${s === step ? "font-medium" : "text-muted-foreground"}`}
            >
              {s === 1 ? "Select CTX" : s === 2 ? "Upload Document" : "Start"}
            </span>
            {s < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: Select CTX */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Select a CTX File</h2>
          <p className="text-sm text-muted-foreground">
            Choose the context file that defines what to extract from your
            document.
          </p>

          {ctxLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {ctxFiles.map((ctx) => (
                <Card
                  key={ctx.id}
                  className={`cursor-pointer transition-all ${
                    selectedCtxId === ctx.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedCtxId(ctx.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm">{ctx.name}</CardTitle>
                      {selectedCtxId === ctx.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {ctx.domain}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {ctx.sectionCount} sections
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <BookOpen className="mr-1 h-3 w-3" />
                        {ctx.contextType}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedCtxId}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Upload Document */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Upload Document</h2>
          <p className="text-sm text-muted-foreground">
            Upload a vendor management contract (PDF, DOCX, or TXT).
          </p>

          {uploadedFile ? (
            <Card>
              <CardContent className="flex items-center gap-4 pt-4">
                <FileText className="h-10 w-10 text-primary" />
                <div>
                  <p className="font-medium">{uploadedFile.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {(uploadedFile.fileSize / 1024).toFixed(1)} KB —{" "}
                    {uploadedFile.fileType.toUpperCase()}
                  </p>
                </div>
                <Badge variant="default" className="ml-auto">
                  <Check className="mr-1 h-3 w-3" /> Uploaded
                </Badge>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <label className="cursor-pointer text-center">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.txt,.md"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                  )}
                  <p className="text-sm font-medium">
                    {uploading ? "Uploading..." : "Click to upload a file"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PDF, DOCX, TXT, MD up to 50MB
                  </p>
                </label>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!uploadedFile}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Configure & Start */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Configure & Start</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Extraction Name</Label>
              <Input
                id="name"
                value={extractionName}
                onChange={(e) => setExtractionName(e.target.value)}
                placeholder="Contract Analysis — Vendor X"
              />
            </div>

            <Card>
              <CardContent className="space-y-3 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">CTX File</span>
                  <span className="font-medium">{selectedCtx?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Document</span>
                  <span className="font-medium">
                    {uploadedFile?.fileName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mode</span>
                  <span className="font-medium">
                    Mode 2 — Domain Object Extraction
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleStart}
              disabled={creating}
            >
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Start Extraction
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
