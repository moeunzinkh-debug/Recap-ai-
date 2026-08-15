import { useSyncExternalStore } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import {
  getAnalysisState,
  isBusyPhase,
  subscribeAnalysis,
} from "../lib/analysisStore";

export default function ProcessingBanner({ onOpen }: { onOpen: () => void }) {
  const state = useSyncExternalStore(
    subscribeAnalysis,
    getAnalysisState,
    getAnalysisState
  );
  const busy = isBusyPhase(state.phase);

  if (!busy && state.phase !== "done") return null;

  return (
    <div
      className={`border-b backdrop-blur ${
        busy
          ? "border-amber-500/20 bg-amber-500/10"
          : "border-emerald-500/20 bg-emerald-500/10"
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-2 text-sm sm:px-6 ${
          busy ? "text-amber-200" : "text-emerald-200"
        }`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        )}
        <span className="min-w-0 truncate font-medium">
          {busy
            ? "កំពុងបង្កើតស្គ្រីប... ដំណើរការមិនឈប់ទេ ទោះអ្នកចូលមើលប្រវត្តិ ឬ API Keys ក៏ដោយ។"
            : "ស្គ្រីបបានបង្កើតរួចរាល់ និងរក្សាទុកក្នុងប្រវត្តិ!"}
        </span>
        <button
          type="button"
          onClick={onOpen}
          className={`ml-auto inline-flex shrink-0 items-center gap-1 font-semibold transition ${
            busy ? "text-amber-300 hover:text-amber-100" : "text-emerald-300 hover:text-emerald-100"
          }`}
        >
          មើល <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
