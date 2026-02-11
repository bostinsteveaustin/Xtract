// SSE (Server-Sent Events) stream helper for pipeline progress

import type { PipelineEvent } from "@/types/pipeline";

/**
 * Create a pipeline SSE stream for real-time progress updates.
 * Returns a Response-compatible stream and an onProgress callback.
 */
export function createPipelineSSEStream(): {
  stream: ReadableStream;
  onProgress: (event: PipelineEvent) => void;
  close: () => void;
} {
  let controller: ReadableStreamDefaultController | null = null;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
    cancel() {
      controller = null;
    },
  });

  const onProgress = (event: PipelineEvent) => {
    if (!controller) return;
    try {
      const data = `data: ${JSON.stringify(event)}\n\n`;
      controller.enqueue(encoder.encode(data));
    } catch {
      // Stream may be closed
    }
  };

  const close = () => {
    if (!controller) return;
    try {
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    } catch {
      // Already closed
    }
    controller = null;
  };

  return { stream, onProgress, close };
}

/**
 * Create SSE Response with proper headers
 */
export function createSSEResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
