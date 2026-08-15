"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import {
  getAnalysisState,
  subscribeAnalysis,
  isBusyPhase,
} from "@/lib/analysisStore";

/**
 * A slim, app-wide banner that stays visible across every page while a recap
 * is generating — so the user can navigate freely without losing track of the
 * running process.
 */
export default function ProcessingBanner() {
  const state = useSyncExternalStore(
    subscribeAnalysis,
    getAnalysisState,
    getAnalysisState
  );
  const busy = isBusyPhase(state.phase);

  if (!busy && state.phase !== "done") return null;
  if (state.phase === "done" && !state.recapId) return null;

  if (busy) {
    return (
      <div className="border-b border-amber-500/20 bg-amber-500/10 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-2 text-sm text-amber-200 sm:px-6">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span className="min-w-0 truncate font-medium">
            កំពុងបង្កើតស្គ្រីបសម្រាយ... ដំណើរការមិនឈប់ទេ ទោះអ្នកចូលមើលទំព័រផ្សេងក៏ដោយ។
          </span>
          <Link
            href="/#uploader"
            className="ml-auto inline-flex shrink-0 items-center gap-1 font-semibold text-amber-300 transition hover:text-amber-100"
          >
            មើល <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-emerald-500/20 bg-emerald-500/10 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-2 text-sm text-emerald-200 sm:px-6">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="min-w-0 truncate font-medium">
          ស្គ្រីបបានបង្កើតរួចរាល់!
        </span>
        <Link
          href={`/recaps/${state.recapId}`}
          className="ml-auto inline-flex shrink-0 items-center gap-1 font-semibold text-emerald-300 transition hover:text-emerald-100"
        >
          មើលស្គ្រីប <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
