import { buildRecapPrompt } from "./prompt";
import { formatClock } from "./constants";
import type { ExtractedFrame } from "./frames";
import { getSavedApiKey } from "./storage";

export class GeminiError extends Error {
  /** True when retrying the same request has a realistic chance of succeeding. */
  readonly retryable: boolean;

  constructor(message: string, options?: { retryable?: boolean }) {
    super(message);
    this.name = "GeminiError";
    this.retryable = options?.retryable ?? false;
  }
}

export interface RecapStreamInput {
  fileName: string;
  durationSec: number;
  frames: ExtractedFrame[];
  intervalSec: number;
  model: string;
}

export interface RecapStreamOptions {
  signal?: AbortSignal;
  /** Reports why Gemini stopped, so a truncated script can be flagged. */
  onFinishReason?: (reason: string) => void;
}

interface GeminiStreamChunk {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string };
}

/**
 * Gemini frames SSE events with "\r\n\r\n" on some network paths, while the
 * documented delimiter is "\n\n". Splitting on "\n\n" alone silently buffers
 * the whole stream and produces an empty script, so every delimiter allowed by
 * the SSE specification is honoured here.
 */
const SSE_DELIMITERS = ["\r\n\r\n", "\n\n", "\r\r"] as const;

function findDelimiter(buffer: string): { index: number; length: number } | null {
  let index = -1;
  let length = 0;
  for (const delimiter of SSE_DELIMITERS) {
    const found = buffer.indexOf(delimiter);
    if (found !== -1 && (index === -1 || found < index)) {
      index = found;
      length = delimiter.length;
    }
  }
  return index === -1 ? null : { index, length };
}

