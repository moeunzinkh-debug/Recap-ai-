import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { recaps } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: recaps.id,
        fileName: recaps.fileName,
        fileSize: recaps.fileSize,
        durationSec: recaps.durationSec,
        frameCount: recaps.frameCount,
        model: recaps.model,
        title: recaps.title,
        status: recaps.status,
        error: recaps.error,
        createdAt: recaps.createdAt,
      })
      .from(recaps)
      .orderBy(desc(recaps.createdAt))
      .limit(100);

    return NextResponse.json({ recaps: rows });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load recaps" },
      { status: 500 }
    );
  }
}

/** Deletes ALL recap history (clear history). */
export async function DELETE() {
  try {
    const result = await db.delete(recaps);
    const deleted = result.rowCount ?? 0;
    return NextResponse.json({
      ok: true,
      deleted,
      message:
        deleted > 0
          ? `បានលុបស្គ្រីបទាំងអស់ចំនួន ${deleted} រួចរាល់។`
          : "ប្រវត្តិទទេ — មិនមានអ្វីត្រូវលុបទេ។",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to clear recaps",
      },
      { status: 500 }
    );
  }
}
