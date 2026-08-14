import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { recaps } from "@/db/schema";
import { extractFrames, probeDuration } from "@/lib/video";
import { streamRecapScript, GeminiError } from "@/lib/gemini";
import {
  MODEL,
  MAX_FILE_SIZE,
  MAX_DURATION_SEC,
  MIN_DURATION_SEC,
  VIDEO_EXTENSIONS,
  isKnownGeminiModel,
  GEMINI_MODELS,
} from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 600; // allow long-running analysis (10 min)

const ALLOWED_MIME_PREFIXES = ["video/"];

function sse(data: string, event?: string): Uint8Array {
  const payload = event ? `event: ${event}\ndata: ${data}\n\n` : `data: ${data}\n\n`;
  return new TextEncoder().encode(payload);
}

export async function POST(request: Request) {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown, event?: string) => {
        try {
          controller.enqueue(sse(JSON.stringify(data), event));
        } catch {
          // stream closed
        }
      };

      let tmpVideo: string | null = null;
      let recordId: string | null = null;

      try {
        const contentLength = Number(request.headers.get("content-length") || 0);
        if (
          Number.isFinite(contentLength) &&
          contentLength > MAX_FILE_SIZE + 1024 * 1024
        ) {
          throw new Error("ទំហំឯកសារដែលបានផ្ញើធំពេក — អតិបរមា 100MB។");
        }

        const formData = await request.formData();
        const file = formData.get("video");

        // Chosen Gemini model (validated against the known list)
        const requestedModel = String(formData.get("model") || "").trim();
        const model = isKnownGeminiModel(requestedModel) ? requestedModel : MODEL;

        if (!(file instanceof File)) {
          throw new Error("សូមជ្រើសរើសឯកសារវីដេអូជាមុនសិន។");
        }

        if (file.size <= 0) {
          throw new Error("ឯកសារវីដេអូទទេ មិនអាចវិភាគបានទេ។");
        }

        if (file.size > MAX_FILE_SIZE) {
          throw new Error(
            `ឯកសារធំជាង 100MB (${(file.size / (1024 * 1024)).toFixed(1)}MB) — សូមជ្រើសរើសវីដេអូតូចជាងនេះ។`
          );
        }

        const lowerType = file.type.toLowerCase();
        const lowerName = file.name.toLowerCase();
        const isVideo =
          ALLOWED_MIME_PREFIXES.some((p) => lowerType.startsWith(p)) ||
          (lowerType === "" || lowerType === "application/octet-stream"
            ? VIDEO_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
            : false);
        if (!isVideo) {
          throw new Error("ឯកសារនេះមិនមែនជាវីដេអូទេ (ទទួលតែ MP4, WebM, MOV, MKV...)។");
        }

        send({ stage: "probe", message: "កំពុងទទួលឯកសារ និងពិនិត្យវីដេអូ..." }, "progress");

        // Save the uploaded video to a temp file
        const fileExtension = path.extname(file.name).toLowerCase();
        const ext = VIDEO_EXTENSIONS.some((candidate) => candidate === fileExtension)
          ? fileExtension
          : ".mp4";
        tmpVideo = path.join(os.tmpdir(), `recap-video-${randomUUID()}${ext}`);
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(tmpVideo, buffer);

        // Always verify duration server-side; client metadata is not trusted.
        let durationSec: number;
        try {
          durationSec = await probeDuration(tmpVideo);
        } catch {
          throw new Error(
            "មិនអាចអានព័ត៌មានវីដេអូនេះបានទេ។ ឯកសារអាចខូច ឬទ្រង់ទ្រាយមិនគាំទ្រ។"
          );
        }

        if (durationSec > MAX_DURATION_SEC + 1) {
          throw new Error(
            `វីដេអូវែងជាង 10 នាទី (${Math.round(durationSec / 60)} នាទី) — សូមកាត់វីដេអូឲ្យខ្លីជាង 10 នាទីសិន។`
          );
        }
        if (durationSec < MIN_DURATION_SEC) {
          throw new Error(
            `វីដេអូខ្លីពេក (ត្រូវការយ៉ាងតិច ${MIN_DURATION_SEC} វិនាទី)។`
          );
        }

        // Create DB record
        const [record] = await db
          .insert(recaps)
          .values({
            fileName: file.name,
            fileSize: file.size,
            durationSec: Math.round(durationSec),
            model,
            status: "processing",
          })
          .returning({ id: recaps.id });
        recordId = record.id;

        send({ stage: "frames", message: `កំពុងដក Frames ពីវីដេអូ (${Math.round(durationSec)} វិនាទី)...` }, "progress");

        const { frames, intervalSec, count } = await extractFrames(tmpVideo, durationSec, (done, total) => {
          if (done % 10 === 0 || done === total) {
            send(
              {
                stage: "frames",
                message: `កំពុងដក Frames... ${done}/${total}`,
                percent: Math.round((done / total) * 100),
              },
              "progress"
            );
          }
        });

        if (count === 0) {
          throw new Error("មិនអាចដក Frames ចេញពីវីដេអូនេះបានទេ។");
        }

        await db
          .update(recaps)
          .set({ frameCount: count })
          .where(eq(recaps.id, record.id));

        const modelLabel =
          GEMINI_MODELS.find((m) => m.id === model)?.label ?? model;

        send(
          {
            stage: "gemini",
            message: `ផ្ញើ ${count} Frames ទៅ ${modelLabel} — កំពុងសរសេរស្គ្រីបសម្រាយរឿងជាភាសាខ្មែរ...`,
          },
          "progress"
        );

        let script = "";
        for await (const chunk of streamRecapScript({
          fileName: file.name,
          durationSec,
          frames,
          intervalSec,
          model,
        })) {
          script += chunk;
          send({ text: chunk }, "chunk");
        }

        script = script.trim();
        if (!script) {
          throw new Error("Gemini មិនបានបង្កើតស្គ្រីបទេ។ សូមព្យាយាមម្ដងទៀត។");
        }

        // Extract a title from the first heading if present
        const titleMatch = script.match(/^#+\s*ចំណងជើង[៖:]\s*(.+)$/m);
        const title = titleMatch?.[1]?.trim() || file.name.replace(/\.[^.]+$/, "");

        await db
          .update(recaps)
          .set({ script, title, status: "done" })
          .where(eq(recaps.id, record.id));

        send({ id: record.id, title, fileName: file.name, model }, "done");
      } catch (err) {
        const message =
          err instanceof GeminiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "មានបញ្ហាមិនបានរំពឹងទុក សូមព្យាយាមម្ដងទៀត។";

        // Try to mark the record as failed if it was created
        if (recordId) {
          try {
            await db
              .update(recaps)
              .set({ status: "failed", error: message })
              .where(eq(recaps.id, recordId));
          } catch {
            // ignore
          }
        }

        send({ message }, "error");
      } finally {
        if (tmpVideo) {
          await fs.rm(tmpVideo, { force: true }).catch(() => {});
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
        }
          
