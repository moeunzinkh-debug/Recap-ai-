import { NextResponse } from "next/server";
import { getGeminiKeyInfo } from "@/lib/gemini";
import { GEMINI_MODELS, MODEL } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { source } = await getGeminiKeyInfo();

  return NextResponse.json({
    geminiConfigured: source !== "none",
    keySource: source, // "db" | "env" | "none"
    defaultModel: MODEL,
    models: GEMINI_MODELS,
    maxFileSizeMB: 100,
    maxDurationMin: 10,
  });
}
