import { extractFrames } from "./frames";
import { GeminiError, streamRecapScript } from "./gemini";
import { saveRecap, type RecapRecord } from "./storage";

/**
 * Analysis lives at module scope instead of inside UploadZone. Switching
 * between the Create, History, and API Key tabs therefore does not cancel an
 * in-flight frame extraction or Gemini stream.
 */
export type AnalysisPhase = "idle" | "processing" | "streaming" | "done" | "error";

export interface AnalysisState {
  phase: AnalysisPhase;
  stageMessage: string;
  script: string;
  recapId: string | null;
  title: string | null;
  model: string | null;
  error: string | null;
}

function idleState(): AnalysisState {
  return {
    phase: "idle",
    stageMessage: "",
    script: "",
    recapId: null,
    title: null,
    model: null,
    error: null,
  };
}

function extractTitle(script: string): string {
  const match = script.match(/^##\s*ចំណងជើង៖?\s*(.+)$/m);
  return (match?.[1] ?? "").trim() || "ស្គ្រីបសម្រាយរឿង";
}

let state = idleState();
let runId = 0;
let abortController: AbortController | null = null;
const listeners = new Set<() => void>();

function setState(
  update: Partial<AnalysisState> | ((previous: AnalysisState) => AnalysisState)
): void {
  state = typeof update === "function" ? update(state) : { ...state, ...update };
  for (const listener of listeners) listener();
}

export function subscribeAnalysis(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAnalysisState(): AnalysisState {
  return state;
}

export function isBusyPhase(phase: AnalysisPhase): boolean {
  return phase === "processing" || phase === "streaming";
}

/** Start an analysis that survives React component unmounts and tab changes. */
export function startAnalysis(file: File, durationSec: number, model: string): void {
  if (isBusyPhase(state.phase)) return;

  const currentRun = ++runId;
  const controller = new AbortController();
  abortController = controller;

  setState({
    phase: "processing",
    stageMessage: "កំពុងដក Frames ពីវីដេអូក្នុង Browser...",
    script: "",
    recapId: null,
    title: null,
    model,
    error: null,
  });

  void (async () => {
    try {
      const { frames, intervalSec } = await extractFrames(file, durationSec, (done, total) => {
        if (currentRun !== runId || controller.signal.aborted) return;
        setState((previous) => ({
          ...previous,
          stageMessage: `កំពុងដក Frames... ${done}/${total}`,
        }));
      });

      if (currentRun !== runId || controller.signal.aborted) return;

      setState((previous) => ({
        ...previous,
        phase: "streaming",
        stageMessage: `ផ្ញើ ${frames.length} Frames ទៅ Gemini — កំពុងសរសេរស្គ្រីបសម្រាយរឿងជាភាសាខ្មែរ...`,
      }));

      let script = "";
      for await (const chunk of streamRecapScript(
        {
          fileName: file.name,
          durationSec,
          frames,
          intervalSec,
          model,
        },
        controller.signal
      )) {
        if (currentRun !== runId || controller.signal.aborted) return;
        script += chunk;
        setState((previous) => ({
          ...previous,
          phase: "streaming",
          script: previous.script + chunk,
        }));
      }

      if (currentRun !== runId || controller.signal.aborted) return;
      if (!script.trim()) {
        throw new GeminiError("Gemini មិនបានផ្ដល់លទ្ធផលទេ។ សូមព្យាយាមម្ដងទៀត។");
      }

      const title = extractTitle(script);
      const record: RecapRecord = {
        id: crypto.randomUUID(),
        title,
        fileName: file.name,
        durationSec,
        frameCount: frames.length,
        model,
        script,
        createdAt: new Date().toISOString(),
      };
      saveRecap(record);

      setState((previous) => ({
        ...previous,
        phase: "done",
        recapId: record.id,
        title,
        stageMessage: "ស្គ្រីបបានបង្កើតរួចរាល់! 🎉",
      }));
    } catch (error) {
      if (currentRun !== runId || controller.signal.aborted) return;
      const message =
        error instanceof Error
          ? error.message
          : "មានបញ្ហាមិនស្គាល់។ សូមព្យាយាមម្ដងទៀត។";
      setState((previous) => ({ ...previous, phase: "error", error: message }));
    } finally {
      if (currentRun === runId) abortController = null;
    }
  })();
}

/** Explicitly cancel the active analysis and clear the shared result. */
export function resetAnalysis(): void {
  runId += 1;
  abortController?.abort();
  abortController = null;
  state = idleState();
  for (const listener of listeners) listener();
}
