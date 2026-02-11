// Anthropic Claude provider via Vercel AI SDK

import { createAnthropic } from "@ai-sdk/anthropic";

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

/** Default model for extraction tasks */
export const extractionModel = anthropic("claude-sonnet-4-20250514");

/** Model for validation and acid test (can use a different model) */
export const validationModel = anthropic("claude-sonnet-4-20250514");
