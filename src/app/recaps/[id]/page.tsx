import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  ArrowLeft,
  Clock,
  FileVideo,
  Layers,
  CalendarDays,
  HardDrive,
  Sparkles,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { db } from "@/db";
import { recaps } from "@/db/schema";
import { formatBytes, formatDuration } from "@/lib/constants";
import ScriptRenderer from "@/components/ScriptRenderer";
import CopyButton from "@/components/CopyButton";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) return { title: "រកមិនឃើញស្គ្រីប" };

  const [row] = await db.select().from(recaps).where(eq(recaps.id, id)).limit(1);
  return {
    title: row?.title ? `${row.title} — ស្គ្រីបសម្រាយរឿង` : "ស្គ្រីបសម្រាយរឿង",
  };
}

export default async function RecapDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) notFound();

  const [row] = await db.select().from(recaps).where(eq(recaps.id, id)).limit(1);

  if (!row) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href="/history"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-amber-300"
      >
        <ArrowLeft className="h-4 w-4" /> ត្រឡប់ទៅប្រវត្តិស្គ្រីប
      </Link>

      {/* Header */}
      <div className="mt-5 overflow-hidden rounded-3xl bg-slate-900/80 ring-1 ring-slate-800">
        <div className="border-b border-slate-800 bg-gradient-to-r from-amber-400/10 via-red-500/10 to-transparent px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold leading-snug text-white sm:text-2xl">
                {row.title || row.fileName}
              </h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                <FileVideo className="h-4 w-4 text-amber-400" />
                <span className="truncate">{row.fileName}</span>
              </p>
            </div>
            {row.status === "done" && row.script && <CopyButton text={row.script} />}
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-1.5 text-slate-300 ring-1 ring-slate-700">
              <Clock className="h-3.5 w-3.5 text-amber-400" /> {formatDuration(row.durationSec)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-1.5 text-slate-300 ring-1 ring-slate-700">
              <Layers className="h-3.5 w-3.5 text-amber-400" /> {row.frameCount} Frames វិភាគ
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-1.5 text-slate-300 ring-1 ring-slate-700">
              <HardDrive className="h-3.5 w-3.5 text-amber-400" /> {formatBytes(row.fileSize)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-1.5 text-slate-300 ring-1 ring-slate-700">
              <CalendarDays className="h-3.5 w-3.5 text-amber-400" />
              {new Date(row.createdAt).toLocaleString("km-KH", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/10 px-3 py-1.5 font-semibold text-amber-300 ring-1 ring-amber-400/30">
              <Sparkles className="h-3.5 w-3.5" /> {row.model}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-7 sm:px-8">
          {row.status === "processing" && (
            <div className="flex items-center gap-3 rounded-2xl bg-amber-500/10 px-5 py-4 text-amber-200 ring-1 ring-amber-500/30">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm">
                ស្គ្រីបកំពុងត្រូវបានបង្កើត... សូមធ្វើរយៈពេលខ្លី រួចធ្វើឲ្យទំព័រស្រស់ឡើងវិញ (Refresh)។
              </p>
            </div>
          )}

          {row.status === "failed" && (
            <div className="flex items-start gap-3 rounded-2xl bg-red-500/10 px-5 py-4 text-red-200 ring-1 ring-red-500/30">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-bold">ការវិភាគបរាជ័យ</p>
                <p className="mt-1 text-sm opacity-90">{row.error || "មានបញ្ហាមិនបានរំពឹងទុក។"}</p>
                <Link
                  href="/#uploader"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300 hover:underline"
                >
                  ព្យាយាមម្ដងទៀត →
                </Link>
              </div>
            </div>
          )}

          {row.status === "done" && row.script ? (
            <ScriptRenderer script={row.script} />
          ) : null}
        </div>
      </div>
    </main>
  );
}
