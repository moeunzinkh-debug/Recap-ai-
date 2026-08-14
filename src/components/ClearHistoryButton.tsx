"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

export default function ClearHistoryButton({ hasItems }: { hasItems: boolean }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const clear = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/recaps", { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.message || "បរាជ័យក្នុងការសម្អាតប្រវត្តិ។");
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "បរាជ័យក្នុងការសម្អាតប្រវត្តិ។");
    } finally {
      setDeleting(false);
    }
  };

  if (!hasItems) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 ring-1 ring-red-500/30 transition hover:bg-red-500/20"
      >
        <Trash2 className="h-4 w-4" />
        សម្អាតប្រវត្តិ
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl bg-slate-900 ring-1 ring-slate-700 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 ring-1 ring-red-500/30">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </span>
                <h3 className="text-lg font-bold text-white">សម្អាតប្រវត្តិស្គ្រីប?</h3>
              </div>
              <button
                type="button"
                onClick={() => !deleting && setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="បិទ"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm leading-relaxed text-slate-300">
                តើអ្នកប្រាកដទេដែលចង់លុប{" "}
                <span className="font-bold text-red-300">ស្គ្រីបសម្រាយរឿងទាំងអស់</span>{" "}
                ចេញពីប្រព័ន្ធ?
              </p>
              <p className="mt-2 text-xs text-slate-500">
                ⚠️ សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។
              </p>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 border-t border-slate-800 bg-slate-950/40 px-6 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 ring-1 ring-slate-700 transition hover:bg-slate-700 disabled:opacity-50"
              >
                បោះបង់
              </button>
              <button
                type="button"
                onClick={clear}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_30px_rgba(239,68,68,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {deleting ? "កំពុងលុប..." : "លុបទាំងអស់"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
