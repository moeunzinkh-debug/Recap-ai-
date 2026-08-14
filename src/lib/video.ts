import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";
import { FRAME_WIDTH, MAX_FRAMES } from "@/lib/constants";

const execFileAsync = promisify(execFile);

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 5 * 60_000 },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr || err.message));
          return;
        }
        resolve(stdout);
      }
    );
  });
}

export async function probeDuration(videoPath: string): Promise<number> {
  if (!ffprobe?.path) throw new Error("ffprobe binary not found");
  const { stdout } = await execFileAsync(
    ffprobe.path,
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      videoPath,
    ],
    { encoding: "utf8", timeout: 30_000 }
  );
  const seconds = parseFloat(stdout.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error("Could not read video duration");
  }
  return seconds;
}

export interface ExtractedFrames {
  frames: { base64: string; timeSec: number; index: number }[];
  intervalSec: number;
  count: number;
}

/**
 * Extracts evenly-spaced JPEG frames from a video using ffmpeg-static.
 * Frames are scaled to FRAME_WIDTH and returned as base64 strings
 * together with their approximate timestamp inside the video.
 */
export async function extractFrames(
  videoPath: string,
  durationSec: number,
  onProgress?: (done: number, total: number) => void
): Promise<ExtractedFrames> {
  if (!ffmpegPath) throw new Error("ffmpeg binary not found");

  const interval = Math.max(2.5, durationSec / MAX_FRAMES);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "recap-frames-"));

  try {
    const fps = `fps=1/${interval}`;
    const scale = `scale=${FRAME_WIDTH}:-2`;
    const pattern = path.join(dir, "frame_%04d.jpg");

    await run(ffmpegPath, [
      "-y",
      "-i",
      videoPath,
      "-vf",
      `${fps},${scale}`,
      "-q:v",
      "4",
      "-frames:v",
      String(MAX_FRAMES),
      pattern,
    ]);

    const files = (await fs.readdir(dir))
      .filter((file) => file.endsWith(".jpg"))
      .sort();

    if (files.length === 0) {
      throw new Error("No frames could be extracted from the video");
    }

    const frames: ExtractedFrames["frames"] = [];
    const total = files.length;
    for (let index = 0; index < files.length; index++) {
      const buffer = await fs.readFile(path.join(dir, files[index]));
      frames.push({
        base64: buffer.toString("base64"),
        timeSec: index * interval,
        index,
      });
      onProgress?.(index + 1, total);
    }

    return { frames, intervalSec: interval, count: frames.length };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
