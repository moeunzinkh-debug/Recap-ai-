import React, { useMemo } from "react";

function renderInline(text: string, keyBase: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyBase}-${i}`} className="font-semibold text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${keyBase}-${i}`}>{part}</span>;
  });
}

function renderLine(line: string, i: number) {
  const trimmed = line.trim();

  if (!trimmed) {
    return <div key={i} className="h-3" />;
  }

  // Heading level 2 (title)
  if (/^#{2}\s+/.test(trimmed)) {
    return (
      <h2
        key={i}
        className="mt-8 mb-3 flex items-start gap-3 text-xl font-bold text-white sm:text-2xl"
      >
        <span className="mt-1 h-6 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-amber-400 to-red-500" />
        {renderInline(trimmed.replace(/^#{2}\s+/, ""), `h2-${i}`)}
      </h2>
    );
  }

  // Heading level 3 (scene segment with timestamp)
  if (/^#{3}\s+/.test(trimmed)) {
    const content = trimmed.replace(/^#{3}\s+/, "");
    const timeMatch = content.match(/^\[(\d{1,2}:\d{2})\s*[–—-]\s*(\d{1,2}:\d{2})\]/);
    if (timeMatch) {
      return (
        <h3
          key={i}
          className="mt-6 mb-2 flex flex-wrap items-center gap-2 text-base font-bold text-slate-100 sm:text-lg"
        >
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-2.5 py-1 font-mono text-xs font-semibold text-red-300 ring-1 ring-red-500/30">
            ▶ {timeMatch[1]} – {timeMatch[2]}
          </span>
          <span>{renderInline(content.slice(timeMatch[0].length), `h3-${i}`)}</span>
        </h3>
      );
    }
    return (
      <h3 key={i} className="mt-6 mb-2 text-base font-bold text-slate-100 sm:text-lg">
        {renderInline(content, `h3-${i}`)}
      </h3>
    );
  }

  // Bullet list
  if (/^[-•*]\s+/.test(trimmed)) {
    return (
      <p key={i} className="mb-1.5 pl-4 text-[15px] leading-relaxed text-slate-300">
        <span className="mr-2 text-amber-400">•</span>
        {renderInline(trimmed.replace(/^[-•*]\s+/, ""), `li-${i}`)}
      </p>
    );
  }

  // Regular paragraph
  return (
    <p key={i} className="mb-2.5 text-[15px] leading-[1.9] text-slate-300">
      {renderInline(trimmed, `p-${i}`)}
    </p>
  );
}

export default function ScriptRenderer({
  script,
  streaming = false,
}: {
  script: string;
  streaming?: boolean;
}) {
  const lines = useMemo(() => script.split("\n"), [script]);

  return (
    <div className="relative">
      {lines.map((line, i) => renderLine(line, i))}
      {streaming && (
        <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-amber-400 align-middle" />
      )}
    </div>
  );
}
