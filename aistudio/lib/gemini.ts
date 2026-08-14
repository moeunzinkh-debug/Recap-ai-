import { GoogleGenAI } from "@google/genai";
import { buildRecapPrompt } from "./prompt";
import { formatClock } from "./constants";
import type { ExtractedFrame } from "./frames";

export class GeminiError extends Error {}

export interface RecapStreamInput {
  fileName: string;
  durationSec: number;
  frames: ExtractedFrame[];
  intervalSec: number;
  model: string;
  apiKey: string;
}

/** Gemini 3 text models use thinking levels instead of legacy sampling options. */
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

function mapGeminiError(error: unknown, model: string): GeminiError {
  const message = error instanceof Error ? error.message : String(error);

  if (/API key not valid|API_KEY_INVALID|invalid api key|401/i.test(message)) {
    return new GeminiError("Gemini API Key មិនត្រឹមត្រូវ។ សូមពិនិត្យ Key ក្នុងផ្នែក API Key។");
  }
  if (/quota|resource exhausted|429/i.test(message)) {
    return new GeminiError("លើសកូតាប្រើប្រាស់ Gemini (Quota Exceeded)។ សូមព្យាយាមម្ដងទៀតពេលក្រោយ។");
  }
  if (/model|not found|404|permission|access|forbidden|403/i.test(message)) {
    return new GeminiError(
      `ម៉ូដែល ${model} មិនអាចប្រើបានជាមួយ API Key របស់អ្នកទេ។ សូមជ្រើសរើសម៉ូដែលផ្សេងទៀតក្នុងបញ្ជី។`
    );
  }
  return new GeminiError(`Gemini API បរាជ័យ៖ ${message.slice(0, 160)}`);
}

/**
 * Streams a Khmer recap script from Gemini by sending extracted frames in
 * chronological order. A text marker before every image preserves timestamps.
 * Runs fully in the browser — no server needed.
 */
export async function* streamRecapScript(
  input: RecapStreamInput
): AsyncGenerator<string, void, unknown> {
  if (!input.apiKey) {
    throw new GeminiError(
      "រកមិនឃើញ Gemini API Key ទេ។ សូមបញ្ចូល Key ក្នុងផ្នែក API Key ខាងលើ។"
    );
  }

  const ai = new GoogleGenAI({ apiKey: input.apiKey });
  const prompt = buildRecapPrompt({
    fileName: input.fileName,
    durationSec: input.durationSec,
    frameCount: input.frames.length,
    intervalSec: input.intervalSec,
  });

  const parts: Record<string, unknown>[] = [{ text: prompt }];
  input.frames.forEach((frame, index) => {
    parts.push({
      text: `Frame ${index + 1}/${input.frames.length} — ${formatClock(frame.timeSec)}`,
    });
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: frame.base64,
      },
    });
  });

  try {
    const stream = await ai.models.generateContentStream({
      model: input.model,
      contents: [{ role: "user", parts }],
      config: buildGenerationConfig(input.model),
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield text;
    }
  } catch (error) {
    throw mapGeminiError(error, input.model);
  }
}
