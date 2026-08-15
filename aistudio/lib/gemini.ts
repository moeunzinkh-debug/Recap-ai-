import { buildRecapPrompt } from "./prompt";
import { formatClock } from "./constants";
import type { ExtractedFrame } from "./frames";
import { getSavedApiKey } from "./storage";

export class GeminiError extends Error {}

export interface RecapStreamInput {
  fileName: string;
  durationSec: number;
  frames: ExtractedFrame[];
  intervalSec: number;
  model: string;
}

/**
 * Sends browser-extracted frames to the Worker. A key saved by the user is
 * attached only to this HTTPS request; otherwise the Worker Secret is used.
 * Neither key is bundled into the public client application.
 */
export async function* streamRecapScript(
  input: RecapStreamInput,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const savedKey = getSavedApiKey();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (savedKey) headers["x-gemini-api-key"] = savedKey;

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
    signal,
  });
  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({})) as { error?: string; detail?: string };
    throw new GeminiError(body.error || `Gemini API បរាជ័យ (${response.status})។`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        const event = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = event.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
        if (!data) continue;
        try {
          const chunk = JSON.parse(data) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
          for (const candidate of chunk.candidates ?? []) {
            for (const part of candidate.content?.parts ?? []) if (part.text) yield part.text;
          }
        } catch {
          // Ignore non-JSON SSE keepalive messages.
        }
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}

// Kept here for prompt parity in the browser project; the Worker owns the
// actual prompt so no API key or Gemini SDK is included in the public bundle.
export { buildRecapPrompt, formatClock };
