import React, { useCallback, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FileVideo,
  History,
  Trash2,
} from "lucide-react";
import ScriptRenderer from "./ScriptRenderer";
import { formatDuration } from "../lib/constants";
import {
  clearRecaps,
  deleteRecap,
  listRecaps,
  type RecapRecord,
} from "../lib/storage";

export default function HistoryPanel({
  version,
  onChanged,
}: {
  version: number;
  onChanged: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recaps = listRecaps(); // re-read whenever `version` changes

  const copy = useCallback(async (r: RecapRecord) => {
    try {
      await navigator.clipboard.writeText(r.script);
      setCopiedId(r.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  }, []);

  if (recaps.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/60 p-8 text-center ring-1 ring-slate-800">
        <History className="mx-auto h-8 w-8 text-slate-600" />
        <p className="mt-3 text-sm font-medium text-slate-400">
          មិនទាន់មានប្រវត្តិស្គ្រីបនៅឡើយទេ
        </p>
        <p className="mt-1 text-xs text-slate-500">
          ស្គ្រីបដែលបង្កើតរួច នឹងរក្សាទុកនៅទីនេះ (ក្នុង Browser របស់អ្នក)។
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-white">
          <History className="h-4 w-4 text-amber-400" />
          ប្រវត្តិស្គ្រីប ({recaps.length})
        </p>
        <button
          type="button"
          onClick={() => {
            if (confirm("លុបប្រវត្តិទាំងអស់?")) {
              clearRecaps();
              setOpenId(null);
              onChanged();
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-red-300 ring-1 ring-slate-700 transition hover:bg-red-500/10 hover:ring-red-500/40"
        >
          <Trash2 className="h-3.5 w-3.5" /> លុបទាំងអស់
        </button>
      </div>

      {recaps.map((r) => {
        const open = openId === r.id;
        return (
          <div
            key={r.id}
            className="overflow-hidden rounded-2xl bg-slate-900/60 ring-1 ring-slate-800 transition hover:ring-slate-700"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : r.id)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <FileVideo className="h-8 w-8 shrink-0 text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{r.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                  <span className="truncate">{r.fileName}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatDuration(r.durationSec)}
                  </span>
                  <span>{r.frameCount} frames</span>
                  <span className="text-slate-500">
                    {new Date(r.createdAt).toLocaleString("km-KH")}
                  </span>
                </p>
              </div>
              {open ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              )}
            </button>

            {open && (
              <div className="border-t border-slate-800">
                <div className="flex flex-wrap justify-end gap-2 px-4 pt-3">
                  <button
                    type="button"
                    onClick={() => copy(r)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-slate-700 transition hover:bg-slate-700"
                  >
                    {copiedId === r.id ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedId === r.id ? "បានចម្លង!" : "ចម្លង"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteRecap(r.id);
                      if (openId === r.id) setOpenId(null);
                      onChanged();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-red-300 ring-1 ring-slate-700 transition hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> លុប
                  </button>
                </div>
                <div className="max-h-[480px] overflow-y-auto p-5">
                  <ScriptRenderer script={r.script} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
