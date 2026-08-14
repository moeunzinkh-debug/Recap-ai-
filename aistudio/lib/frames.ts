import { FRAME_WIDTH, JPEG_QUALITY, MAX_FRAMES } from "./constants";

export interface ExtractedFrame {
  base64: string; // JPEG without the data: prefix
  timeSec: number;
  index: number;
}

export interface ExtractedFrames {
  frames: ExtractedFrame[];
  intervalSec: number;
  count: number;
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("មិនអាចអានវីដេអូនៅចំណុច " + time.toFixed(1) + " វិនាទីបានទេ។"));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.currentTime = Math.min(time, Math.max(0, video.duration - 0.05));
  });
}

/**
 * Extracts evenly-spaced JPEG frames from a video entirely in the browser
 * using an offscreen <video> element + <canvas>. This replaces the
 * FFmpeg-based server extraction so the app can run on Google AI Studio.
 */
export async function extractFrames(
  file: File,
  durationSec: number,
  onProgress?: (done: number, total: number) => void
): Promise<ExtractedFrames> {
  const interval = Math.max(2.5, durationSec / MAX_FRAMES);
  const total = Math.min(MAX_FRAMES, Math.max(1, Math.floor(durationSec / interval)));

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(
          new Error(
            "Browser មិនអាចបើកវីដេអូនេះបានទេ។ សូមប្រើទ្រង់ទ្រាយ MP4 (H.264) ឬ WebM។"
          )
        );
      };
      const cleanup = () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onError);
      };
      video.addEventListener("loadedmetadata", onLoaded, { once: true });
      video.addEventListener("error", onError, { once: true });
    });

    const vw = video.videoWidth || FRAME_WIDTH;
    const vh = video.videoHeight || Math.round((FRAME_WIDTH * 9) / 16);
    const width = Math.min(FRAME_WIDTH, vw);
    const height = Math.max(2, Math.round((width * vh) / vw / 2) * 2);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) throw new Error("Canvas 2D context is not available");

    const frames: ExtractedFrame[] = [];
    for (let index = 0; index < total; index++) {
      const time = index * interval;
      await seekTo(video, time);
      // Give the decoder one paint tick to settle on some browsers.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      const base64 = dataUrl.split(",")[1] ?? "";
      if (!base64) throw new Error("បរាជ័យក្នុងការដក Frame ពីវីដេអូ។");
      frames.push({ base64, timeSec: time, index });
      onProgress?.(index + 1, total);
    }

    if (frames.length === 0) {
      throw new Error("មិនអាចដក Frames ពីវីដេអូនេះបានទេ។");
    }

    return { frames, intervalSec: interval, count: frames.length };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
