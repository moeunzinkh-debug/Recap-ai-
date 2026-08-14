import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getGeminiKey } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tests a Gemini API key with a tiny request.
 * If no key is sent in the body, the currently effective key is tested.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { apiKey?: string };
  let apiKey = (body.apiKey || "").trim();

  if (!apiKey) {
    apiKey = (await getGeminiKey()) || "";
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "គ្មាន API Key សម្រាប់សាកល្បងទេ។ សូមបញ្ចូល Key ជាមុនសិន។",
      },
      { status: 400 }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Reply with exactly: OK",
    });
    const text = (res.text || "").trim();

    if (text) {
      return NextResponse.json({
        ok: true,
        message: "ការតភ្ជាប់ជោគជ័យ! API Key ដំណើរការល្អ ✓",
      });
    }
    return NextResponse.json({
      ok: false,
      message: "Gemini មិនបានឆ្លើយតបទេ។ សូមព្យាយាមម្ដងទៀត។",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    let message: string;
    if (/API key not valid|API_KEY_INVALID|invalid api key|401/i.test(msg)) {
      message = "API Key មិនត្រឹមត្រូវ (Invalid API Key)។ សូមពិនិត្យ Key របស់អ្នកម្ដងទៀត។";
    } else if (/permission|forbidden|denied|403/i.test(msg)) {
      message = "គ្មានសិទ្ធិប្រើប្រាស់ម៉ូដែលនេះជាមួយ Key របស់អ្នកទេ (Permission Denied)។";
    } else if (/quota|resource exhausted|429/i.test(msg)) {
      message = "លើសកូតាប្រើប្រាស់ (Quota Exceeded)។ សូមពិនិត្យក្នុង Google AI Studio។";
    } else {
      message = `ការតភ្ជាប់បរាជ័យ៖ ${msg.slice(0, 160)}`;
    }
    return NextResponse.json({ ok: false, message }, { status: 200 });
  }
}
