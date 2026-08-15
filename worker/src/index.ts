export interface Env {
  /** Optional fallback set with: npx wrangler secret put GEMINI_API_KEY */
  GEMINI_API_KEY?: string;
}

type Frame = { base64: string; timeSec: number };
type AnalyzeInput = {
  fileName: string;
  durationSec: number;
  intervalSec: number;
  model: string;
  frames: Frame[];
};

const MODELS = new Set([
  "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash",
  "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash",
  "gemini-2.5-flash-lite", "gemini-2.5-pro",
]);
const MAX_FRAMES = 110;
const MAX_IMAGE_BASE64_CHARS = 1_500_000;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}
function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}
function prompt(input: AnalyzeInput): string {
  return `អ្នកគឺជាអ្នកជំនាញសរសេរ Script សម្រាយរឿង Anime និងភាពយន្តជាភាសាខ្មែរ។ ខ្ញុំនឹងផ្ញើ Frames ចំនួន ${input.frames.length} សន្លឹកពីវីដេអូ "${input.fileName}" តាមលំដាប់ពេលវេលា រាល់ប្រហែល ${input.intervalSec.toFixed(1)} វិនាទី។ មើលវាតាមលំដាប់ ហើយសរសេរស្គ្រីបសម្រាយរឿងជាភាសាខ្មែរទាំងស្រុង។

ត្រូវរៀបរាប់តាមលំដាប់ហេតុការណ៍ ផ្ដោតលើ Core Plot សកម្មភាពសំខាន់ និងចំណុចកំប្លែង។ ណែនាំតួអង្គពេលបង្ហាញខ្លួនដំបូង; បើមិនដឹងឈ្មោះ សូមពណ៌នារូបរាង។ ប្រើប្រយោគខ្លី ងាយយល់ មានចង្វាក់លឿន និងអារម្មណ៍រស់រវើក។

ទម្រង់ចម្លើយត្រូវតែមាន៖
- ជួរទីមួយ៖ ## ចំណងជើង៖ <ចំណងជើងទាក់ទាញជាភាសាខ្មែរ>
- ជួរទីពីរ៖ **រយៈពេលវីដេអូ៖** ${Math.floor(input.durationSec / 60)}:${Math.round(input.durationSec % 60).toString().padStart(2, "0")} នាទី | **Frames វិភាគ៖** ${input.frames.length}
- បែងចែកឈុតជា ### [MM:SS – MM:SS] ចំណងជើងឈុត ហើយពណ៌នាមួយឈុត ៣–៦ ប្រយោគ
- បញ្ចប់ដោយ ### សង្ខេបសាច់រឿង។`;
}

/** Translates an upstream Gemini failure into an actionable Khmer message. */
function geminiErrorMessage(status: number, body: string, model: string): string {
  let upstreamMessage = "";
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    upstreamMessage = parsed.error?.message ?? "";
  } catch {
    // Non-JSON error bodies (HTML error pages) fall back to the status code.
  }

  if (status === 400 && /API key not valid|API_KEY_INVALID/i.test(upstreamMessage)) {
    return "Gemini API Key មិនត្រឹមត្រូវ។ សូមពិនិត្យ Key ក្នុងផ្ទាំង API Keys។";
  }
  if (status === 401 || status === 403) {
    return "គ្មានសិទ្ធិប្រើប្រាស់ Gemini ជាមួយ Key នេះទេ។ សូមពិនិត្យ Key របស់អ្នក។";
  }
  if (status === 404) {
    return `ម៉ូដែល ${model} មិនអាចប្រើបានជាមួយ API Key របស់អ្នកទេ។ សូមជ្រើសរើសម៉ូដែលផ្សេង។`;
  }
  if (status === 429) {
    return "លើសកូតាប្រើប្រាស់ Gemini (Quota Exceeded)។ សូមរង់ចាំមួយភ្លែត រួចព្យាយាមម្ដងទៀត។";
  }
  if (status === 413 || /too large|exceeds/i.test(upstreamMessage)) {
    return "ទិន្នន័យរូបភាពធំពេកសម្រាប់ម៉ូដែលនេះ។ សូមសាកល្បងវីដេអូខ្លីជាងនេះ។";
  }
  if (status >= 500) {
    return `ម៉ាស៊ីនបម្រើ Gemini មានបញ្ហាបណ្ដោះអាសន្ន (${status})។ សូមព្យាយាមម្ដងទៀត។`;
  }
  return upstreamMessage
    ? `Gemini API បរាជ័យ៖ ${upstreamMessage.slice(0, 160)}`
    : `Gemini API បរាជ័យ (${status})។`;
}

function generationConfig(model: string): Record<string, unknown> {
  return model.startsWith("gemini-3.")
    ? { maxOutputTokens: 8192, thinkingConfig: { thinkingLevel: "low" } }
    : { temperature: 0.9, topP: 0.95, maxOutputTokens: 8192 };
}

async function analyze(request: Request, env: Env): Promise<Response> {
  // A per-user key saved in the browser takes priority. If none is supplied,
  // deployments can continue to use the shared Cloudflare Worker Secret.
  const browserKey = (request.headers.get("x-gemini-api-key") ?? "").trim();
  if (browserKey.length > 512) return json({ error: "Invalid Gemini API Key." }, 400);
  const apiKey = browserKey || env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return json(
      { error: "មិនទាន់មាន Gemini API Key។ សូមរក្សាទុក Key ក្នុងផ្ទាំង API Keys។" },
      503
    );
  }
  let input: AnalyzeInput;
  try { input = await request.json<AnalyzeInput>(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  if (!input || !MODELS.has(input.model) || !Number.isFinite(input.durationSec) || input.durationSec < 3 || input.durationSec > 600 || !Array.isArray(input.frames) || input.frames.length < 1 || input.frames.length > MAX_FRAMES) {
    return json({ error: "Invalid analysis request." }, 400);
  }
  if (typeof input.fileName !== "string" || input.fileName.length > 255 || !Number.isFinite(input.intervalSec)) return json({ error: "Invalid video metadata." }, 400);
  for (const frame of input.frames) {
    if (!frame || typeof frame.base64 !== "string" || frame.base64.length === 0 || frame.base64.length > MAX_IMAGE_BASE64_CHARS || !Number.isFinite(frame.timeSec)) return json({ error: "Invalid frame data." }, 400);
  }
  const parts: Record<string, unknown>[] = [{ text: prompt(input) }];
  input.frames.forEach((frame, index) => parts.push(
    { text: `Frame ${index + 1}/${input.frames.length} — ${clock(frame.timeSec)}` },
    { inlineData: { mimeType: "image/jpeg", data: frame.base64 } },
  ));
  const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: generationConfig(input.model) }),
  });
  if (!upstream.ok || !upstream.body) {
    const raw = await upstream.text();
    return json(
      { error: geminiErrorMessage(upstream.status, raw, input.model), detail: raw.slice(0, 300) },
      upstream.status
    );
  }
  return new Response(upstream.body, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache", "x-content-type-options": "nosniff" } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return json({ ok: true, geminiConfigured: Boolean(env.GEMINI_API_KEY) });
    if (url.pathname === "/api/analyze") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      return analyze(request, env);
    }
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
