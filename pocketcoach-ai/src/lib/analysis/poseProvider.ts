/**
 * Real pose backend.
 *
 * MediaPipe Pose (`@mediapipe/tasks-vision`) is loaded lazily from the local
 * bundle; only the WASM runtime and the model file are fetched from a CDN.
 * Everything here is wrapped so a failure at *any* step (no network, no WebGL,
 * blocked CDN, unsupported codec) resolves to `null` and the caller falls back
 * to the synthetic athlete — PocketCoach AI is never blocked by the model.
 */
import type { Landmark, PoseFrames, PoseSource } from '@/lib/types';
import { SAMPLE_FPS } from '@/lib/pose/motion';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export interface PoseExtraction {
  frames: PoseFrames;
  source: PoseSource;
  /** how many frames returned more than one body */
  multiPersonFrames: number;
  avgVisibility: number;
  /** true when the model ran but could not find a full body in most frames */
  bodyMissing: boolean;
  detail: string;
}

export type PoseLandmarkerLike = {
  detectForVideo: (video: HTMLVideoElement, timestampMs: number) => { landmarks: Landmark[][]; worldLandmarks: Landmark[][] };
  close: () => void;
};

let cachedLandmarker: PoseLandmarkerLike | null = null;
let loadFailed = false;

export function poseBackendStatus(): 'ready' | 'idle' | 'unavailable' {
  if (cachedLandmarker) return 'ready';
  return loadFailed ? 'unavailable' : 'idle';
}

/**
 * The one landmarker instance, shared between clip analysis and live tracking
 * (MediaPipe keeps per-instance buffers, so a second instance would just double
 * the GPU memory for nothing). Resolves null when the model cannot load —
 * callers degrade, never throw.
 */
export function getSharedLandmarker(): Promise<PoseLandmarkerLike | null> {
  return loadLandmarker();
}

async function loadLandmarker(): Promise<PoseLandmarkerLike | null> {
  if (cachedLandmarker) return cachedLandmarker;
  if (loadFailed) return null;
  try {
    const vision = await import('@mediapipe/tasks-vision');
    const fileset = await vision.FilesetResolver.forVisionTasks(WASM_CDN);
    const landmarker = await vision.PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numPoses: 2,
      minPoseDetectionConfidence: 0.45,
      minPosePresenceConfidence: 0.45,
      minTrackingConfidence: 0.4,
    });
    cachedLandmarker = landmarker as unknown as PoseLandmarkerLike;
    return cachedLandmarker;
  } catch {
    loadFailed = true;
    return null;
  }
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener('seeked', done);
      resolve();
    };
    video.addEventListener('seeked', done);
    video.currentTime = Math.min(time, Math.max(video.duration - 0.05, 0));
  });
}

/**
 * Sample the clip at a fixed rate and run pose estimation on every frame.
 * Returns null whenever a real read is not possible.
 */
export async function extractPoseFromVideo(
  video: HTMLVideoElement,
  onProgress?: (ratio: number) => void,
  budgetMs = 25000,
): Promise<PoseExtraction | null> {
  const landmarker = await loadLandmarker();
  if (!landmarker) return null;

  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  if (!duration || duration < 1) return null;

  const frames: PoseFrames = [];
  const sampleCount = Math.min(Math.round(duration * SAMPLE_FPS), SAMPLE_FPS * 32);
  let multiPersonFrames = 0;
  let visibilitySum = 0;
  let visibilityCount = 0;
  const startedAt = Date.now();

  const wasPaused = video.paused;
  try {
    video.pause();
    for (let i = 0; i < sampleCount; i += 1) {
      if (Date.now() - startedAt > budgetMs) break;
      const time = (i / sampleCount) * duration;
      await seek(video, time);
      const result = landmarker.detectForVideo(video, performance.now());
      if (result.landmarks.length > 1) multiPersonFrames += 1;
      const pose = result.landmarks[0];
      if (pose) {
        frames.push(pose.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility })));
        for (const lm of pose) {
          visibilitySum += lm.visibility ?? 0;
          visibilityCount += 1;
        }
      }
      onProgress?.((i + 1) / sampleCount);
    }
  } catch {
    return null;
  } finally {
    if (!wasPaused) {
      // leave the element rewound for the preview UI
      await seek(video, 0).catch(() => undefined);
    }
  }

  if (frames.length < Math.max(6, sampleCount * 0.25)) {
    return {
      frames,
      source: 'mediapipe',
      multiPersonFrames,
      avgVisibility: 0,
      bodyMissing: true,
      detail: 'Pose model ran but could not lock onto a full body.',
    };
  }

  return {
    frames,
    source: 'mediapipe',
    multiPersonFrames,
    avgVisibility: visibilityCount ? visibilitySum / visibilityCount : 0,
    bodyMissing: false,
    detail: `MediaPipe Pose tracked ${frames.length} frames at ${SAMPLE_FPS}fps.`,
  };
}

export function downsample(frames: PoseFrames, target: number): PoseFrames {
  if (frames.length <= target) return frames;
  const step = frames.length / target;
  const out: PoseFrames = [];
  for (let i = 0; i < target; i += 1) {
    out.push(frames[Math.min(frames.length - 1, Math.round(i * step))]);
  }
  return out;
}
