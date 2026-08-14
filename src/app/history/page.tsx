import Link from "next/link";
import { desc } from "drizzle-orm";
import {
  FileVideo,
  Clock,
  Layers,
  CalendarDays,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Clapperboard,
  Film,
} from "lucide-react";
import { db } from "@/db";
import { recaps } from "@/db/schema";
import { formatBytes, formatDuration } from "@/lib/constants";
import ClearHistoryButton from "@/components/ClearHistoryButton";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "ប្រវត្តិស្គ្រីប — ស្គ្រីបសម្រាយរឿង",
};

const statusBadge: Record<
  string,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  done: {
    label: "រួចរាល់",
    className: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    icon: CheckCircle2,
  },
  processing: {
    label: "កំពុងដំណើរការ",
    className: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    icon: Loader2,
  },
  failed: {
    label: "បរាជ័យ",
    className: "bg-red-500/15 text-red-300 ring-red-500/30",
    icon: AlertTriangle,
  },
};

export default async function HistoryPage() {
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Library</p>
          <h1 className="mt-1.5 text-2xl font-extrabold text-white sm:text-3xl">ប្រវត្តិស្គ្រីបសម្រាយរឿង</h1>
          <p className="mt-2 text-sm text-slate-400">
            ស្គ្រីបទាំងអស់ដែលបានបង្កើត រក្សាទុកក្នុងប្រព័ន្ធ។
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <ClearHistoryButton hasItems={rows.length > 0} />
          <Link
            href="/#uploader"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-red-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-[0_8px_30px_rgba(245,158,11,0.3)] transition hover:brightness-110"
          >
            <Film className="h-4 w-4" /> បង្កើតស្គ្រីបថ្មី
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-700 bg-slate-900/50 px-6 py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 ring-1 ring-slate-700">
            <Clapperboard className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-white">មិនទាន់មានស្គ្រីបនៅឡើយទេ</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            បញ្ជូនវីដេអូដំបូងរបស់អ្នក រួចស្គ្រីបសម្រាយរឿងជាភាសាខ្មែរនឹងបង្ហាញនៅទីនេះ។
          </p>
          <Link
            href="/#uploader"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:brightness-110"
          >
            ចាប់ផ្ដើមឥឡូវនេះ <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((r) => {
            const badge = statusBadge[r.status] ?? statusBadge.failed;
            const Icon = badge.icon;
            return (
              <Link
                key={r.id}
                href={`/recaps/${r.id}`}
                className="group rounded-2xl bg-slate-900/70 p-5 ring-1 ring-slate-800 transition hover:-translate-y-0.5 hover:ring-amber-400/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-white">
                      {r.title || r.fileName}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-400">
                      <FileVideo className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{r.fileName}</span>
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${badge.className}`}
                  >
                    <Icon
                      className={`h-3 w-3 ${r.status === "processing" ? "animate-spin" : ""}`}
                    />
                    {badge.label}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-400" /> {formatDuration(r.durationSec)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-amber-400" /> {r.frameCount} Frames
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-amber-400" />
                    {new Date(r.createdAt).toLocaleDateString("km-KH", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
                  <span className="text-[11px] text-slate-500">
                    {formatBytes(r.fileSize)} • {r.model}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 transition group-hover:gap-2">
                    មើលស្គ្រីប <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
