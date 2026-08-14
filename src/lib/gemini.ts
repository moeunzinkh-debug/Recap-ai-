import { GoogleGenAI } from "@google/genai";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";
import { buildRecapPrompt } from "@/lib/prompt";

export class GeminiError extends Error {}

export interface RecapStreamInput {
  fileName: string;
  durationSec: number;
  frames: { base64: string; timeSec: number }[];
  intervalSec: number;
  model: string;
}

export const GEMINI_KEY_NAME = "GEMINI_API_KEY";

export interface GeminiKeyInfo {
  key: string | null;
  source: "db" | "env" | "none";
}

/**
 * Resolves the effective Gemini API key:
 * 1. Key saved by the user in the UI (database) — takes priority
 * 2. GEMINI_API_KEY environment variable
 */
export async function getGeminiKeyInfo(): Promise<GeminiKeyInfo> {
  try {
    const [row] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.name, GEMINI_KEY_NAME))
      .limit(1);
    if (row) {
      try {
        return { key: decryptSecret(row.valueEncrypted), source: "db" };
      } catch {
        // corrupted entry — fall through to env
      }
    }
  } catch {
    // database unavailable — fall through to env
  }
  const envKey = process.env.GEMINI_API_KEY;
  return envKey
    ? { key: envKey, source: "env" }
    : { key: null, source: "none" };
}

export async function getGeminiKey(): Promise<string | null> {
  return (await getGeminiKeyInfo()).key;
}

/**
 * Gemini 3.x models (3.1, 3.6, ...) do not support the legacy sampling
 * parameters (temperature/topP) — they use thinking levels instead.
 */
function isGemini3x(model: string): boolean {
  return /^gemini-3\./.test(model);
}

function buildGenerationConfig(model: string): Record<string, unknown> {
  if (isGemini3x(model)) {
    return {
      maxOutputTokens: 8192,
      thinkingConfig: { thinkingLevel: "low" },
    };
  }
  return {
    temperature: 0.9,
    topP: 0.95,
    maxOutputTokens: 8192,
  };
}

/**
 * Streams a Khmer recap script from Gemini by sending the extracted
 * frames (in chronological order) as inline images.
 */
export async function* streamRecapScript(
  input: RecapStreamInput
): AsyncGenerator<string, void, unknown> {
  const apiKey = await getGeminiKey();
  if (!apiKey) {
    throw new GeminiError(
      "រកមិនឃើញ Gemini API Key ទេ។ សូមបញ្ចូល Key ក្នុងទំព័រ API Keys ឬកំណត់ក្នុងឯកសារ .env របស់អ្នក។"
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = buildRecapPrompt({
    fileName: input.fileName,
    durationSec: input.durationSec,
    frameCount: input.frames.length,
    intervalSec: input.intervalSec,
  });

  const parts: Record<string, unknown>[] = [{ text: prompt }];
  for (const frame of input.frames) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: frame.base64,
      },
    });
  }

  let stream;
  try {
    stream = await ai.models.generateContentStream({
      model: input.model,
      contents: [{ role: "user", parts }],
      config: buildGenerationConfig(input.model),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/model|not found|404|permission|access/i.test(msg)) {
      throw new GeminiError(
        `ម៉ូដែល ${input.model} មិនអាចប្រើបានជាមួយ API Key របស់អ្នកទេ។ សូមជ្រើសរើសម៉ូដែលផ្សេងទៀតក្នុងបញ្ជី (${msg.slice(0, 100)})។`
      );
    }
    throw new GeminiError(`Gemini API បរាជ័យ៖ ${msg.slice(0, 160)}`);
  }

  for await (const chunk of stream) {
    const text = chunk.text;
    if (text && text.length > 0) {
      yield text;
    }
  }
}
