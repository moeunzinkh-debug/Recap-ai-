import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/crypto";
import { GEMINI_KEY_NAME, getGeminiKeyInfo } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAME_REGEX = /^[A-Za-z0-9_]{1,64}$/;

export async function GET() {
  try {
    const keys = await db
      .select()
      .from(apiKeys)
      .orderBy(asc(apiKeys.createdAt));

    const { source } = await getGeminiKeyInfo();

    return NextResponse.json({
      keys: keys.map((k) => {
        let masked = "••••••••";
        try {
          masked = maskSecret(decryptSecret(k.valueEncrypted));
        } catch {
          // corrupted entry
        }
        return {
          id: k.id,
          name: k.name,
          masked,
          createdAt: k.createdAt,
          updatedAt: k.updatedAt,
        };
      }),
      keySource: source,
      geminiConfigured: source !== "none",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      apiKey?: string;
    };

    const name = (body.name || GEMINI_KEY_NAME).trim();
    const apiKey = (body.apiKey || "").trim();

    if (!NAME_REGEX.test(name)) {
      return NextResponse.json(
        { ok: false, message: "ឈ្មោះ Key ត្រូវមានតែអក្សរ លេខ ឬ _ ប៉ុណ្ណោះ (១–៦៤ តួ)។" },
        { status: 400 }
      );
    }
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, message: "សូមបញ្ចូល API Key ជាមុនសិន។" },
        { status: 400 }
      );
    }
    if (apiKey.length < 8) {
      return NextResponse.json(
        { ok: false, message: "API Key ខ្លីពេក — មិនអាចត្រឹមត្រូវបានទេ។" },
        { status: 400 }
      );
    }

    const encrypted = encryptSecret(apiKey);

    const [existing] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.name, name))
      .limit(1);

    if (existing) {
      await db
        .update(apiKeys)
        .set({ valueEncrypted: encrypted, updatedAt: new Date() })
        .where(eq(apiKeys.id, existing.id));
    } else {
      await db.insert(apiKeys).values({ name, valueEncrypted: encrypted });
    }

    return NextResponse.json({
      ok: true,
      message: `បានរក្សាទុក API Key "${name}" ដោយជោគជ័យ ✓`,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Failed to save key" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const name = url.searchParams.get("name") || GEMINI_KEY_NAME;

    const result = await db.delete(apiKeys).where(eq(apiKeys.name, name));
    const deleted = result.rowCount ?? 0;

    return NextResponse.json({
      ok: true,
      message:
        deleted > 0
          ? `បានលុប API Key "${name}" រួចរាល់។`
          : `រកមិនឃើញ Key "${name}" ទេ។`,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Failed to delete key" },
      { status: 500 }
    );
  }
        }