/** Joins the `data:` lines of one SSE event, keeping intentional newlines. */
function readEventData(rawEvent: string): string {
  const lines = rawEvent.split(/\r\n|\n|\r/);
  const data: string[] = [];
  for (const line of lines) {
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  return data.join("\n").trim();
}

function describeHttpFailure(status: number, body: { error?: string; detail?: string }): GeminiError {
  if (body.error) {
    return new GeminiError(body.error, { retryable: status === 429 || status >= 500 });
  }
  if (status === 401 || status === 403) {
    return new GeminiError(
      "Gemini API Key មិនត្រឹមត្រូវ ឬគ្មានសិទ្ធិប្រើប្រាស់។ សូមពិនិត្យ Key ក្នុងផ្ទាំង API Keys។"
    );
  }
  if (status === 429) {
    return new GeminiError(
      "លើសកូតាប្រើប្រាស់ Gemini (Quota Exceeded)។ សូមរង់ចាំមួយភ្លែត រួចព្យាយាមម្ដងទៀត។",
      { retryable: true }
    );
  }
  if (status === 404) {
    return new GeminiError("ម៉ូដែលនេះមិនអាចប្រើបានជាមួយ API Key របស់អ្នកទេ។ សូមជ្រើសរើសម៉ូដែលផ្សេង។");
  }
  if (status >= 500) {
    return new GeminiError(
      `ម៉ាស៊ីនបម្រើ Gemini មានបញ្ហាបណ្ដោះអាសន្ន (${status})។ សូមព្យាយាមម្ដងទៀត។`,
      { retryable: true }
    );
  }
  return new GeminiError(`Gemini API បរាជ័យ (${status})។`);
}

/** Turns an in-stream Gemini error payload into a Khmer message. */
function describeStreamError(error: NonNullable<GeminiStreamChunk["error"]>): GeminiError {
  const status = error.code ?? 0;
  const message = (error.message ?? "").slice(0, 200);
  if (status === 429) {
    return new GeminiError("លើសកូតាប្រើប្រាស់ Gemini (Quota Exceeded)។ សូមព្យាយាមម្ដងទៀតពេលក្រោយ។", {
      retryable: true,
    });
  }
  if (status >= 500) {
    return new GeminiError(`ម៉ាស៊ីនបម្រើ Gemini មានបញ្ហាបណ្ដោះអាសន្ន (${status})។ សូមព្យាយាមម្ដងទៀត។`, {
      retryable: true,
    });
  }
  return new GeminiError(`Gemini បញ្ឈប់ការវិភាគ៖ ${message || error.status || status}`);
}

/** Explains an empty response instead of showing a generic failure. */
function describeEmptyResult(finishReason: string, blockReason: string): GeminiError {
  if (blockReason) {
    return new GeminiError(
      `Gemini បានបដិសេធវីដេអូនេះ (${blockReason})។ រូបភាពខ្លះអាចផ្ទុយនឹងគោលការណ៍សុវត្ថិភាព — សូមសាកល្បងវីដេអូផ្សេង។`
    );
  }
  switch (finishReason) {
    case "MAX_TOKENS":
      return new GeminiError(
        "Gemini ប្រើកូតាតួអក្សរអស់មុនពេលចាប់ផ្ដើមសរសេរ។ សូមសាកល្បងម៉ូដែល Flash-Lite ឬវីដេអូខ្លីជាងនេះ។"
      );
    case "SAFETY":
    case "PROHIBITED_CONTENT":
    case "IMAGE_SAFETY":
      return new GeminiError(
        "ខ្លឹមសារវីដេអូត្រូវបានទប់ស្កាត់ដោយតម្រងសុវត្ថិភាពរបស់ Gemini។ សូមសាកល្បងវីដេអូផ្សេង។"
      );
    case "RECITATION":
      return new GeminiError(
        "Gemini បានឈប់ ព្រោះលទ្ធផលស្រដៀងនឹងអត្ថបទមានកម្មសិទ្ធិ។ សូមព្យាយាមម្ដងទៀត ឬប្ដូរម៉ូដែល។"
      );
    default:
      return new GeminiError(
        "Gemini មិនបានផ្ដល់លទ្ធផលទេ។ សូមព្យាយាមម្ដងទៀត ឬប្ដូរម៉ូដែលផ្សេង។",
        { retryable: true }
      );
  }
}

/**
 * Sends browser-extracted frames to the Worker. A key saved by the user is
 * attached only to this HTTPS request; otherwise the Worker Secret is used.
 * Neither key is bundled into the public client application.
 */
export async function* streamRecapScript(
  input: RecapStreamInput,
  options: RecapStreamOptions = {}
): AsyncGenerator<string, void, unknown> {
  const { signal, onFinishReason } = options;
  const savedKey = getSavedApiKey();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (savedKey) headers["x-gemini-api-key"] = savedKey;

  let response: Response;
  try {
    response = await fetch("/api/analyze", {
      method: "POST",
      headers,
      body: JSON.stringify(input),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new GeminiError(
      "មិនអាចតភ្ជាប់ទៅម៉ាស៊ីនបម្រើបានទេ។ សូមពិនិត្យបណ្ដាញអ៊ីនធឺណិត ហើយព្យាយាមម្ដងទៀត។",
      { retryable: true }
    );
  }

  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => ({}))) as { error?: string; detail?: string };
    throw describeHttpFailure(response.status, body);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let produced = false;
  let finishReason = "";
  let blockReason = "";

  const handleEvent = function* (rawEvent: string): Generator<string, void, unknown> {
    const data = readEventData(rawEvent);
    if (!data || data === "[DONE]") return;

    let chunk: GeminiStreamChunk;
    try {
      chunk = JSON.parse(data) as GeminiStreamChunk;
    } catch {
      return; // Ignore keepalives and other non-JSON payloads.
    }

    if (chunk.error) throw describeStreamError(chunk.error);
    if (chunk.promptFeedback?.blockReason) blockReason = chunk.promptFeedback.blockReason;

    for (const candidate of chunk.candidates ?? []) {
      if (candidate.finishReason) finishReason = candidate.finishReason;
      for (const part of candidate.content?.parts ?? []) {
        // Thinking summaries are metadata, not part of the recap script.
        if (part.thought) continue;
        if (part.text) {
          produced = true;
          yield part.text;
        }
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      let delimiter = findDelimiter(buffer);
      while (delimiter) {
        const rawEvent = buffer.slice(0, delimiter.index);
        buffer = buffer.slice(delimiter.index + delimiter.length);
        yield* handleEvent(rawEvent);
        delimiter = findDelimiter(buffer);
      }

      if (done) {
        // A final event may arrive without its trailing blank line.
        if (buffer.trim()) yield* handleEvent(buffer);
        buffer = "";
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (finishReason) onFinishReason?.(finishReason);
  if (!produced) throw describeEmptyResult(finishReason, blockReason);
}

// Kept here for prompt parity in the browser project; the Worker owns the
// actual prompt so no API key or Gemini SDK is included in the public bundle.
export { buildRecapPrompt, formatClock };
