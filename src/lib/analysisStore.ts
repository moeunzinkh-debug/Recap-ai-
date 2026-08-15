// A module-level singleton that owns the in-flight analysis request (XHR).
//
// It lives OUTSIDE React so that client-side navigation (e.g. opening the
// history page or settings while a script is still generating) never unmounts
// the component that owns the upload and therefore never aborts the request.
// The analysis keeps running in the background and its result is still saved
// to the database.

export type AnalysisPhase =
  | "idle"
  | "uploading"
  | "processing"
  | "streaming"
  | "done"
  | "error";

export interface AnalysisState {
  phase: AnalysisPhase;
  uploadPercent: number;
  stageMessage: string;
  script: string;
  recapId: string | null;
  title: string | null;
  error: string | null;
}

interface SSEEvent {
  event: string;
  data: string;
}

// Proxies and servers may terminate SSE events with "\n\n", "\r\n\r\n", or
// "\r\r". Recognising only "\n\n" leaves every event stuck in the buffer, so
// the stream appears to produce nothing at all.
const SSE_DELIMITERS = ["\r\n\r\n", "\n\n", "\r\r"] as const;

function findDelimiter(buf: string): { index: number; length: number } | null {
  let index = -1;
  let length = 0;
  for (const delimiter of SSE_DELIMITERS) {
    const found = buf.indexOf(delimiter);
    if (found !== -1 && (index === -1 || found < index)) {
      index = found;
      length = delimiter.length;
    }
  }
  return index === -1 ? null : { index, length };
}

function parseSSE(buf: string): { events: SSEEvent[]; rest: string } {
  const events: SSEEvent[] = [];
  let rest = buf;
  let delimiter = findDelimiter(rest);
  while (delimiter) {
    const raw = rest.slice(0, delimiter.index);
    rest = rest.slice(delimiter.index + delimiter.length);
    let event = "message";
    const data: string[] = [];
    for (const line of raw.split(/\r\n|\n|\r/)) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      // Keep newlines between data lines instead of concatenating them, so
      // multi-line script chunks are not silently glued together.
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    const payload = data.join("\n").trim();
    if (payload) events.push({ event, data: payload });
    delimiter = findDelimiter(rest);
  }
  return { events, rest };
}

function idleState(): AnalysisState {
  return {
    phase: "idle",
    uploadPercent: 0,
    stageMessage: "",
    script: "",
    recapId: null,
    title: null,
    error: null,
  };
}

let state: AnalysisState = idleState();
let xhr: XMLHttpRequest | null = null;
const listeners = new Set<() => void>();

function setState(
  updater: Partial<AnalysisState> | ((prev: AnalysisState) => AnalysisState)
): void {
  state = typeof updater === "function" ? updater(state) : { ...state, ...updater };
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
  return phase === "uploading" || phase === "processing" || phase === "streaming";
}

function handleEvents(events: SSEEvent[]): void {
  for (const ev of events) {
    // A malformed payload must not abort the whole stream.
    let parsed: unknown;
    try {
      parsed = JSON.parse(ev.data);
    } catch {
      continue;
    }
    if (ev.event === "progress") {
      const data = parsed as { stage: string; message: string };
      setState((p) => ({
        ...p,
        phase: data.stage === "gemini" ? "streaming" : "processing",
        stageMessage: data.message,
      }));
    } else if (ev.event === "chunk") {
      const data = parsed as { text: string };
      setState((p) => ({
        ...p,
        phase: "streaming",
        script: p.script + data.text,
      }));
    } else if (ev.event === "done") {
      const data = parsed as { id: string; title: string };
      setState((p) => ({
        ...p,
        phase: "done",
        recapId: data.id,
        title: data.title,
        stageMessage: "ស្គ្រីបបានបង្កើតរួចរាល់! 🎉",
      }));
    } else if (ev.event === "error") {
      const data = parsed as { message: string };
      setState((p) => ({ ...p, phase: "error", error: data.message }));
    }
  }
}

/**
 * Starts the analysis and keeps the request alive at module scope, so it is
 * not tied to any React component lifecycle.
 */
export function startAnalysis(file: File, model: string): void {
  if (xhr || isBusyPhase(state.phase)) return;

  const form = new FormData();
  form.append("video", file);
  form.append("model", model);

  const req = new XMLHttpRequest();
  xhr = req;
  let buffer = "";
  let receivedLength = 0;
  let terminalEventReceived = false;

  setState({
    phase: "uploading",
    uploadPercent: 0,
    stageMessage: "កំពុងបញ្ជូនឯកសារទៅម៉ាស៊ីនបម្រើ...",
    script: "",
    recapId: null,
    title: null,
    error: null,
  });

  req.open("POST", "/api/analyze");

  req.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const pct = Math.round((e.loaded / e.total) * 100);
      setState((p) => ({ ...p, uploadPercent: pct }));
    }
  };

  req.onreadystatechange = () => {
    const text = req.responseText || "";
    if (text.length > receivedLength) {
      buffer += text.slice(receivedLength);
      receivedLength = text.length;
      const { events, rest } = parseSSE(buffer);
      buffer = rest;
      terminalEventReceived ||= events.some(
        (event) => event.event === "done" || event.event === "error"
      );
      handleEvents(events);
    }
  };

  req.onerror = () => {
    setState((p) => ({
      ...p,
      phase: "error",
      error: "បរាជ័យក្នុងការផ្ញើឯកសារ។ សូមពិនិត្យបណ្ដាញ ហើយព្យាយាមម្ដងទៀត។",
    }));
  };

  req.onload = () => {
    if (!terminalEventReceived) {
      setState((p) => ({
        ...p,
        phase: "error",
        error:
          req.status >= 400
            ? `ម៉ាស៊ីនបម្រើឆ្លើយតបដោយកំហុស (${req.status})។ សូមព្យាយាមម្ដងទៀត។`
            : "ការតភ្ជាប់បានបញ្ចប់មុនពេលទទួលលទ្ធផល។ សូមព្យាយាមម្ដងទៀត។",
      }));
    }
  };

  req.onloadend = () => {
    if (xhr === req) xhr = null;
  };

  req.send(form);
}

/** Explicitly cancels any in-flight analysis and clears the shared state. */
export function resetAnalysis(): void {
  xhr?.abort();
  xhr = null;
  state = idleState();
  for (const listener of listeners) listener();
}
